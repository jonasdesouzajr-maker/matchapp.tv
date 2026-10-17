package com.jonas.papercup

import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/** Only the authenticated backend may bind, grant and acknowledge a Play subscription. */
internal object PlayBillingBackendClient {
    private const val ENDPOINT = "https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/play-billing"

    fun session(accessToken: String): VerifiedBillingSession? {
        val json = post(accessToken, JSONObject().put("action", "session")) ?: return null
        return readSession(json)
    }

    fun retentionSession(accessToken: String, previous: VerifiedBillingSession, purchaseToken: String): VerifiedBillingSession? {
        if (!PlayBillingPolicy.validPurchaseToken(purchaseToken)) return null
        val json = post(accessToken, JSONObject().put("action", "retention_session")
            .put("productId", previous.productId).put("purchaseToken", purchaseToken)) ?: return null
        val session = readSession(json) ?: return null
        val sourceHash = json.opt("sourcePurchaseTokenHash") as? String ?: return null
        val sourceExpiry = (json.opt("sourceExpiresAt") as? Number)?.toString()?.toLongOrNull() ?: return null
        val claimNonce = json.opt("offerClaimNonce") as? String ?: return null
        val source = VerifiedRetentionSource(sourceHash, sourceExpiry, claimNonce)
        if (json.opt("purpose") != "retention" || session.userId != previous.userId ||
            session.obfuscatedAccountId != previous.obfuscatedAccountId || !session.hasActiveEntitlement ||
            !session.purchasesEnabled || session.basePlanIds.size != 1 || session.offerIds.size != 1 ||
            !PlayBillingPolicy.validRetentionSource(source, purchaseToken, System.currentTimeMillis())) return null
        return session.copy(retention = source)
    }

    private fun readSession(json: JSONObject): VerifiedBillingSession? {
        if (json.opt("ok") != true) return null
        val userId = json.opt("userId") as? String ?: return null
        val account = json.opt("obfuscatedAccountId") as? String ?: return null
        val expiry = (json.opt("expiresAt") as? Number)?.toString()?.toLongOrNull() ?: return null
        val product = json.opt("productId") as? String ?: return null
        val plans = identifiers(json.optJSONArray("basePlanIds"), 1, 8) ?: return null
        val offers = identifiers(json.optJSONArray("offerIds"), 0, 32) ?: return null
        val active = json.opt("hasActiveEntitlement") as? Boolean ?: return null
        if (!RewardedRequestPolicy.validUserId(userId) || !RewardedRequestPolicy.validNonce(account) ||
            !PlayBillingPolicy.validSessionExpiry(expiry, System.currentTimeMillis()) ||
            !PlayBillingPolicy.validProduct(product) || product != BuildConfig.PLAY_PRO_PRODUCT_ID) return null
        return VerifiedBillingSession(userId, account, expiry, product, plans, offers, active,
            json.opt("purchasesEnabled") == true)
    }

    fun verify(accessToken: String, session: VerifiedBillingSession, purchaseToken: String): Boolean {
        if (!PlayBillingPolicy.validPurchaseToken(purchaseToken)) return false
        val json = post(accessToken, JSONObject().put("action", "verify")
            .put("productId", session.productId).put("purchaseToken", purchaseToken)) ?: return false
        val expiry = (json.opt("entitlementExpiresAt") as? Number)?.toString()?.toLongOrNull() ?: return false
        if (!PlayBillingPolicy.matchesRetentionReceipt(session, purchaseToken,
                json.opt("basePlanId") as? String, json.opt("offerId") as? String,
                json.opt("linkedPurchaseTokenHash") as? String)) return false
        return json.opt("ok") == true && json.opt("entitled") == true && json.opt("acknowledged") == true &&
            json.opt("userId") == session.userId && json.opt("productId") == session.productId &&
            json.opt("purchaseTokenHash") == PlayBillingPolicy.tokenHash(purchaseToken) &&
            expiry > System.currentTimeMillis()
    }

    private fun identifiers(values: JSONArray?, min: Int, max: Int): Set<String>? {
        if (values == null || values.length() !in min..max) return null
        val result = mutableSetOf<String>()
        for (index in 0 until values.length()) {
            val value = values.opt(index) as? String ?: return null
            if (!PlayBillingPolicy.validPlan(value) || !result.add(value)) return null
        }
        return result
    }

    private fun post(accessToken: String, body: JSONObject): JSONObject? {
        if (!RewardedRequestPolicy.validAccessToken(accessToken) || Thread.currentThread().isInterrupted) return null
        var connection: HttpsURLConnection? = null
        return try {
            val deadline = SystemClock.elapsedRealtime() + 12_000L
            val payload = body.toString().toByteArray(Charsets.UTF_8)
            connection = URL(ENDPOINT).openConnection() as? HttpsURLConnection ?: return null
            connection.apply {
                instanceFollowRedirects = false
                requestMethod = "POST"
                connectTimeout = 6_000
                readTimeout = 6_000
                useCaches = false
                doOutput = true
                setRequestProperty("Authorization", "Bearer $accessToken")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setFixedLengthStreamingMode(payload.size)
            }
            connection.outputStream.use { it.write(payload) }
            if (connection.responseCode != HttpsURLConnection.HTTP_OK ||
                Thread.currentThread().isInterrupted || SystemClock.elapsedRealtime() >= deadline) return null
            val bytes = ByteArrayOutputStream()
            val buffer = ByteArray(1_024)
            connection.inputStream.use { input ->
                while (!Thread.currentThread().isInterrupted && SystemClock.elapsedRealtime() < deadline) {
                    val size = input.read(buffer)
                    if (size < 0) return JSONObject(bytes.toString(Charsets.UTF_8.name()))
                    if (bytes.size() + size > 16_384) return null
                    bytes.write(buffer, 0, size)
                }
            }
            null
        } catch (_: Exception) {
            // Never log JWTs, purchase tokens, account identifiers or server responses.
            null
        } finally {
            runCatching { connection?.disconnect() }
        }
    }
}
