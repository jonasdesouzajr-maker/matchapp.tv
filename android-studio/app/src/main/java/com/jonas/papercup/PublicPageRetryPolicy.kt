package com.jonas.papercup

import java.net.URI
import java.text.SimpleDateFormat
import java.util.Locale

/** Recovery is limited to public HTML GETs, never API/auth/payment requests. */
internal object PublicPageRetryPolicy {
    private val documents = setOf("/", "/index.html", "/explore.html", "/news/", "/news/index.html",
        "/music.html", "/ebooks/", "/ebooks/index.html", "/cooking/", "/cooking/index.html")
    private val parameters = setOf("lang", "app", "appBuild", "utm_source", "utm_medium",
        "utm_campaign", "utm_content", "utm_term", "music-source")

    fun publicDocument(url: String): Boolean = runCatching {
        val uri = URI(url)
        uri.scheme == "https" && uri.host in setOf("matchapp.tv", "www.matchapp.tv") &&
            uri.userInfo == null && uri.port == -1 && uri.rawPath in documents &&
            (uri.rawQuery.isNullOrEmpty() || uri.rawQuery.split('&').all { it.substringBefore('=') in parameters })
    }.getOrDefault(false)

    fun delayMillis(url: String, method: String, status: Int, retryAfter: String?, attempts: Int, now: Long): Long? {
        if (method != "GET" || status !in setOf(429, 503) || attempts !in 0..1 || !publicDocument(url)) return null
        val fallback = 1_000L shl attempts
        val header = retryAfter?.trim().orEmpty()
        if (header.isEmpty()) return fallback
        val seconds = if (header.matches(Regex("[+-]?[0-9]+"))) header.toLongOrNull() ?: return null else null
        val requested = if (seconds != null) {
            if (seconds < 0 || seconds > 30) return null
            seconds * 1_000L
        } else runCatching {
            val date = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.US).apply { isLenient = false }.parse(header)
            (date?.time ?: return null) - now
        }.getOrNull() ?: return fallback
        // Do not retry sooner than the server asks or hold the UI indefinitely.
        if (requested > 30_000L) return null
        return maxOf(fallback, requested)
    }
}
