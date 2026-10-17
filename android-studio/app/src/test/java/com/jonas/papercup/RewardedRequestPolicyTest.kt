package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class RewardedRequestPolicyTest {
    @Test fun allowsOnlyTheCanonicalHttpsOriginWithoutCredentialsOrCustomPorts() {
        assertTrue(RewardedRequestPolicy.isFirstPartyOrigin("https://matchapp.tv"))
        assertTrue(RewardedRequestPolicy.isFirstPartyOrigin("https://matchapp.tv:443/"))
        for (origin in listOf("http://matchapp.tv", "https://matchapp.tv.evil.example", "https://www.matchapp.tv", "https://user@matchapp.tv", "https://matchapp.tv:444", "file:///android_asset/index.html", "null", "not a URI")) {
            assertFalse(origin, RewardedRequestPolicy.isFirstPartyOrigin(origin))
        }
    }

    @Test fun allowsOnlyTheDisclosedRewardSurfaces() {
        for (url in listOf("https://matchapp.tv/", "https://matchapp.tv/index.html?lang=ar", "https://matchapp.tv/ebooks/", "https://matchapp.tv/news/", "https://matchapp.tv/news/index.html")) {
            assertTrue(RewardedRequestPolicy.isAdultDocument(url))
        }
        for (url in listOf("https://matchapp.tv/kids", "https://matchapp.tv/kids/", "https://matchapp.tv/%6bids/", "https://matchapp.tv/a/../kids/", "https://matchapp.tv//kids/", "https://matchapp.tv/oauth/consent.html", "https://matchapp.tv/contact.html", "https://matchapp.tv/pricing.html", "https://matchapp.tv/profile.html", "https://matchapp.tv/together.html", "https://matchapp.tv/discover.html", "https://matchapp.tv/%69ndex.html")) {
            assertFalse(url, RewardedRequestPolicy.isAdultDocument(url))
        }
    }

    @Test fun rejectsUnboundedIdentifiersAndCredentialsBeforeAnyNetworkRequest() {
        assertTrue(RewardedRequestPolicy.validRequestId("7e7e0db3-a51b-4c96-bbd7-4665ec37ce99"))
        assertFalse(RewardedRequestPolicy.validRequestId("x".repeat(65)))
        assertFalse(RewardedRequestPolicy.validRequestId("x\nheader"))
        assertTrue(RewardedRequestPolicy.validNonce("a".repeat(64)))
        assertFalse(RewardedRequestPolicy.validNonce("a".repeat(63)))
        assertFalse(RewardedRequestPolicy.validNonce("a".repeat(64) + "&user_id=other"))
        assertTrue(RewardedRequestPolicy.validUserId("66fb77fb-2e83-43cb-9f4d-eaa3a3e46345"))
        assertFalse(RewardedRequestPolicy.validUserId("user@example.com"))
        assertTrue(RewardedRequestPolicy.validAccessToken("a".repeat(35) + "." + "b".repeat(35) + "." + "c".repeat(35)))
        assertFalse(RewardedRequestPolicy.validAccessToken("Bearer unsafe\r\nX-Injected: yes"))
        assertFalse(RewardedRequestPolicy.validAccessToken("a".repeat(8193) + ".b.c"))
    }

    @Test fun acceptsOnlyTheCurrentPublishersProductionUnitShape() {
        assertTrue(RewardedRequestPolicy.validProductionUnit("ca-app-pub-9541435081010948/1234567890"))
        assertFalse(RewardedRequestPolicy.validProductionUnit("ca-app-pub-3940256099942544/5224354917"))
        assertFalse(RewardedRequestPolicy.validProductionUnit(""))
        assertFalse(RewardedRequestPolicy.validProductionUnit("https://evil.example/ad"))
    }

    @Test fun requiresTimeToFinishAndRejectsExpiredOrUnboundedClaims() {
        val now = 1_700_000_000_000L
        assertTrue(RewardedRequestPolicy.claimHasTimeToComplete(now + 600_000, now))
        assertFalse(RewardedRequestPolicy.claimHasTimeToComplete(now - 1, now))
        assertFalse(RewardedRequestPolicy.claimHasTimeToComplete(now + 30_000, now))
        assertFalse(RewardedRequestPolicy.claimHasTimeToComplete(now + 1_800_001, now))
    }
}
