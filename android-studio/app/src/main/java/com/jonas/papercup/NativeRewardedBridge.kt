package com.jonas.papercup

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.webkit.WebView
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions
import org.json.JSONObject
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.Future
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/**
 * Voluntary rewarded ads only. Native callbacks report SDK state; the server's
 * verified AdMob SSV callback alone grants tokens. No wallet/auth state is written here.
 */
internal class NativeRewardedBridge(
    private val activity: Activity,
    private val web: WebView,
    private val canRequestAds: () -> Boolean,
    private val verifyClaim: (String, String) -> VerifiedRewardClaim?
) {
    private data class Pending(
        val requestId: String,
        val nonce: String,
        val document: String,
        val generation: Int,
        var phase: String = "loading",
        var claim: VerifiedRewardClaim? = null,
        var ad: RewardedAd? = null,
        var earned: Boolean = false
    )

    private val handler = Handler(Looper.getMainLooper())
    private val worker = ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, ArrayBlockingQueue(1))
    private var work: Future<*>? = null
    private var deadline: Runnable? = null
    private var pending: Pending? = null
    private var generation = 0
    private var lastInteractionAt = 0L
    private var foreground = false
    private var installed = false
    private var destroyed = false

    fun install() {
        if (installed || destroyed || !BuildConfig.ADMOB_ENABLED ||
            BuildConfig.ADMOB_REWARDED_ID.isBlank() ||
            (!BuildConfig.DEBUG && !RewardedRequestPolicy.validProductionUnit(BuildConfig.ADMOB_REWARDED_ID)) ||
            !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
        ) return
        try {
            WebViewCompat.addWebMessageListener(web, BRIDGE_NAME, setOf("https://matchapp.tv")) {
                    _, message, sourceOrigin, isMainFrame, _ ->
                if (destroyed || !isMainFrame ||
                    !RewardedRequestPolicy.isFirstPartyOrigin(sourceOrigin.toString()) ||
                    !RewardedRequestPolicy.isAdultDocument(web.url.orEmpty()) ||
                    message.type != WebMessageCompat.TYPE_STRING) return@addWebMessageListener
                val raw = message.data?.takeIf { it.length <= 12_288 } ?: return@addWebMessageListener
                runCatching { handleMessage(JSONObject(raw)) }
            }
            installed = true
        } catch (_: RuntimeException) {
            // Unsupported WebViews simply retain the existing non-ad routes.
        } catch (_: LinkageError) { }
    }

    private fun handleMessage(message: JSONObject) {
        pending?.takeIf { !isCurrent(it) }?.let { finish(it, "cancelled", "context_changed") }
        val id = message.optString("requestId")
        if (!RewardedRequestPolicy.validRequestId(id)) return
        val type = message.optString("type")
        val allowed = if (type == "prepare") setOf("type", "requestId", "claimNonce", "accessToken")
            else setOf("type", "requestId")
        if (message.keys().asSequence().any { it !in allowed }) {
            emit(id, "failed", "invalid_request")
            return
        }
        when (type) {
            "status" -> {
                val active = pending
                if (active != null && active.requestId == id && isCurrent(active)) emit(id, active.phase)
                else emit(id, if (eligible()) "available" else "unavailable", if (eligible()) "" else "consent_or_entitlement")
            }
            "prepare" -> prepare(id, message.optString("claimNonce"), message.optString("accessToken"))
            "show" -> show(id)
            "cancel" -> pending?.takeIf { it.requestId == id && it.phase != "showing" }?.let {
                finish(it, "cancelled", "user_cancelled")
            }
            else -> emit(id, "failed", "invalid_request")
        }
    }

    private fun eligible(): Boolean = !destroyed && !activity.isFinishing && !activity.isDestroyed &&
        foreground && web.isShown && web.windowVisibility == View.VISIBLE &&
        RewardedRequestPolicy.isAdultDocument(web.url.orEmpty()) &&
        runCatching { canRequestAds() }.getOrDefault(false)

    private fun isCurrent(value: Pending): Boolean = !destroyed && pending === value &&
        value.generation == generation && value.document == web.url.orEmpty()

    private fun prepare(id: String, nonce: String, accessToken: String) {
        if (!RewardedRequestPolicy.validNonce(nonce) || !RewardedRequestPolicy.validAccessToken(accessToken)) {
            emit(id, "failed", "invalid_request")
            return
        }
        if (pending != null) {
            emit(id, "unavailable", "busy")
            return
        }
        if (!eligible()) {
            emit(id, "unavailable", "consent_or_entitlement")
            return
        }
        val next = Pending(id, nonce, web.url.orEmpty(), generation)
        pending = next
        emit(id, "loading")
        setDeadline(next, 20_000L, "load_timeout")
        try {
            work = worker.submit {
                // The JWT is used only in this bounded HTTPS validation request.
                val claim = runCatching { verifyClaim(nonce, accessToken) }.getOrNull()
                handler.post {
                    if (!isCurrent(next)) {
                        finish(next, "cancelled", "context_changed")
                        return@post
                    }
                    work = null
                    if (claim == null || !validClaim(claim, nonce) || !eligible()) {
                        finish(next, "unavailable", "claim_unavailable")
                        return@post
                    }
                    next.claim = claim
                    load(next, claim)
                }
            }
        } catch (_: RuntimeException) {
            finish(next, "unavailable", "claim_unavailable")
        }
    }

    private fun validClaim(claim: VerifiedRewardClaim, nonce: String): Boolean =
        claim.nonce == nonce && RewardedRequestPolicy.validUserId(claim.userId) &&
            claim.rewardAmount == 3 && RewardedRequestPolicy.validProductionUnit(claim.adUnitId) &&
            (BuildConfig.DEBUG || claim.adUnitId == BuildConfig.ADMOB_REWARDED_ID) &&
            RewardedRequestPolicy.claimHasTimeToComplete(claim.expiresAtMillis, System.currentTimeMillis())

    private fun load(value: Pending, claim: VerifiedRewardClaim) {
        try {
            RewardedAd.load(activity, BuildConfig.ADMOB_REWARDED_ID, AdRequest.Builder().build(),
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        if (!isCurrent(value)) {
                            finish(value, "cancelled", "context_changed")
                            return
                        }
                        if (!eligible() || !validClaim(claim, value.nonce)) {
                            finish(value, "unavailable", "claim_unavailable")
                            return
                        }
                        try {
                            ad.setServerSideVerificationOptions(ServerSideVerificationOptions.Builder()
                                .setUserId(claim.userId).setCustomData(claim.nonce).build())
                            value.ad = ad
                            value.phase = "ready"
                            setDeadline(value, claim.expiresAtMillis - System.currentTimeMillis() - 90_000L, "claim_expired")
                            emit(value.requestId, "ready")
                        } catch (_: RuntimeException) {
                            finish(value, "unavailable", "ad_unavailable")
                        }
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        finish(value, "unavailable", "no_fill_or_load_failed")
                    }
                })
        } catch (_: RuntimeException) {
            finish(value, "unavailable", "ad_unavailable")
        } catch (_: LinkageError) {
            finish(value, "unavailable", "ad_unavailable")
        }
    }

    private fun show(id: String) {
        val value = pending?.takeIf { it.requestId == id && isCurrent(it) }
        val claim = value?.claim
        if (value == null || claim == null || value.phase != "ready" || value.ad == null) {
            emit(id, "unavailable", "not_ready")
            return
        }
        if (!eligible() || !validClaim(claim, value.nonce) || !web.hasWindowFocus()) {
            finish(value, "unavailable", "context_changed")
            return
        }
        // The owned web button must also require a trusted explicit activation.
        // Browser activation supports accessibility alongside native interaction;
        // a page-controlled Boolean is never proof of a server-earned reward.
        val interactionAge = SystemClock.elapsedRealtime() - lastInteractionAt
        val physicalGesture = lastInteractionAt > 0 && interactionAge in 0L..2_000L
        lastInteractionAt = 0L
        value.phase = "checking_gesture"
        runCatching {
            web.evaluateJavascript("navigator.userActivation != null && navigator.userActivation.isActive === true") { active ->
                if (!isCurrent(value)) {
                    finish(value, "cancelled", "context_changed")
                    return@evaluateJavascript
                }
                if (value.phase != "checking_gesture") return@evaluateJavascript
                if (!eligible() || !web.hasWindowFocus() || !validClaim(claim, value.nonce)) {
                    finish(value, "unavailable", "context_changed")
                } else if (physicalGesture || active == "true") {
                    present(value)
                } else {
                    value.phase = "ready"
                    emit(id, "ready", "user_gesture_required")
                }
            }
        }.onFailure { finish(value, "unavailable", "context_changed") }
    }

    private fun present(value: Pending) {
        val ad = value.ad ?: return
        value.ad = null // A loaded rewarded ad can be shown only once.
        value.phase = "showing"
        clearDeadline()
        try {
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdShowedFullScreenContent() {
                    if (isCurrent(value)) emit(value.requestId, "showing")
                }

                override fun onAdDismissedFullScreenContent() {
                    ad.fullScreenContentCallback = null
                    finish(value, "dismissed", "", value.earned)
                }

                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    ad.fullScreenContentCallback = null
                    finish(value, "unavailable", "show_failed")
                }
            }
            ad.show(activity) {
                if (isCurrent(value) && !value.earned) {
                    value.earned = true
                    // Only SSV can grant the three tokens. This event starts status reconciliation.
                    emit(value.requestId, "earned", "server_verification_pending", true)
                }
            }
        } catch (_: RuntimeException) {
            finish(value, "unavailable", "show_failed")
        } catch (_: LinkageError) {
            finish(value, "unavailable", "show_failed")
        }
    }

    private fun setDeadline(value: Pending, delayMillis: Long, reason: String) {
        clearDeadline()
        deadline = Runnable { finish(value, "unavailable", reason) }
            .also { handler.postDelayed(it, delayMillis.coerceAtLeast(1L)) }
    }

    private fun clearDeadline() {
        deadline?.let(handler::removeCallbacks)
        deadline = null
    }

    private fun finish(value: Pending, status: String, reason: String = "", earned: Boolean = false) {
        if (pending !== value) return
        val notify = isCurrent(value)
        clearDeadline()
        work?.cancel(true)
        work = null
        worker.purge()
        runCatching { value.ad?.fullScreenContentCallback = null }
        value.ad = null
        pending = null
        if (notify) emit(value.requestId, status, reason, earned)
    }

    private fun emit(id: String, status: String, reason: String = "", earned: Boolean = false) {
        if (destroyed || activity.isFinishing || activity.isDestroyed ||
            !RewardedRequestPolicy.isAdultDocument(web.url.orEmpty())) return
        val detail = JSONObject().put("requestId", id).put("status", status)
            .put("reason", reason).put("rewardEarned", earned).put("serverVerified", false)
        val expectedDocument = JSONObject.quote(web.url.orEmpty())
        runCatching {
            web.evaluateJavascript("if(location.href===$expectedDocument){window.dispatchEvent(new CustomEvent('matchapp:rewarded',{detail:$detail}));}", null)
        }
    }

    fun recordUserInteraction() { lastInteractionAt = SystemClock.elapsedRealtime() }

    fun onPause() {
        foreground = false
        lastInteractionAt = 0L
        pending?.takeIf { it.phase != "showing" }?.let { finish(it, "cancelled", "backgrounded") }
    }

    fun onResume() { foreground = true }

    fun onNavigation() {
        generation++
        lastInteractionAt = 0L
        pending?.let { finish(it, "cancelled", "navigation") }
    }

    fun onAdFreeEntitlement() {
        pending?.takeIf { it.phase != "showing" }?.let { finish(it, "cancelled", "entitlement_changed") }
    }

    fun destroy() {
        if (destroyed) return
        destroyed = true
        pending?.let { finish(it, "cancelled", "destroyed") }
        clearDeadline()
        worker.shutdownNow()
        if (installed && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            runCatching { WebViewCompat.removeWebMessageListener(web, BRIDGE_NAME) }
        }
        installed = false
    }

    companion object { private const val BRIDGE_NAME = "MatchAppNativeRewards" }
}
