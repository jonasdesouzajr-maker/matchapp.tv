package com.jonas.papercup

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BannerRetryPolicyTest {
    @Test fun transientFailuresBackOffAndRemainBounded() {
        val policy = BannerRetryPolicy()
        assertEquals(60_000L, policy.delayAfterFailure(2))
        assertEquals(120_000L, policy.delayAfterFailure(3))
        repeat(10) { assertEquals(300_000L, policy.delayAfterFailure(0)) }
    }
    @Test fun invalidConfigurationDoesNotRetryOrConsumeBackoff() {
        val policy = BannerRetryPolicy()
        assertNull(policy.delayAfterFailure(1))
        assertNull(policy.delayAfterFailure(99))
        assertEquals(60_000L, policy.delayAfterFailure(2))
    }
    @Test fun successfulLoadResetsRecovery() {
        val policy = BannerRetryPolicy()
        repeat(3) { policy.delayAfterFailure(2) }
        policy.reset()
        assertEquals(60_000L, policy.delayAfterFailure(3))
    }
}
