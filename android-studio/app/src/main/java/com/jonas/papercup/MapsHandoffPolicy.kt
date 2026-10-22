package com.jonas.papercup

import java.net.URI
import java.net.URLDecoder

/**
 * Pure routing policy for the cinema Google Maps handoff.
 * Returns a canonical https destination, or null when the URL is not an approved Maps target.
 * intent: URIs contribute only their https destination or browser fallback; package,
 * component, selector, action, extras and flags are never read or forwarded.
 */
internal object MapsHandoffPolicy {
    private const val MAX_LENGTH = 8192
    private val GOOGLE_HOSTS = setOf("www.google.com", "google.com")
    private const val MAPS_HOST = "maps.google.com"
    private const val MAPS_PACKAGE = "com.google.android.apps.maps"

    fun canonicalDestination(raw: String?): String? {
        if (raw.isNullOrBlank() || raw.length > MAX_LENGTH) return null
        return if (raw.regionMatches(0, "intent:", 0, 7, ignoreCase = true)) approvedMapsUrlFromIntent(raw) else canonicalHttps(raw)
    }

    fun isGoogleMapsDestination(raw: String?): Boolean = canonicalHttps(raw) != null

    fun canonicalHttps(raw: String?): String? {
        if (raw.isNullOrEmpty() || raw.length > MAX_LENGTH) return null
        if (raw.any { it.code <= 32 || it.code == 127 || it == '\\' }) return null
        val uri = runCatching { URI(raw) }.getOrNull() ?: return null
        if (uri.isOpaque || !uri.scheme.equals("https", ignoreCase = true)) return null
        if (uri.rawUserInfo != null || (uri.port != -1 && uri.port != 443)) return null
        val host = uri.host?.lowercase() ?: return null
        val authority = uri.rawAuthority?.lowercase() ?: return null
        if (authority != host && authority != "$host:443") return null
        val path = uri.rawPath.orEmpty()
        if (runCatching { uri.normalize().rawPath }.getOrNull() != path) return null
        val approved = when (host) {
            MAPS_HOST -> true
            in GOOGLE_HOSTS -> path == "/maps" || path.startsWith("/maps/") ||
                ((path.isEmpty() || path == "/") && uri.rawQuery?.split('&')?.contains("api=1") == true)
            else -> false
        }
        if (!approved) return null
        val query = uri.rawQuery?.let { "?$it" }.orEmpty()
        return "https://$host$path$query"
    }

    fun approvedMapsUrlFromIntent(raw: String): String? {
        val marker = raw.indexOf("#Intent;")
        if (marker < 0 || !raw.endsWith(";end")) return null
        val target = raw.substring("intent:".length, marker)
        val params = raw.substring(marker + "#Intent;".length, raw.length - "end".length)
            .split(';').filter { it.isNotEmpty() }
        var scheme: String? = null
        var fallback: String? = null
        var pkg: String? = null
        for (param in params) {
            val pair = param.split('=', limit = 2)
            if (pair.size != 2) continue
            when (pair[0]) {
                "scheme" -> scheme = pair[1]
                "S.browser_fallback_url" -> fallback = pair[1]
                "package" -> pkg = pair[1]
            }
        }
        // Prefer a validated browser fallback; package is only a gate, never forwarded.
        val decoded = fallback?.let { runCatching { URLDecoder.decode(it, "UTF-8") }.getOrNull() }
        canonicalHttps(decoded)?.let { return it }
        if (scheme == "https" && pkg == MAPS_PACKAGE && target.startsWith("//")) return canonicalHttps("https:$target")
        return null
    }
}
