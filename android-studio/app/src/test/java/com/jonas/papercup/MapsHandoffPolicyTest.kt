package com.jonas.papercup

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MapsHandoffPolicyTest {
    private fun dest(raw: String?) = MapsHandoffPolicy.canonicalDestination(raw)

    @Test fun acceptsCanonicalMapsSearchAndPlaceUrls() {
        val search = "https://www.google.com/maps/search/?api=1&query=cinema%20near%20me"
        assertEquals(search, dest(search))
        assertEquals("https://google.com/maps/place/Cinemark", dest("https://google.com/maps/place/Cinemark"))
        assertEquals("https://www.google.com/maps", dest("https://www.google.com/maps"))
        assertEquals("https://maps.google.com/?q=cinema", dest("https://maps.google.com/?q=cinema"))
        assertEquals("https://www.google.com/maps/search/x", dest("https://WWW.Google.com:443/maps/search/x"))
    }

    @Test fun dropsFragment() {
        assertEquals("https://www.google.com/maps/search/x", dest("https://www.google.com/maps/search/x#frag"))
    }

    @Test fun rejectsLookalikeAndOtherGoogleHosts() {
        assertNull(dest("https://www.google.com.evil.com/maps/search/x"))
        assertNull(dest("https://evilgoogle.com/maps/search/x"))
        assertNull(dest("https://maps.google.com.evil.com/"))
        assertNull(dest("https://accounts.google.com/maps/x"))
        assertNull(dest("https://accounts.google.com/o/oauth2/auth"))
        assertNull(dest("https://google.co/maps"))
    }

    @Test fun rejectsWrongPathsSchemesUserinfoAndPorts() {
        assertNull(dest("https://www.google.com/mapsX"))
        assertNull(dest("https://www.google.com/search?q=maps"))
        assertNull(dest("https://www.google.com/maps/../accounts"))
        assertNull(dest("http://www.google.com/maps/search/x"))
        assertNull(dest("https://user@www.google.com/maps/search/x"))
        assertNull(dest("https://evil.com@www.google.com/maps"))
        assertNull(dest("https://www.google.com:8443/maps/search/x"))
        assertNull(dest("https://www.google.com\\@evil.com/maps"))
        assertNull(dest("javascript:alert(1)"))
        assertNull(dest(""))
        assertNull(dest(null))
    }

    @Test fun observedIntentShapeBecomesCanonicalHttps() {
        val raw = "intent://www.google.com/maps/search/cinema+near+me?hl=pt-BR#Intent;scheme=https;" +
            "package=com.google.android.apps.maps;" +
            "S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fsearch%2Fcinema;end"
        assertEquals("https://www.google.com/maps/search/cinema", dest(raw))
        val noFallback = "intent://www.google.com/maps/search/cinema+near+me?hl=pt-BR#Intent;scheme=https;" +
            "package=com.google.android.apps.maps;end"
        assertEquals("https://www.google.com/maps/search/cinema+near+me?hl=pt-BR", dest(noFallback))
        assertNull(dest("intent://www.google.com/maps/search/x#Intent;scheme=https;package=com.evil;end"))
        assertNull(dest("intent://www.google.com/maps/search/x#Intent;scheme=https;end"))
    }

    @Test fun apiQueryOnRootAndMapsBoundary() {
        assertEquals("https://www.google.com/?api=1&query=x", dest("https://www.google.com/?api=1&query=x"))
        assertNull(dest("https://www.google.com/?query=x"))
        assertNull(dest("https://www.google.com/mapsevil/x"))
        assertTrue(MapsHandoffPolicy.isGoogleMapsDestination("https://www.google.com/maps?q=x"))
    }

    @Test fun intentComponentPackageAndExtrasAreIgnored() {
        val raw = "intent://maps.google.com/maps?q=cinema#Intent;scheme=https;" +
            "component=com.evil/.Steal;SEL;action=android.intent.action.SEND;" +
            "S.extra=x;launchFlags=0x3;package=com.google.android.apps.maps;end"
        assertEquals("https://maps.google.com/maps?q=cinema", dest(raw))
    }

    @Test fun intentFallsBackOnlyToApprovedFallback() {
        val bad = "intent://evil.com/x#Intent;scheme=https;" +
            "S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fsearch%2Fcinema;end"
        assertEquals("https://www.google.com/maps/search/cinema", dest(bad))
        val nonHttps = "intent://www.google.com/maps#Intent;scheme=geo;" +
            "S.browser_fallback_url=https%3A%2F%2Fmaps.google.com%2F;end"
        assertEquals("https://maps.google.com/", dest(nonHttps))
    }

    @Test fun intentWithMaliciousFallbackIsRejected() {
        assertNull(dest("intent://evil.com/x#Intent;scheme=https;" +
            "S.browser_fallback_url=https%3A%2F%2Fwww.google.com.evil.com%2Fmaps;end"))
        assertNull(dest("intent://evil.com/x#Intent;scheme=https;" +
            "S.browser_fallback_url=javascript%3Aalert(1);end"))
        assertNull(dest("intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end"))
        assertNull(dest("intent://www.google.com/maps#Intent;scheme=https"))
        assertNull(dest("intent:#Intent;component=com.evil/.X;end"))
    }
}
