package com.jonas.papercup

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativePermissionPolicyTest {
    private val ready = NativePermissionPolicy.RequestState(
        resumed = true, focused = true, pageReady = true, overlayShowing = false,
        requestPending = false, microphonePending = false, terminating = false,
        lastInteractionAt = 1000L
    )

    @Test fun permitsOnlyMatchingTrustedHttpsMainDocuments() {
        assertTrue(NativePermissionPolicy.allowsCaller("https://matchapp.tv", "https://matchapp.tv/?lang=pt-BR", true))
        assertTrue(NativePermissionPolicy.allowsCaller("https://www.matchapp.tv:443", "https://www.matchapp.tv/profile/profile.html", true))
        assertFalse(NativePermissionPolicy.allowsCaller("https://matchapp.tv", "https://matchapp.tv/", false))
        assertFalse(NativePermissionPolicy.allowsCaller("https://www.matchapp.tv", "https://matchapp.tv/", true))
    }

    @Test fun rejectsUntrustedMalformedAndNonstandardOrigins() {
        for (origin in listOf("http://matchapp.tv", "https://evil.example", "https://sub.matchapp.tv", "https://matchapp.tv.evil.example", "https://matchapp.tv:8443", "https://user@matchapp.tv", "https://matchapp.tv/path", "not a URI")) {
            assertFalse(origin, NativePermissionPolicy.allowsCaller(origin, "https://matchapp.tv/", true))
        }
        for (current in listOf(null, "http://matchapp.tv/", "https://evil.example/", "https://sub.matchapp.tv/", "https://matchapp.tv:8443/", "https://user@matchapp.tv/", "not a URI")) {
            assertFalse(current ?: "null", NativePermissionPolicy.allowsCaller("https://matchapp.tv", current, true))
        }
    }

    @Test fun rejectsKidsIncludingEncodedAndNormalizedPaths() {
        for (suffix in listOf("/kids", "/kids/", "/kids/story", "/KiDs/", "/%6bids/", "/adult/../kids/index.html", "/adult/%2e%2e/kids/")) {
            assertFalse(suffix, NativePermissionPolicy.allowsCaller("https://matchapp.tv", "https://matchapp.tv" + suffix, true))
        }
    }

    @Test fun requiresEveryForegroundAndSingleRequestGuard() {
        assertTrue(NativePermissionPolicy.allowsRequest(ready, 1200L))
        for (blocked in listOf(
            ready.copy(resumed = false), ready.copy(focused = false),
            ready.copy(pageReady = false), ready.copy(overlayShowing = true),
            ready.copy(requestPending = true), ready.copy(microphonePending = true),
            ready.copy(terminating = true)
        )) assertFalse(NativePermissionPolicy.allowsRequest(blocked, 1200L))
    }

    @Test fun rejectsExpiredFutureAndConsumedInteractions() {
        assertTrue(NativePermissionPolicy.allowsRequest(ready, 1000L))
        assertTrue(NativePermissionPolicy.allowsRequest(ready, 2500L))
        assertFalse(NativePermissionPolicy.allowsRequest(ready, 2501L))
        assertFalse(NativePermissionPolicy.allowsRequest(ready, 999L))
        assertFalse(NativePermissionPolicy.allowsRequest(ready.copy(lastInteractionAt = 0L), 1200L))
        assertFalse(NativePermissionPolicy.allowsRequest(ready.copy(lastInteractionAt = -1L), 1200L))
    }
}
