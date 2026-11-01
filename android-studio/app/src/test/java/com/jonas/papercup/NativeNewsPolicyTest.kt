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

    @Test fun permitsOnlyTheFourExplicitAdultContentDestinations() {
        for (path in listOf("/", "/index.html", "/ebooks/", "/ebooks/index.html",
            "/news/", "/news/index.html", "/explore.html")) {
            val url = "https://matchapp.tv$path?lang=pt#content"
            assertTrue(url, NativeNewsPolicy.isAdDocument(url))
            assertTrue(url, NativeNewsPolicy.isReporterDocument(url))
        }
        assertTrue(NativeNewsPolicy.isAdDocument("https://MATCHAPP.TV:443/explore.html"))
        // The content-slot expansion is independent of the opt-in rewarded flow.
        assertFalse(RewardedRequestPolicy.isAdultDocument("https://matchapp.tv/explore.html"))
    }

    @Test fun rejectsOtherSurfacesOriginsAndNoncanonicalContentAliases() {
        for (url in listOf("https://matchapp.tv", "https://matchapp.tv/explore/",
            "https://matchapp.tv/explore/index.html", "https://matchapp.tv/Explore.html",
            "https://matchapp.tv/kids/", "https://matchapp.tv/discover.html",
            "https://matchapp.tv/profile/profile.html", "https://matchapp.tv/contact.html",
            "https://matchapp.tv/together.html", "https://matchapp.tv/news/articles/title/",
            "https://matchapp.tv/ebooks//", "https://matchapp.tv//explore.html",
            "https://matchapp.tv/%65xplore.html", "https://matchapp.tv/ebooks%2F",
            "https://matchapp.tv/news/../explore.html", "https://matchapp.tv/./explore.html",
            "https://www.matchapp.tv/explore.html", "https://matchapp.tv.evil/explore.html",
            "http://matchapp.tv/explore.html", "https://matchapp.tv:8443/explore.html",
            "https://user@matchapp.tv/explore.html", "not a URL")) {
            assertFalse(url, NativeNewsPolicy.isAdDocument(url))
            assertFalse(url, NativeNewsPolicy.isReporterDocument(url))
        }
    }

    @Test fun derivesTheReservationHeightFromTheCanonicalDocument() {
        val compact = rect.copy(height = 360.0)
        for (path in listOf("/", "/index.html", "/ebooks/", "/ebooks/index.html", "/explore.html")) {
            val url = "https://matchapp.tv$path"
            assertEquals(url, 360, NativeNewsPolicy.heightCss(url))
            assertTrue(url, NativeNewsPolicy.validSample(compact, viewport, url))
            assertTrue(url, NativeNewsPolicy.fullyVisible(compact, viewport, url))
            assertFalse(url, NativeNewsPolicy.validSample(rect, viewport, url))
            assertFalse(url, NativeNewsPolicy.fullyVisible(compact.copy(height = 320.0), viewport, url))
            assertFalse(url, NativeNewsPolicy.fullyVisible(compact.copy(y = 353.0), viewport, url))
        }
        for (path in listOf("/news/", "/news/index.html")) {
            val url = "https://matchapp.tv$path"
            assertEquals(url, 480, NativeNewsPolicy.heightCss(url))
            assertTrue(url, NativeNewsPolicy.fullyVisible(rect, viewport, url))
            assertFalse(url, NativeNewsPolicy.validSample(compact, viewport, url))
        }
        // Existing callers retain the original News geometry by default.
        assertFalse(NativeNewsPolicy.validSample(compact, viewport))
        assertFalse(NativeNewsPolicy.fullyVisible(compact, viewport))
        val unsupported = "https://matchapp.tv/kids/"
        assertNull(NativeNewsPolicy.heightCss(unsupported))
        assertFalse(NativeNewsPolicy.validSample(compact, viewport, unsupported))
        assertFalse(NativeNewsPolicy.fullyVisible(rect, viewport, unsupported))
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
