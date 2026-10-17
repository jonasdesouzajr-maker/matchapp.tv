package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class PlayBillingPolicyTest {
    @Test fun limitsPurchasesToOwnedAdultPurchaseSurfaces() {
        for (path in listOf("/", "/index.html?lang=pt-BR", "/pricing/", "/profile/profile.html", "/ebooks/")) {
            assertTrue(PlayBillingPolicy.isBillingDocument("https://matchapp.tv$path"))
        }
        for (url in listOf("https://matchapp.tv/kids/", "https://matchapp.tv/contact.html", "https://matchapp.tv/oauth/", "https://matchapp.tv/%70ricing/", "https://matchapp.tv/other/../pricing/", "http://matchapp.tv/pricing/", "https://matchapp.tv.evil.example/pricing/")) {
            assertFalse(url, PlayBillingPolicy.isBillingDocument(url))
        }
    }

    @Test fun boundsOnlyIdentifiersRatherThanAcceptingUrlsOrPurchaseCommands() {
        assertTrue(PlayBillingPolicy.validProduct("actual.pro_subscription"))
        assertFalse(PlayBillingPolicy.validProduct("https://example.com/pay"))
        assertFalse(PlayBillingPolicy.validProduct("x".repeat(151)))
        assertTrue(PlayBillingPolicy.validPlan("monthly-plan"))
        assertFalse(PlayBillingPolicy.validPlan("monthly plan"))
        assertTrue(PlayBillingPolicy.validPurchaseToken("purchase_token.for-verification:only"))
        assertFalse(PlayBillingPolicy.validPurchaseToken(""))
        assertFalse(PlayBillingPolicy.validPurchaseToken("token\r\nAuthorization: injected"))
        assertFalse(PlayBillingPolicy.validPurchaseToken("t".repeat(4097)))
    }

    @Test fun rejectsStaleSessionsAndHashesPurchaseTokensDeterministically() {
        val now = 1_700_000_000_000L
        assertTrue(PlayBillingPolicy.validSessionExpiry(now + 600_000, now))
        assertFalse(PlayBillingPolicy.validSessionExpiry(now + 30_000, now))
        assertFalse(PlayBillingPolicy.validSessionExpiry(now + 1_800_001, now))
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", PlayBillingPolicy.tokenHash("abc"))
        assertNotEquals(PlayBillingPolicy.tokenHash("abc"), PlayBillingPolicy.tokenHash("abd"))
    }

    @Test fun retentionQuotesBindAnUnexpiredSourceAndAnIssuedOpaqueIntent() {
        val now = 1_700_000_000_000L
        val source = VerifiedRetentionSource(PlayBillingPolicy.tokenHash("old-token"), now + 86_400_000,
            "00000000-0000-4000-8000-000000000003")
        assertTrue(PlayBillingPolicy.validRetentionSource(source, "old-token", now))
        assertFalse(PlayBillingPolicy.validRetentionSource(source, "another-account-token", now))
        assertFalse(PlayBillingPolicy.validRetentionSource(source.copy(expiresAtMillis = now + 30_000), "old-token", now))
        assertFalse(PlayBillingPolicy.validRetentionSource(source.copy(claimNonce = "client-supplied"), "old-token", now))
    }

    @Test fun existingAccessDoesNotConfirmAnAcceptedRetentionDiscount() {
        val hash = PlayBillingPolicy.tokenHash("old-token")
        val session = VerifiedBillingSession("00000000-0000-4000-8000-000000000001", "a".repeat(64),
            1_700_000_600_000L, "matchapp_pro", setOf("monthly"), setOf("server-approved-offer"), true, true,
            VerifiedRetentionSource(hash, 1_700_086_400_000L, "00000000-0000-4000-8000-000000000003"))
        assertTrue(PlayBillingPolicy.matchesRetentionReceipt(session, "new-token", "monthly", "server-approved-offer", hash))
        assertFalse(PlayBillingPolicy.matchesRetentionReceipt(session, "old-token", "monthly", "server-approved-offer", hash))
        assertFalse(PlayBillingPolicy.matchesRetentionReceipt(session, "new-token", "monthly", null, hash))
        assertFalse(PlayBillingPolicy.matchesRetentionReceipt(session, "new-token", "annual", "server-approved-offer", hash))
        assertFalse(PlayBillingPolicy.matchesRetentionReceipt(session, "new-token", "monthly", "server-approved-offer", "b".repeat(64)))
        assertTrue(PlayBillingPolicy.matchesRetentionReceipt(session.copy(retention = null), "ordinary-token", null, null, null))
    }
}
