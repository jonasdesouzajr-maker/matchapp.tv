package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class PublicPageRetryPolicyTest {
    private val page = "https://matchapp.tv/news/?lang=pt"
    private fun delay(status: Int = 503, header: String? = null, attempts: Int = 0, method: String = "GET", url: String = page, now: Long = 0L) =
        PublicPageRetryPolicy.delayMillis(url, method, status, header, attempts, now)

    @Test fun retriesPublicMainPageReadsAtMostTwiceWithBackoff() {
        assertEquals(1_000L, delay())
        assertEquals(2_000L, delay(status = 429, attempts = 1))
        assertNull(delay(attempts = 2))
        assertNull(delay(attempts = -1))
        for (status in listOf(200, 401, 403, 404, 500)) assertNull(delay(status = status))
        assertNull(delay(method = "POST"))
    }

    @Test fun neverReplaysAuthPaymentsPrivatePagesOrApiCalls() {
        for (url in listOf("https://matchapp.tv/auth.html", "https://matchapp.tv/oauth/callback.html",
            "https://matchapp.tv/profile/profile.html", "https://matchapp.tv/pricing.html",
            "https://matchapp.tv/api/ask", "https://matchapp.tv/?code=private",
            "https://matchapp.tv/?access_token=private", "https://matchapp.tv/kids/",
            "https://matchapp.tv/%6Eews/", "https://matchapp.tv/news/../news/",
            "https://matchapp.tv.evil/news/", "https://evil.matchapp.tv/news/",
            "http://matchapp.tv/news/", "https://user@matchapp.tv/news/",
            "https://matchapp.tv:8443/news/")) assertNull(url, delay(url = url))
        assertEquals(1_000L, delay(url = "https://matchapp.tv/?utm_source=android_app&appBuild=69"))
    }

    @Test fun honorsRetryAfterWithoutRetryingBeforeALongServerCooldown() {
        assertEquals(10_000L, delay(header = "10"))
        assertEquals(2_000L, delay(header = "0", attempts = 1))
        assertEquals(30_000L, delay(header = "30"))
        assertNull(delay(header = "31"))
        assertNull(delay(header = "9999999999999999999999999"))
        assertNull(delay(header = "-1"))
        assertEquals(1_000L, delay(header = "invalid"))
        assertEquals(10_000L, delay(header = "Thu, 01 Jan 1970 00:00:10 GMT"))
        assertNull(delay(header = "Thu, 01 Jan 1970 00:01:00 GMT"))
        assertEquals(1_000L, delay(header = "Thu, 01 Jan 1970 00:00:10 GMT", now = 20_000L))
    }
}
