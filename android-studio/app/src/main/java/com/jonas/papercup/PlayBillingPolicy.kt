package com.jonas.papercup

import java.net.URI
import java.security.MessageDigest

internal data class VerifiedBillingSession(
    val userId: String,
    val obfuscatedAccountId: String,
    val expiresAtMillis: Long,
    val productId: String,
    val basePlanIds: Set<String>,
    val offerIds: Set<String>,
    val hasActiveEntitlement: Boolean,
    val purchasesEnabled: Boolean = false,
    val retention: VerifiedRetentionSource? = null
)

internal data class VerifiedRetentionSource(
    val purchaseTokenHash: String,
    val expiresAtMillis: Long,
    val claimNonce: String
)

internal object PlayBillingPolicy {
    private val productId = Regex("^[a-z][a-z0-9._]{0,149}$")
    private val planId = Regex("^[a-z0-9][a-z0-9-]{0,62}$")
    private val billingPaths = setOf("/", "/index.html", "/ebooks/", "/ebooks/index.html",
        "/news/", "/news/index.html", "/pricing/", "/pricing/index.html", "/pricing/pricing.html",
        "/profile/", "/profile/index.html", "/profile/profile.html")

    fun validProduct(value: String): Boolean = productId.matches(value)
    fun validPlan(value: String): Boolean = planId.matches(value)
    fun validPurchaseToken(value: String): Boolean = value.length in 1..4096 && value.all { it.code in 33..126 }
    fun validSessionExpiry(expiry: Long, now: Long): Boolean = expiry > now && expiry - now in 60_000L..1_800_000L
    fun validRetentionSource(source: VerifiedRetentionSource, purchaseToken: String, now: Long): Boolean =
        validPurchaseToken(purchaseToken) && source.purchaseTokenHash == tokenHash(purchaseToken) &&
            RewardedRequestPolicy.validUserId(source.claimNonce) && source.expiresAtMillis > now + 60_000L &&
            source.expiresAtMillis - now <= 2L * 366L * 86_400_000L
    fun matchesRetentionReceipt(session: VerifiedBillingSession, purchaseToken: String,
                                basePlan: String?, offer: String?, linkedHash: String?): Boolean {
        val source = session.retention ?: return true
        return validPurchaseToken(purchaseToken) && tokenHash(purchaseToken) != source.purchaseTokenHash &&
            basePlan in session.basePlanIds && offer in session.offerIds && linkedHash == source.purchaseTokenHash
    }
    fun isBillingDocument(value: String): Boolean = RewardedRequestPolicy.isFirstPartyOrigin(value) && runCatching {
        val uri = URI(value)
        uri.rawPath == uri.path && uri.path in billingPaths
    }.getOrDefault(false)
    fun tokenHash(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it.toInt() and 0xff) }
}
