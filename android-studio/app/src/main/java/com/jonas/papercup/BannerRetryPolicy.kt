package com.jonas.papercup

/** Recovery for a failed request only. Healthy ads keep the SDK's refresh policy. */
internal class BannerRetryPolicy {
    private var failures = 0

    fun delayAfterFailure(errorCode: Int): Long? {
        // Google Mobile Ads: internal (0), network (2), no fill (3).
        // Invalid requests (1) and unknown failures require a configuration fix.
        if (errorCode !in setOf(0, 2, 3)) return null
        failures = (failures + 1).coerceAtMost(3)
        return when (failures) { 1 -> 60_000L; 2 -> 120_000L; else -> 300_000L }
    }

    fun reset() { failures = 0 }
}
