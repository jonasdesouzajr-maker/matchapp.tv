package com.jonas.papercup

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.webkit.WebView
import androidx.core.net.toUri
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.Future
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Google Play checkout and restore only. The authenticated server owns every entitlement. */
internal class NativePlayBillingBridge(private val activity: Activity, private val web: WebView) {
    private data class Offer(val product: ProductDetails, val details: ProductDetails.SubscriptionOfferDetails)
    private data class Context(
        val requestId: String, var accessToken: String, val document: String,
        val generation: Int, val restoreOnly: Boolean, val retentionRequested: Boolean = false,
        var retentionSubmitted: Boolean = false,
        var phase: String = "loading", var session: VerifiedBillingSession? = null,
        val offers: MutableMap<String, Offer> = linkedMapOf(), var catalogAt: Long = 0L
    )

    private val handler = Handler(Looper.getMainLooper())
    private val worker = ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, ArrayBlockingQueue(1))
    private var work: Future<*>? = null
    private var deadline: Runnable? = null
    private var billing: BillingClient? = null
    private var context: Context? = null
    private var owned: List<Purchase> = emptyList()
    private var connecting = false
    private var querying = false
    private var queryGeneration = 0
    private var queryDeadline: Runnable? = null
    private var purchaseFlow = false
    private var foreground = false
    private var destroyed = false
    private var installed = false
    private var generation = 0
    private var lastInteractionAt = 0L

    private fun configured(): Boolean = PlayBillingPolicy.validProduct(BuildConfig.PLAY_PRO_PRODUCT_ID)
    private fun live(): Boolean = !destroyed && !activity.isFinishing && !activity.isDestroyed
    private fun visible(): Boolean = live() && foreground && web.isShown &&
        PlayBillingPolicy.isBillingDocument(web.url.orEmpty())
    private fun current(value: Context): Boolean = live() && context === value &&
        value.generation == generation && value.document == web.url.orEmpty()

    fun install() {
        if (installed || destroyed || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        try {
            billing = BillingClient.newBuilder(activity.applicationContext)
                .setListener { result, purchases -> handler.post { onPurchasesUpdated(result, purchases) } }
                .enablePendingPurchases(PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts().enablePrepaidPlans().build())
                .enableAutoServiceReconnection().build()
            WebViewCompat.addWebMessageListener(web, BRIDGE_NAME, setOf("https://matchapp.tv")) {
                    _, message, sourceOrigin, isMainFrame, _ ->
                if (!live() || !isMainFrame ||
                    !RewardedRequestPolicy.isFirstPartyOrigin(sourceOrigin.toString()) ||
                    !PlayBillingPolicy.isBillingDocument(web.url.orEmpty()) ||
                    message.type != WebMessageCompat.TYPE_STRING) return@addWebMessageListener
                val raw = message.data?.takeIf { it.length <= 12_288 } ?: return@addWebMessageListener
                runCatching { handle(JSONObject(raw)) }
            }
            installed = true
        } catch (_: RuntimeException) {
            runCatching { billing?.endConnection() }
            billing = null
        } catch (_: LinkageError) {
            billing = null
        }
    }

    private fun handle(message: JSONObject) {
        context?.takeIf { !current(it) }?.let { clear(it) }
        val id = message.optString("requestId")
        if (!RewardedRequestPolicy.validRequestId(id)) return
        val type = message.optString("type")
        val allowed = when (type) {
            "prepare", "restore", "prepare_retention" -> setOf("type", "requestId", "accessToken")
            "launch" -> setOf("type", "requestId", "offerKey")
            else -> setOf("type", "requestId")
        }
        if (message.keys().asSequence().any { it !in allowed }) {
            emit(id, "unavailable", "invalid_request")
            return
        }
        when (type) {
            "prepare", "restore" -> prepare(id, message.optString("accessToken"), type == "restore")
            "prepare_retention" -> prepare(id, message.optString("accessToken"), false, retentionRequested = true)
            "launch" -> launch(id, message.optString("offerKey"))
            "manage" -> manage(id)
            "clear" -> context?.let { finish(it, "cancelled", "account_or_context_changed") }
            "status" -> emit(id, context?.takeIf { it.requestId == id }?.phase ?: "available",
                if (configured()) "" else "product_not_configured", extra = JSONObject().put("purchaseAvailable", configured()))
            else -> emit(id, "unavailable", "invalid_request")
        }
    }

    private fun prepare(id: String, jwt: String, restoreOnly: Boolean, retentionRequested: Boolean = false) {
        if (!configured() || !visible() || !RewardedRequestPolicy.validAccessToken(jwt)) {
            emit(id, "unavailable", "configuration_or_sign_in_required")
            return
        }
        if (purchaseFlow || work != null || context?.phase in setOf("loading", "checking_purchases", "verifying", "launching")) {
            emit(id, "unavailable", "busy")
            return
        }
        context?.let { clear(it) }
        val value = Context(id, jwt, web.url.orEmpty(), generation, restoreOnly, retentionRequested)
        context = value
        emit(id, "loading")
        setDeadline(value, 25_000L, "preparation_timeout")
        connect()
        try {
            work = worker.submit {
                val session = runCatching { PlayBillingBackendClient.session(jwt) }.getOrNull()
                handler.post {
                    if (!current(value)) return@post
                    work = null
                    if (session == null || !visible()) {
                        finish(value, "unavailable", "session_unavailable")
                        return@post
                    }
                    value.session = session
                    value.phase = "checking_purchases"
                    queryOwned()
                }
            }
        } catch (_: RuntimeException) { finish(value, "unavailable", "session_unavailable") }
    }

    private fun connect() {
        val client = billing ?: return
        if (!live() || connecting) return
        if (client.isReady) { queryOwned(); return }
        connecting = true
        try {
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    handler.post {
                        if (!live()) return@post
                        connecting = false
                        if (result.responseCode == BillingClient.BillingResponseCode.OK) queryOwned()
                        else context?.let { finish(it, "unavailable", "play_unavailable") }
                    }
                }
                override fun onBillingServiceDisconnected() {
                    // Billing 9.1 reconnects on the next API request.
                    handler.post { connecting = false }
                }
            })
        } catch (_: RuntimeException) {
            connecting = false
            context?.let { finish(it, "unavailable", "play_unavailable") }
        }
    }

    private fun queryOwned() {
        val client = billing ?: return
        if (!live() || querying) return
        if (!client.isReady) { if (!connecting) connect(); return }
        querying = true
        val queryEpoch = ++queryGeneration
        queryDeadline?.let(handler::removeCallbacks)
        queryDeadline = Runnable {
            if (querying && queryEpoch == queryGeneration) {
                queryGeneration++
                querying = false
                context?.takeIf { it.phase == "checking_purchases" }?.let {
                    finish(it, "unavailable", "restore_timeout")
                }
            }
        }.also { handler.postDelayed(it, 15_000L) }
        try {
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS).build()) { result, purchases ->
                handler.post {
                    if (!live() || queryEpoch != queryGeneration) return@post
                    querying = false
                    queryDeadline?.let(handler::removeCallbacks)
                    queryDeadline = null
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        context?.takeIf { it.phase == "checking_purchases" }?.let {
                            finish(it, "unavailable", "restore_unavailable")
                        }
                        return@post
                    }
                    owned = purchases.filter { BuildConfig.PLAY_PRO_PRODUCT_ID in it.products }.take(5)
                    val value = context
                    if (value != null && current(value) && value.phase == "checking_purchases" && value.session != null) {
                        processOwned(value)
                    } else if (value == null && owned.isNotEmpty()) {
                        emit("native-resume", "restore_required")
                    }
                }
            }
        } catch (_: RuntimeException) {
            querying = false
            queryGeneration++
            queryDeadline?.let(handler::removeCallbacks)
            queryDeadline = null
            context?.let { finish(it, "unavailable", "restore_unavailable") }
        }
    }

    private fun processOwned(value: Context) {
        if (!current(value)) return
        val session = value.session ?: return
        val purchased = owned.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            .maxByOrNull { it.purchaseTime }
        if (value.retentionRequested && !value.retentionSubmitted) {
            if (purchased != null) prepareRetention(value, purchased)
            else if (owned.any { it.purchaseState == Purchase.PurchaseState.PENDING }) finish(value, "pending", "payment_pending")
            else finish(value, "unavailable", "current_play_subscription_required")
            return
        }
        if (value.retentionSubmitted && purchased != null &&
            PlayBillingPolicy.tokenHash(purchased.purchaseToken) == session.retention?.purchaseTokenHash) {
            // The old paid entitlement does not prove that the optional offer was accepted.
            finish(value, "verification_pending", "retention_not_confirmed")
            return
        }
        if (value.retentionSubmitted && purchased == null) {
            if (owned.any { it.purchaseState == Purchase.PurchaseState.PENDING }) finish(value, "pending", "payment_pending")
            else finish(value, "verification_pending", "retention_not_confirmed")
            return
        }
        when {
            purchased != null -> verify(value, purchased)
            owned.any { it.purchaseState == Purchase.PurchaseState.PENDING } -> finish(value, "pending", "payment_pending")
            session.hasActiveEntitlement -> finish(value, "already_entitled", verified = true)
            value.restoreOnly -> finish(value, "restored_none", "no_active_play_purchase")
            !session.purchasesEnabled -> finish(value, "unavailable", "purchases_paused")
            else -> catalog(value)
        }
    }

    private fun prepareRetention(value: Context, purchase: Purchase) {
        val previous = value.session ?: return
        if (!current(value) || work != null || purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val account = purchase.accountIdentifiers?.obfuscatedAccountId
        if ((!account.isNullOrEmpty() && account != previous.obfuscatedAccountId) ||
            !PlayBillingPolicy.validPurchaseToken(purchase.purchaseToken)) {
            finish(value, "unavailable", "purchase_account_mismatch")
            return
        }
        value.phase = "checking_retention"
        setDeadline(value, 25_000L, "retention_unavailable")
        val jwt = value.accessToken
        try {
            work = worker.submit {
                val session = runCatching {
                    PlayBillingBackendClient.retentionSession(jwt, previous, purchase.purchaseToken)
                }.getOrNull()
                handler.post {
                    if (!current(value)) return@post
                    work = null
                    if (session == null || !visible()) {
                        finish(value, "unavailable", "retention_unavailable")
                        return@post
                    }
                    value.session = session
                    catalog(value)
                }
            }
        } catch (_: RuntimeException) { finish(value, "unavailable", "retention_unavailable") }
    }

    private fun catalog(value: Context) {
        val client = billing ?: return
        val session = value.session ?: return
        if (!current(value) || !visible()) { clear(value); return }
        value.phase = "loading"
        val query = QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder().setProductId(session.productId)
                .setProductType(BillingClient.ProductType.SUBS).build())).build()
        try {
            client.queryProductDetailsAsync(query) { result, details ->
                handler.post {
                    if (!current(value)) return@post
                    val product = details.productDetailsList.firstOrNull { it.productId == session.productId }
                    if (result.responseCode != BillingClient.BillingResponseCode.OK || product == null || !visible()) {
                        finish(value, "unavailable", "product_unavailable")
                        return@post
                    }
                    val offers = product.subscriptionOfferDetails.orEmpty().filter {
                        it.basePlanId in session.basePlanIds &&
                            (it.offerId == null || it.offerId in session.offerIds) &&
                            (session.retention == null || it.offerId in session.offerIds) &&
                            it.installmentPlanDetails == null && it.pricingPhases.pricingPhaseList.size in 1..5
                    }.take(40)
                    if (offers.isEmpty()) { finish(value, "unavailable", "offer_unavailable"); return@post }
                    val rows = JSONArray()
                    value.offers.clear()
                    for (offer in offers) {
                        val key = UUID.randomUUID().toString()
                        value.offers[key] = Offer(product, offer)
                        val phases = JSONArray()
                        for (phase in offer.pricingPhases.pricingPhaseList) {
                            phases.put(JSONObject().put("formattedPrice", phase.formattedPrice)
                                .put("priceAmountMicros", phase.priceAmountMicros)
                                .put("currencyCode", phase.priceCurrencyCode).put("billingPeriod", phase.billingPeriod)
                                .put("billingCycleCount", phase.billingCycleCount).put("recurrenceMode", phase.recurrenceMode))
                        }
                        rows.put(JSONObject().put("offerKey", key).put("basePlanId", offer.basePlanId)
                            .put("offerId", offer.offerId ?: JSONObject.NULL).put("pricingPhases", phases))
                    }
                    value.catalogAt = SystemClock.elapsedRealtime()
                    value.phase = "ready"
                    setDeadline(value, 60_000L, "catalog_expired")
                    val detail = JSONObject().put("productId", session.productId).put("offers", rows)
                    session.retention?.let { detail.put("purpose", "retention").put("chargeAt", it.expiresAtMillis) }
                    emit(value.requestId, "ready", extra = detail)
                }
            }
        } catch (_: RuntimeException) { finish(value, "unavailable", "product_unavailable") }
    }

    private fun launch(id: String, offerKey: String) {
        val value = context?.takeIf { it.requestId == id && current(it) }
        if (value == null) { emit(id, "unavailable", "offer_refresh_required"); return }
        val session = value.session ?: return
        val offer = value.offers[offerKey]
        val retention = session.retention
        if (retention != null && (retention.expiresAtMillis <= System.currentTimeMillis() ||
                owned.none { it.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    PlayBillingPolicy.tokenHash(it.purchaseToken) == retention.purchaseTokenHash })) {
            finish(value, "unavailable", "offer_refresh_required")
            return
        }
        if (!session.purchasesEnabled || value.phase != "ready" || offer == null || purchaseFlow || !visible() ||
            !web.hasWindowFocus() || !PlayBillingPolicy.validSessionExpiry(session.expiresAtMillis, System.currentTimeMillis()) ||
            SystemClock.elapsedRealtime() - value.catalogAt !in 0L..60_000L) {
            finish(value, "unavailable", "offer_refresh_required")
            return
        }
        value.phase = "checking_gesture"
        withUserActivation {
            if (!current(value)) return@withUserActivation
            if (!it || !visible() || !web.hasWindowFocus()) {
                value.phase = "ready"
                emit(id, "ready", "user_gesture_required")
                return@withUserActivation
            }
            if (retention != null && (retention.expiresAtMillis <= System.currentTimeMillis() ||
                    !PlayBillingPolicy.validSessionExpiry(session.expiresAtMillis, System.currentTimeMillis()) ||
                    SystemClock.elapsedRealtime() - value.catalogAt !in 0L..60_000L ||
                    owned.none { ownedPurchase -> ownedPurchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                        PlayBillingPolicy.tokenHash(ownedPurchase.purchaseToken) == retention.purchaseTokenHash })) {
                finish(value, "unavailable", "offer_refresh_required")
                return@withUserActivation
            }
            try {
                // Same-SKU/monthly offers use the verified Console default: charge at
                // the next billing date (WITHOUT_PRORATION). Google owns confirmation.
                val params = BillingFlowParams.newBuilder().setObfuscatedAccountId(session.obfuscatedAccountId)
                    .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(offer.product).setOfferToken(offer.details.offerToken).build())).build()
                purchaseFlow = true
                value.retentionSubmitted = value.retentionRequested
                value.phase = "launching"
                clearDeadline()
                val result = billing?.launchBillingFlow(activity, params)
                if (result?.responseCode == BillingClient.BillingResponseCode.OK) emit(id, "launching")
                else {
                    purchaseFlow = false
                    if (result?.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                        value.phase = "checking_purchases"
                        setDeadline(value, 25_000L, "restore_timeout")
                        queryOwned()
                    } else finish(value, "unavailable", "purchase_not_started")
                }
            } catch (_: RuntimeException) {
                purchaseFlow = false
                finish(value, "unavailable", "purchase_not_started")
            }
        }
    }

    private fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        if (!live()) return
        purchaseFlow = false
        val value = context?.takeIf { current(it) && it.session != null }
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK, BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                owned = purchases.orEmpty().filter { BuildConfig.PLAY_PRO_PRODUCT_ID in it.products }.take(5)
                if (value != null) {
                    value.phase = "checking_purchases"
                    setDeadline(value, 25_000L, "restore_timeout")
                    queryOwned()
                } else emit("native-resume", "restore_required")
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> value?.let { finish(it, "cancelled", "user_cancelled") }
            else -> value?.let { finish(it, "unavailable", "purchase_unavailable") }
        }
    }

    private fun verify(value: Context, purchase: Purchase) {
        val session = value.session ?: return
        if (!current(value) || work != null || purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val account = purchase.accountIdentifiers?.obfuscatedAccountId
        if ((!account.isNullOrEmpty() && account != session.obfuscatedAccountId) ||
            !PlayBillingPolicy.validPurchaseToken(purchase.purchaseToken)) {
            finish(value, "unavailable", "purchase_account_mismatch")
            return
        }
        value.phase = "verifying"
        value.offers.clear()
        emit(value.requestId, "verifying")
        setDeadline(value, 20_000L, "verification_pending")
        val jwt = value.accessToken
        try {
            work = worker.submit {
                val verified = runCatching { PlayBillingBackendClient.verify(jwt, session, purchase.purchaseToken) }.getOrDefault(false)
                handler.post {
                    if (!current(value)) return@post
                    work = null
                    if (verified) finish(value, "verified", verified = true)
                    else finish(value, "verification_pending", "retry_restore")
                }
            }
        } catch (_: RuntimeException) { finish(value, "verification_pending", "retry_restore") }
    }

    private fun manage(id: String) {
        if (!visible() || purchaseFlow || !web.hasWindowFocus()) { emit(id, "unavailable", "context_changed"); return }
        withUserActivation { activated ->
            if (!activated || !visible() || !web.hasWindowFocus()) { emit(id, "unavailable", "user_gesture_required"); return@withUserActivation }
            val url = "https://play.google.com/store/account/subscriptions".toUri().buildUpon()
                .appendQueryParameter("package", "com.jonas.papercup")
                .apply { if (configured()) appendQueryParameter("sku", BuildConfig.PLAY_PRO_PRODUCT_ID) }.build()
            try {
                activity.startActivity(Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE))
                emit(id, "management_opened")
            } catch (_: ActivityNotFoundException) { emit(id, "unavailable", "play_unavailable") }
            catch (_: SecurityException) { emit(id, "unavailable", "play_unavailable") }
        }
    }

    private fun withUserActivation(callback: (Boolean) -> Unit) {
        val age = SystemClock.elapsedRealtime() - lastInteractionAt
        val physical = lastInteractionAt > 0 && age in 0L..2_000L
        lastInteractionAt = 0L
        val document = web.url.orEmpty()
        val epoch = generation
        // The owned web control must require a trusted click as well.
        runCatching {
            web.evaluateJavascript("navigator.userActivation != null && navigator.userActivation.isActive === true") {
                if (live() && document == web.url.orEmpty() && epoch == generation) callback(physical || it == "true")
            }
        }.onFailure { callback(false) }
    }

    private fun setDeadline(value: Context, delay: Long, reason: String) {
        clearDeadline()
        deadline = Runnable { if (context === value) finish(value, "unavailable", reason) }
            .also { handler.postDelayed(it, delay) }
    }
    private fun clearDeadline() { deadline?.let(handler::removeCallbacks); deadline = null }
    private fun clear(value: Context) {
        if (context !== value) return
        clearDeadline()
        work?.cancel(true)
        work = null
        worker.purge()
        value.accessToken = ""
        value.offers.clear()
        context = null
    }
    private fun finish(value: Context, status: String, reason: String = "", verified: Boolean = false) {
        val notify = current(value)
        clear(value)
        if (notify) emit(value.requestId, status, reason, verified)
    }
    private fun emit(id: String, status: String, reason: String = "", verified: Boolean = false, extra: JSONObject? = null) {
        if (!live() || !PlayBillingPolicy.isBillingDocument(web.url.orEmpty())) return
        val detail = extra ?: JSONObject()
        detail.put("requestId", id).put("status", status).put("reason", reason).put("serverVerified", verified)
        val document = JSONObject.quote(web.url.orEmpty())
        runCatching { web.evaluateJavascript("if(location.href===$document){window.dispatchEvent(new CustomEvent('matchapp:billing',{detail:$detail}));}", null) }
    }

    fun recordUserInteraction() { lastInteractionAt = SystemClock.elapsedRealtime() }
    fun onResume() {
        foreground = true
        if (!installed) return
        purchaseFlow = false
        context?.takeIf { it.phase == "launching" }?.let {
            it.phase = "checking_purchases"
            setDeadline(it, 25_000L, "restore_timeout")
        }
        connect()
    }
    fun onPause() {
        foreground = false
        lastInteractionAt = 0L
        context?.takeIf { it.phase !in setOf("launching", "verifying") }?.let {
            finish(it, "cancelled", "backgrounded")
        }
    }
    fun onNavigation() {
        generation++
        lastInteractionAt = 0L
        context?.let { clear(it) }
    }
    fun destroy() {
        if (destroyed) return
        destroyed = true
        context?.let { clear(it) }
        clearDeadline()
        queryDeadline?.let(handler::removeCallbacks)
        queryDeadline = null
        queryGeneration++
        worker.shutdownNow()
        owned = emptyList()
        runCatching { billing?.endConnection() }
        billing = null
        if (installed && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            runCatching { WebViewCompat.removeWebMessageListener(web, BRIDGE_NAME) }
        }
        installed = false
    }
    companion object { private const val BRIDGE_NAME = "MatchAppNativeBilling" }
}
