package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class NativeNewsPolicyTest {
    private val viewport = NativeNewsPolicy.Viewport(360.0, 720.0, 0.0, 0.0, 1.0)
    private val rect = NativeNewsPolicy.Bounds(36.0, 80.0, 288.0, 480.0)

    @Test fun confinesInventoryToTheCanonicalAdultNewsHub() {
        assertTrue(NativeNewsPolicy.isNewsDocument("https://matchapp.tv/news/?lang=ar"))
        assertTrue(NativeNewsPolicy.isNewsDocument("https://matchapp.tv/news/index.html"))
        for (url in listOf("https://matchapp.tv/", "https://matchapp.tv/news/articles/title/",
            "https://matchapp.tv/kids/news/", "https://matchapp.tv/%6Eews/",
            "https://matchapp.tv/news/../news/", "https://matchapp.tv.evil/news/", "http://matchapp.tv/news/")) {
            assertFalse(url, NativeNewsPolicy.isNewsDocument(url))
        }
        assertTrue(NativeNewsPolicy.isReporterDocument("https://matchapp.tv/ebooks/"))
        assertFalse(NativeNewsPolicy.isReporterDocument("https://matchapp.tv/profile/profile.html"))
    }

    @Test fun requiresACompleteFixedReservationInsideTheGoldSafeArea() {
        assertTrue(NativeNewsPolicy.fullyVisible(rect, viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect.copy(width = 248.0), viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect.copy(height = 479.0), viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect.copy(x = 7.9), viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect.copy(y = 233.0), viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect.copy(x = 65.0), viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(rect, viewport.copy(height = 400.0)))
    }

    @Test fun rejectsZoomOffsetsNonFiniteAndUnexpectedNativeViewportSizes() {
        assertFalse(NativeNewsPolicy.validSample(rect.copy(y = Double.NaN), viewport))
        assertFalse(NativeNewsPolicy.validSample(rect.copy(width = Double.POSITIVE_INFINITY), viewport))
        assertFalse(NativeNewsPolicy.validSample(rect, viewport.copy(scale = 1.1)))
        assertFalse(NativeNewsPolicy.validSample(rect, viewport.copy(offsetY = 20.0)))
        assertTrue(NativeNewsPolicy.matchesNativeViewport(viewport, 1080, 2160, 3f))
        assertFalse(NativeNewsPolicy.matchesNativeViewport(viewport, 1080, 1920, 3f))
        assertFalse(NativeNewsPolicy.matchesNativeViewport(viewport, 1080, 2160, 2f))
    }

    @Test fun invalidatesMovingStaleAndFutureMeasurements() {
        assertTrue(NativeNewsPolicy.stable(rect, rect.copy(y = 80.25)))
        assertFalse(NativeNewsPolicy.stable(rect, rect.copy(y = 81.0)))
        assertTrue(NativeNewsPolicy.fresh(1_000, 1_750))
        assertFalse(NativeNewsPolicy.fresh(1_000, 1_751))
        assertFalse(NativeNewsPolicy.fresh(1_001, 1_000))
    }

    @Test fun allowsOnlyBoundedContextsAndAuthoredLanguages() {
        assertTrue(NativeNewsPolicy.validRequestId("d33d5a89-bfa1-4a78-8ce3-a0a419ecff6c"))
        assertFalse(NativeNewsPolicy.validRequestId("x".repeat(65)))
        assertFalse(NativeNewsPolicy.validRequestId("<script>alert(1)</script>"))
        assertTrue(NativeNewsPolicy.validAccount("guest"))
        assertFalse(NativeNewsPolicy.validAccount("unknown"))
        assertEquals(14, NativeNewsPolicy.languages.size)
        assertTrue("pt" in NativeNewsPolicy.languages)
    }
}
