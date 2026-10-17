package com.jonas.papercup

import android.os.SystemClock
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/** Validates an issued claim with MatchApp; it never creates or grants a token reward. */
internal object RewardedClaimClient {
    private const val ENDPOINT = "https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/reward-session"
    private const val MAX_RESPONSE_BYTES = 16_384

    fun verify(claimNonce: String, accessToken: String): VerifiedRewardClaim? {
        if (!RewardedRequestPolicy.validNonce(claimNonce) ||
            !RewardedRequestPolicy.validAccessToken(accessToken) ||
            Thread.currentThread().isInterrupted) return null
        var connection: HttpsURLConnection? = null
        return try {
            val deadline = SystemClock.elapsedRealtime() + 12_000L
            val body = JSONObject().put("action", "native_validate")
                .put("claimNonce", claimNonce).toString().toByteArray(Charsets.UTF_8)
            connection = URL(ENDPOINT).openConnection() as? HttpsURLConnection ?: return null
            connection.apply {
                // Auth material may never follow a redirect to a different endpoint.
                instanceFollowRedirects = false
                requestMethod = "POST"
                connectTimeout = 6_000
                readTimeout = 6_000
                useCaches = false
                doOutput = true
                setRequestProperty("Authorization", "Bearer $accessToken")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setFixedLengthStreamingMode(body.size)
            }
            connection.outputStream.use { it.write(body) }
            if (connection.responseCode != HttpsURLConnection.HTTP_OK ||
                Thread.currentThread().isInterrupted || SystemClock.elapsedRealtime() >= deadline) return null
            val raw = connection.inputStream.use { readBounded(it, deadline) } ?: return null
            val response = JSONObject(raw)
            if (response.opt("ok") != true) return null
            val nonce = response.opt("claimNonce") as? String ?: return null
            val userId = response.opt("userId") as? String ?: return null
            val unit = response.opt("adUnitId") as? String ?: return null
            val expiry = (response.opt("expiresAt") as? Number)?.toString()?.toLongOrNull() ?: return null
            val amount = (response.opt("rewardAmount") as? Number)?.toString()?.toIntOrNull() ?: return null
            if (nonce != claimNonce || !RewardedRequestPolicy.validUserId(userId) ||
                !RewardedRequestPolicy.validProductionUnit(unit) || amount != 3 ||
                !RewardedRequestPolicy.claimHasTimeToComplete(expiry, System.currentTimeMillis())) return null
            VerifiedRewardClaim(nonce, userId, expiry, unit, amount)
        } catch (_: Exception) {
            // No response body, JWT, nonce or user identity is written to a log.
            null
        } finally {
            runCatching { connection?.disconnect() }
        }
    }

    private fun readBounded(input: InputStream, deadline: Long): String? {
        val bytes = ByteArrayOutputStream()
        val buffer = ByteArray(1_024)
        while (!Thread.currentThread().isInterrupted && SystemClock.elapsedRealtime() < deadline) {
            val size = input.read(buffer)
            if (size < 0) return bytes.toString(Charsets.UTF_8.name())
            if (bytes.size() + size > MAX_RESPONSE_BYTES) return null
            bytes.write(buffer, 0, size)
        }
        return null
    }
}
