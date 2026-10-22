package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class NativeCinemaNavigationPolicyTest {
    private val fallback = "https://www.google.com/maps/search/?api=1&query=Street%20Fighter%20movie%20showtimes"

    @Test fun acceptsTheActualTitleFallbackAndRoundedNearbySearch() {
        assertTrue(NativeCinemaNavigationPolicy.isSearchUrl(fallback))
        assertTrue(NativeCinemaNavigationPolicy.isSearchUrl(fallback + "%20near%20-23.55%2C-46.63"))
        assertTrue(NativeCinemaNavigationPolicy.isSearchUrl(fallback + "%20near%200.00%2C0.00"))
    }

    @Test fun acceptsEncodedTitlePunctuationAndInternationalCharacters() {
        assertTrue(NativeCinemaNavigationPolicy.isSearchUrl(
            "https://www.google.com/maps/search/?api=1&query=Street%20Fighter%3A%20S%C3%A3o%20Paulo%20%26%20Tokyo%20%F0%9F%8E%AC"))
        assertTrue(NativeCinemaNavigationPolicy.isSearchUrl(
            "https://www.google.com/maps/search/?query=%E6%9D%B1%E4%BA%AC+movie+showtimes&api=1"))
    }

    @Test fun acceptsOnlyTheCanonicalSearchPathAndHttpsDefaultPortVariants() {
        for (url in listOf(fallback, fallback.replace("www.google.com", "google.com"),
            fallback.replace("www.google.com", "WWW.GOOGLE.COM:443"),
            fallback.replace("/search/?", "/search?"))) {
            assertTrue(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun rejectsAbsentBlankAndUnboundedTargets() {
        for (url in listOf(null, "", " ", fallback + "a".repeat(8192))) {
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun neverParsesOrAcceptsIntentAndOtherNonHttpsSchemes() {
        for (url in listOf(fallback.replace("https:", "http:"), fallback.replace("https:", "intent:"),
            "intent://www.google.com/maps/search/#Intent;scheme=https;package=com.google.android.apps.maps;end",
            "geo:0,0?q=cinemas", "javascript:alert(1)", "file:///maps/search/?api=1&query=cinemas")) {
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun rejectsLookalikesAndUnrelatedGoogleSubdomains() {
        for (host in listOf("www.google.com.evil.test", "google.com.evil.test", "www-google.com",
            "maps.google.com", "accounts.google.com", "googleapis.com", "matchapp.tv")) {
            val url = fallback.replace("www.google.com", host)
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun rejectsCredentialsUnexpectedPortsAndFragments() {
        for (url in listOf(fallback.replace("www.google.com", "user@www.google.com"),
            fallback.replace("www.google.com", "www.google.com:444"),
            fallback.replace("www.google.com", "www.google.com:80"),
            fallback + "#Intent;scheme=https;end", fallback + "#")) {
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun rejectsAdjacentEncodedAndTraversingPaths() {
        for (route in listOf("/maps/", "/maps/searching/", "/maps/search//", "/maps/%73earch/",
            "/maps/search/../auth", "/maps/search/%2e%2e/auth", "//maps/search/", "/o/oauth2/auth")) {
            val url = fallback.replace("/maps/search/", route)
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun leavesExistingAuthenticationDestinationsOutsideTheCinemaRoute() {
        for (url in listOf("https://accounts.google.com/o/oauth2/v2/auth?client_id=fixture",
            "https://www.google.com/o/oauth2/auth?client_id=fixture",
            "https://zkymvqrmbabngsqblyye.supabase.co/auth/v1/authorize?provider=google",
            "https://matchapp.tv/index.html?code=fixture")) {
            assertFalse(url, NativeCinemaNavigationPolicy.isSearchUrl(url))
        }
    }

    @Test fun requiresOneApiOneAndOneNonemptySearch() {
        for (query in listOf("", "api=1", "query=cinemas", "api=2&query=cinemas", "api=1&query=",
            "api=1&query=+", "api=1&api=1", "query=a&query=b", "api=1&query=a&query=b",
            "api=1&query=a&redirect=https%3A%2F%2Fevil.test", "api=1&%71uery=cinemas")) {
            assertFalse(query, NativeCinemaNavigationPolicy.isSearchUrl("https://www.google.com/maps/search/?$query"))
        }
    }

    @Test fun rejectsMalformedEscapesAndControlCharacters() {
        for (query in listOf("%", "%zz", "%00", "%0A", "%0D", "%7F")) {
            assertFalse(query, NativeCinemaNavigationPolicy.isSearchUrl("https://www.google.com/maps/search/?api=1&query=$query"))
        }
    }
}
