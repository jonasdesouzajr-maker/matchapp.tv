package com.jonas.papercup

import android.app.Activity
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.core.view.doOnLayout
import androidx.core.view.isVisible
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.VideoOptions
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.nativead.NativeAdView
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * One SDK-owned news card, aligned only with the owned page's empty fixed reservation.
 * Native UMP/account gates remain authoritative. Nothing here changes feed data, matching, or the banner.
 */
internal class NativeNewsBridge(
    private val activity: Activity,
    private val web: WebView,
    private val root: FrameLayout,
    private val canRequestAds: () -> Boolean
) {
    private data class Document(val id: String, val url: String, val generation: Int, var language: String,
        var sequence: Long = -1, var lastStatus: String = "", var lastReason: String = "")
    private data class Sample(val bounds: NativeNewsPolicy.Bounds, val viewport: NativeNewsPolicy.Viewport,
        val at: Long, val scrollX: Int, val scrollY: Int, val webX: Int, val webY: Int, val stable: Int)

    private val handler = Handler(Looper.getMainLooper())
    private val host = NativeNewsHost(activity).apply {
        attachScrollTarget(web) { invalidatePosition("scrolling") }
        visibility = View.INVISIBLE
        isClickable = false
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }
    private var document: Document? = null
    private var sample: Sample? = null
    private var accountContext: String? = null
    private var hasValue = false
    private var generation = 0
    private var loadGeneration = 0
    private var loadAttempted = false
    private var loading = false
    private var unavailableReason = ""
    private var ad: NativeAd? = null
    private var adView: NativeAdView? = null
    private var adLoadedAt = 0L
    private var renderedWidth = 0
    private var foreground = false
    private var installed = false
    private var destroyed = false
    private var loadTimeout: Runnable? = null
    private val scrollListener = ViewTreeObserver.OnScrollChangedListener {
        sample?.let { if (it.scrollX != web.scrollX || it.scrollY != web.scrollY) invalidatePosition("scrolling") }
    }
    private val preDrawListener = ViewTreeObserver.OnPreDrawListener { verifyVisiblePosition(); true }
    private val freshnessCheck = object : Runnable {
        override fun run() {
            if (destroyed || !foreground || document == null) return
            verifyVisiblePosition()
            handler.postDelayed(this, 250)
        }
    }

    fun install() {
        if (installed || destroyed || !BuildConfig.ADMOB_ENABLED || !BuildConfig.ADMOB_NATIVE_NEWS_ENABLED ||
            BuildConfig.ADMOB_NATIVE_NEWS_ID.isBlank() ||
            (!BuildConfig.DEBUG && !RewardedRequestPolicy.validProductionUnit(BuildConfig.ADMOB_NATIVE_NEWS_ID)) ||
            !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        try {
            WebViewCompat.addWebMessageListener(web, BRIDGE_NAME, setOf("https://matchapp.tv")) {
                    _, message, origin, mainFrame, _ ->
                if (destroyed || !mainFrame || message.type != WebMessageCompat.TYPE_STRING ||
                    !RewardedRequestPolicy.isFirstPartyOrigin(origin.toString()) ||
                    !NativeNewsPolicy.isReporterDocument(web.url.orEmpty())) return@addWebMessageListener
                val raw = message.data?.takeIf { it.length <= 2048 } ?: return@addWebMessageListener
                runCatching { handle(JSONObject(raw)) }
            }
            // Below existing offline/fullscreen/intro layers and outside the unchanged WebView/banner layout.
            val offlineIndex = root.indexOfChild(activity.findViewById(R.id.offline)).coerceAtLeast(1)
            root.addView(host, offlineIndex, FrameLayout.LayoutParams(1, 1))
            web.viewTreeObserver.addOnScrollChangedListener(scrollListener)
            root.viewTreeObserver.addOnPreDrawListener(preDrawListener)
            installed = true
        } catch (_: RuntimeException) { cleanupInstallation() }
        catch (_: LinkageError) { cleanupInstallation() }
    }

    private fun handle(message: JSONObject) {
        val id = message.optString("requestId")
        if (!NativeNewsPolicy.validRequestId(id)) return
        when (message.optString("type")) {
            "hello" -> {
                if (!onlyKeys(message, setOf("type", "requestId", "hasValue", "lang")) ||
                    message.opt("hasValue") !is Boolean || message.optString("lang") !in NativeNewsPolicy.languages) return
                hello(id, message.getBoolean("hasValue"), message.getString("lang"))
            }
            "slot" -> document?.takeIf { it.id == id && current(it) }?.let { acceptSample(it, message) }
            "hide", "dispose", "reset" -> {
                if (!onlyKeys(message, setOf("type", "requestId"))) return
                document?.takeIf { it.id == id && current(it) }?.let { value ->
                    when (message.getString("type")) {
                        "hide" -> invalidatePosition("page_obscured")
                        "reset" -> { hasValue = false; clearAd(); sample = null; emit(value, "unavailable", "account_changed") }
                        "dispose" -> { clearAd(); sample = null; emit(value, "disposed", "document_disposed"); document = null }
                    }
                }
            }
        }
    }

    private fun hello(id: String, valueReported: Boolean, language: String) {
        val url = web.url.orEmpty()
        val expectedGeneration = generation
        // A same-URL reload has a fresh document UUID. Old queued messages must not bind that new page.
        val check = "(window.top===window&&location.href===${JSONObject.quote(url)}&&" +
            "window.MatchAppNativeNewsDocumentId===${JSONObject.quote(id)})"
        web.evaluateJavascript(check) { result ->
            if (result != "true" || destroyed || generation != expectedGeneration || web.url.orEmpty() != url) return@evaluateJavascript
            val previous = document
            val value = if (previous != null && previous.id == id && current(previous)) previous else {
                clearAd()
                sample = null
                Document(id, url, generation, language).also { document = it }
            }
            if (value.language != language) { clearAd(); sample = null; value.language = language }
            if (valueReported && accountContext != null) hasValue = true
            emitAvailability(value)
            handler.removeCallbacks(freshnessCheck)
            if (foreground) handler.post(freshnessCheck)
        }
    }

    private fun acceptSample(value: Document, message: JSONObject) {
        if (!onlyKeys(message, setOf("type", "requestId", "seq", "rect", "viewport", "visible", "unobscured", "lang")) ||
            !NativeNewsPolicy.isNewsDocument(value.url) || message.opt("visible") !is Boolean ||
            message.opt("unobscured") !is Boolean || message.optString("lang") != value.language) return
        val sequenceNumber = message.opt("seq") as? Number ?: return
        val sequence = sequenceNumber.toLong()
        if (sequence < 0 || sequenceNumber.toDouble() != sequence.toDouble() || sequence <= value.sequence || sequence > 9_007_199_254_740_991L) return
        value.sequence = sequence
        val rect = message.optJSONObject("rect") ?: return
        val viewport = message.optJSONObject("viewport") ?: return
        if (!onlyKeys(rect, setOf("x", "y", "width", "height")) ||
            !onlyKeys(viewport, setOf("width", "height", "offsetX", "offsetY", "scale"))) return
        val bounds = NativeNewsPolicy.Bounds(number(rect, "x"), number(rect, "y"), number(rect, "width"), number(rect, "height"))
        val view = NativeNewsPolicy.Viewport(number(viewport, "width"), number(viewport, "height"),
            number(viewport, "offsetX"), number(viewport, "offsetY"), number(viewport, "scale"))
        if (!message.getBoolean("visible") || !message.getBoolean("unobscured") ||
            !NativeNewsPolicy.fullyVisible(bounds, view) || !eligible(value) ||
            !NativeNewsPolicy.matchesNativeViewport(view, web.width, web.height, density())) {
            invalidatePosition("not_fully_visible")
            if (!eligible(value)) emitAvailability(value)
            return
        }
        val location = IntArray(2).also { web.getLocationOnScreen(it) }
        val now = SystemClock.elapsedRealtime()
        val old = sample
        val stable = if (old != null && NativeNewsPolicy.fresh(old.at, now) &&
            now - old.at >= 16 && NativeNewsPolicy.stable(old.bounds, bounds) && old.viewport == view &&
            old.scrollX == web.scrollX && old.scrollY == web.scrollY && old.webX == location[0] && old.webY == location[1]) {
            (old.stable + 1).coerceAtMost(2)
        } else 1
        sample = Sample(bounds, view, now, web.scrollX, web.scrollY, location[0], location[1], stable)
        if (stable < 2 || !positionSafe(sample!!)) { hide("position_settling"); return }
        if (!loadAttempted) load(value)
        if (ad != null) show(value)
    }

    private fun eligible(value: Document): Boolean = installed && !destroyed && foreground &&
        !activity.isFinishing && !activity.isDestroyed && current(value) &&
        accountContext != null && hasValue && web.isShown && web.windowVisibility == View.VISIBLE &&
        NativeNewsPolicy.isNewsDocument(value.url) && runCatching { canRequestAds() }.getOrDefault(false)

    private fun current(value: Document): Boolean = document === value && value.generation == generation && value.url == web.url.orEmpty()

    private fun load(value: Document) {
        if (!eligible(value) || loadAttempted) return
        loadAttempted = true
        loading = true
        val expectedLoad = ++loadGeneration
        emit(value, "loading")
        loadTimeout = Runnable {
            if (current(value) && loading && expectedLoad == loadGeneration) fail(value, "load_timeout")
        }.also { handler.postDelayed(it, 20_000) }
        try {
            AdLoader.Builder(activity, BuildConfig.ADMOB_NATIVE_NEWS_ID)
                .forNativeAd { loaded ->
                    if (!current(value) || expectedLoad != loadGeneration || !eligible(value)) {
                        loaded.destroy()
                        return@forNativeAd
                    }
                    cancelLoadTimeout()
                    loading = false
                    ad = loaded
                    adLoadedAt = SystemClock.elapsedRealtime()
                    if (sample?.let { it.stable >= 2 && positionSafe(it) } == true) show(value)
                    else emit(value, "hidden", "awaiting_visible_slot")
                }
                .withAdListener(object : AdListener() {
                    override fun onAdFailedToLoad(error: LoadAdError) {
                        if (current(value) && expectedLoad == loadGeneration) fail(value,
                            if (error.code == AdRequest.ERROR_CODE_NO_FILL) "no_fill" else "load_failed")
                    }
                })
                .withNativeAdOptions(NativeAdOptions.Builder()
                    .setMediaAspectRatio(NativeAdOptions.NATIVE_MEDIA_ASPECT_RATIO_LANDSCAPE)
                    .setAdChoicesPlacement(if (value.language == "ar") NativeAdOptions.ADCHOICES_TOP_LEFT else NativeAdOptions.ADCHOICES_TOP_RIGHT)
                    .setVideoOptions(VideoOptions.Builder().setStartMuted(true).build())
                    .build())
                .build().loadAd(AdRequest.Builder().build())
        } catch (_: RuntimeException) { fail(value, "load_failed") }
        catch (_: LinkageError) { fail(value, "sdk_unavailable") }
    }

    private fun show(value: Document) {
        val placement = sample ?: return
        val creative = ad ?: return
        if (!eligible(value) || !positionSafe(placement)) { hide("not_fully_visible"); return }
        val width = (placement.bounds.width * density()).roundToInt()
        val height = (NativeNewsPolicy.HEIGHT_CSS * density()).roundToInt()
        if (adView != null && renderedWidth != width) { fail(value, "viewport_changed"); return }
        if (adView == null) {
            val inset = (8 * density()).roundToInt()
            val rendered = runCatching { NativeNewsAdView.create(activity, creative, value.language, width - inset * 2, height - inset * 2) }.getOrNull()
            if (rendered == null) { fail(value, "creative_does_not_fit"); return }
            adView = rendered
            renderedWidth = width
            host.addView(rendered, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT).apply {
                setMargins(inset, inset, inset, inset)
            })
        }
        val rootPosition = IntArray(2).also { root.getLocationOnScreen(it) }
        val left = placement.webX - rootPosition[0] + (placement.bounds.x * density()).roundToInt() - root.paddingLeft
        val top = placement.webY - rootPosition[1] + (placement.bounds.y * density()).roundToInt() - root.paddingTop
        val existing = host.layoutParams as FrameLayout.LayoutParams
        if (existing.width != width || existing.height != height || existing.leftMargin != left || existing.topMargin != top) {
            host.visibility = View.INVISIBLE
            host.layoutParams = FrameLayout.LayoutParams(width, height).apply { leftMargin = left; topMargin = top }
            host.doOnLayout { if (current(value) && ad === creative) show(value) }
            return
        }
        if (host.isLayoutRequested || host.width != width || host.height != height) return
        host.background = NativeNewsAdView.cardBackground(activity)
        adView?.visibility = View.VISIBLE
        host.visibility = View.VISIBLE
        emit(value, "ready")
    }

    private fun positionSafe(value: Sample): Boolean {
        if (!NativeNewsPolicy.fresh(value.at, SystemClock.elapsedRealtime()) || !activity.hasWindowFocus() ||
            value.scrollX != web.scrollX || value.scrollY != web.scrollY || !web.isShown ||
            !NativeNewsPolicy.matchesNativeViewport(value.viewport, web.width, web.height, density())) return false
        val position = IntArray(2).also { web.getLocationOnScreen(it) }
        if (position[0] != value.webX || position[1] != value.webY) return false
        val rect = Rect(position[0] + (value.bounds.x * density()).roundToInt(), position[1] + (value.bounds.y * density()).roundToInt(),
            position[0] + ((value.bounds.x + value.bounds.width) * density()).roundToInt(),
            position[1] + ((value.bounds.y + value.bounds.height) * density()).roundToInt())
        val visibleWeb = Rect()
        val visibleWindow = Rect().also { web.getWindowVisibleDisplayFrame(it) }
        if (!web.getGlobalVisibleRect(visibleWeb) || !visibleWeb.contains(rect) || !visibleWindow.contains(rect)) return false
        val hostIndex = root.indexOfChild(host)
        for (index in hostIndex + 1 until root.childCount) {
            val overlay = root.getChildAt(index)
            val overlayRect = Rect()
            if (overlay.isShown && overlay.alpha > 0 && overlay.getGlobalVisibleRect(overlayRect) && Rect.intersects(rect, overlayRect)) return false
        }
        return true
    }

    private fun verifyVisiblePosition() {
        val value = document ?: return
        if (!current(value) || !eligible(value)) {
            if (ad != null || loading) clearAd()
            hide("consent_or_entitlement")
            return
        }
        if (ad != null && SystemClock.elapsedRealtime() - adLoadedAt > 600_000) { fail(value, "creative_expired"); return }
        if (ad == null && !loading && !loadAttempted) emitAvailability(value)
        if (host.isVisible && (sample?.let { it.stable >= 2 && positionSafe(it) } != true)) invalidatePosition("position_changed")
    }

    private fun emitAvailability(value: Document) {
        when {
            unavailableReason.isNotEmpty() -> emit(value, "unavailable", unavailableReason)
            !eligible(value) -> emit(value, "unavailable", if (!hasValue) "first_value_required" else "consent_or_entitlement")
            loading -> emit(value, "loading")
            host.isVisible && adView?.isVisible == true -> emit(value, "ready")
            ad != null -> emit(value, "hidden", "awaiting_visible_slot")
            loadAttempted -> emit(value, "unavailable", "document_request_completed")
            else -> emit(value, "available")
        }
    }

    private fun emit(value: Document, status: String, reason: String = "") {
        if (destroyed || !current(value) || (value.lastStatus == status && value.lastReason == reason)) return
        value.lastStatus = status
        value.lastReason = reason
        val payload = JSONObject().put("requestId", value.id).put("status", status).put("reason", reason)
            .put("enabled", installed).put("eligible", eligible(value) && unavailableReason.isEmpty())
            .put("heightCss", NativeNewsPolicy.HEIGHT_CSS).put("minWidthCss", NativeNewsPolicy.MIN_WIDTH_CSS)
            .put("maxWidthCss", NativeNewsPolicy.MAX_WIDTH_CSS)
        val script = "(function(){if(window.top===window&&location.href===${JSONObject.quote(value.url)}&&" +
            "window.MatchAppNativeNewsDocumentId===${JSONObject.quote(value.id)})" +
            "window.dispatchEvent(new CustomEvent('matchapp:nativenews',{detail:$payload}));})();"
        web.evaluateJavascript(script, null)
    }

    private fun invalidatePosition(reason: String) { sample = null; hide(reason) }
    private fun hide(reason: String) {
        adView?.visibility = View.INVISIBLE
        host.background = null
        if (!host.forwardingDrag) host.visibility = View.INVISIBLE
        document?.takeIf { current(it) && ad != null }?.let { emit(it, "hidden", reason) }
    }
    private fun fail(value: Document, reason: String) {
        unavailableReason = reason
        clearAd()
        sample = null
        emit(value, "unavailable", reason)
    }
    private fun cancelLoadTimeout() { loadTimeout?.let(handler::removeCallbacks); loadTimeout = null }
    private fun clearAd() {
        ++loadGeneration
        cancelLoadTimeout()
        loading = false
        adView?.destroy()
        adView = null
        ad?.destroy()
        ad = null
        host.removeAllViews()
        host.background = null
        if (!host.forwardingDrag) host.visibility = View.INVISIBLE
        renderedWidth = 0
    }

    /** The existing authenticated entitlement read supplies this in-memory context, with no new request. */
    fun onAccountContext(value: String) {
        val resolved = value.takeIf { NativeNewsPolicy.validAccount(it) }
        if (resolved == accountContext) return
        accountContext = resolved
        hasValue = false
        clearAd()
        sample = null
        document?.takeIf(::current)?.let { valueDocument ->
            emitAvailability(valueDocument)
            if (resolved != null) {
                // Re-read only the adapter's current-account observed value after auth hydration.
                val script = "(function(){if(window.top===window&&location.href===${JSONObject.quote(valueDocument.url)}&&" +
                    "window.MatchAppNativeNewsDocumentId===${JSONObject.quote(valueDocument.id)}&&" +
                    "window.MatchAppNativeNewsSlot&&typeof window.MatchAppNativeNewsSlot.refresh==='function')" +
                    "window.MatchAppNativeNewsSlot.refresh();})();"
                web.evaluateJavascript(script, null)
            }
        }
    }
    fun onEntitlementChanged() {
        if (!runCatching { canRequestAds() }.getOrDefault(false)) { clearAd(); sample = null }
        document?.takeIf(::current)?.let(::emitAvailability)
    }
    fun onActivityTouch(event: MotionEvent) {
        if (!installed || event.actionMasked != MotionEvent.ACTION_DOWN || host.visibility != View.VISIBLE) return
        val card = Rect()
        if (!host.getGlobalVisibleRect(card) || !card.contains(event.rawX.roundToInt(), event.rawY.roundToInt())) invalidatePosition("web_interaction")
    }
    fun onNavigation() {
        ++generation
        clearAd()
        document = null
        sample = null
        loadAttempted = false
        unavailableReason = ""
        handler.removeCallbacks(freshnessCheck)
    }
    fun onPause() { foreground = false; clearAd(); sample = null; handler.removeCallbacks(freshnessCheck) }
    fun onResume() {
        foreground = true
        document?.takeIf(::current)?.let(::emitAvailability)
        handler.removeCallbacks(freshnessCheck)
        if (document != null) handler.post(freshnessCheck)
    }
    fun destroy() {
        if (destroyed) return
        destroyed = true
        onNavigation()
        accountContext = null
        hasValue = false
        cleanupInstallation()
    }
    private fun cleanupInstallation() {
        if (web.viewTreeObserver.isAlive) web.viewTreeObserver.removeOnScrollChangedListener(scrollListener)
        if (root.viewTreeObserver.isAlive) root.viewTreeObserver.removeOnPreDrawListener(preDrawListener)
        (host.parent as? ViewGroup)?.removeView(host)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) runCatching { WebViewCompat.removeWebMessageListener(web, BRIDGE_NAME) }
        installed = false
    }
    private fun density(): Float = activity.resources.displayMetrics.density
    private fun onlyKeys(value: JSONObject, keys: Set<String>): Boolean = value.length() == keys.size && value.keys().asSequence().all { it in keys }
    private fun number(value: JSONObject, key: String): Double = (value.opt(key) as? Number)?.toDouble() ?: Double.NaN

    companion object { private const val BRIDGE_NAME = "MatchAppNativeNews" }
}
