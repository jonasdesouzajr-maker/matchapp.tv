package com.jonas.papercup

import java.net.URI
import java.util.Locale

internal data class VerifiedRewardClaim(
    val nonce: String,
    val userId: String,
    val expiresAtMillis: Long,
    val adUnitId: String,
    val rewardAmount: Int
)

/** Small validation boundary shared by the native bridge and its verified server response. */
internal object RewardedRequestPolicy {
    private val requestId = Regex("^[A-Za-z0-9_-]{1,64}$")
    private val nonce = Regex("^[a-f0-9]{64}$")
    private val userId = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
    private val jwt = Regex("^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$")
    private val productionUnit = Regex("^ca-app-pub-9541435081010948/[0-9]{10}$")
    private val rewardPaths = setOf("/", "/index.html", "/ebooks/", "/ebooks/index.html", "/news/", "/news/index.html")

    fun validRequestId(value: String): Boolean = requestId.matches(value)
    fun validNonce(value: String): Boolean = nonce.matches(value)
    fun validUserId(value: String): Boolean = userId.matches(value)
    fun validAccessToken(value: String): Boolean = value.length in 100..8192 && jwt.matches(value)
    fun validProductionUnit(value: String): Boolean = productionUnit.matches(value)

    fun isFirstPartyOrigin(value: String): Boolean = runCatching {
        val uri = URI(value)
        uri.scheme == "https" && uri.host?.lowercase(Locale.ROOT) == "matchapp.tv" &&
            uri.port in setOf(-1, 443) && uri.rawUserInfo == null
    }.getOrDefault(false)

    fun isAdultDocument(value: String): Boolean = isFirstPartyOrigin(value) && runCatching {
        // Explicit reward destinations keep account, support, Ask and Kids routes
        // outside this new inventory, including encoded or noncanonical aliases.
        val uri = URI(value)
        uri.rawPath == uri.path && uri.path.orEmpty() in rewardPaths
    }.getOrDefault(false)

    fun claimHasTimeToComplete(expiresAtMillis: Long, nowMillis: Long): Boolean =
        expiresAtMillis > nowMillis && expiresAtMillis - nowMillis in 90_000L..1_800_000L
}
