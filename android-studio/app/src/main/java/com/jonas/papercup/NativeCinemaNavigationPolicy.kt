package com.jonas.papercup

import java.net.URI
import java.net.URLDecoder

/** Only the adult cinema action's official HTTPS Maps search leaves this route. */
internal object NativeCinemaNavigationPolicy {
    fun isSearchUrl(value: String?): Boolean {
        if (value.isNullOrBlank() || value.length > 8192) return false
        val uri = runCatching { URI(value) }.getOrNull() ?: return false
        if (!uri.scheme.equals("https", ignoreCase = true) ||
            uri.host?.lowercase() !in setOf("www.google.com", "google.com") ||
            uri.rawUserInfo != null || uri.port !in setOf(-1, 443) || uri.rawFragment != null ||
            uri.rawPath !in setOf("/maps/search", "/maps/search/")) return false
        val parameters = uri.rawQuery?.split('&') ?: return false
        if (parameters.size != 2) return false
        val values = mutableMapOf<String, String>()
        for (parameter in parameters) {
            val pair = parameter.split('=', limit = 2)
            if (pair.size != 2 || pair[0] !in setOf("api", "query") || values.containsKey(pair[0])) return false
            val decoded = runCatching { URLDecoder.decode(pair[1], "UTF-8") }.getOrNull() ?: return false
            if (decoded.any { it.code < 32 || it.code == 127 }) return false
            values[pair[0]] = decoded
        }
        return values["api"] == "1" && !values["query"].isNullOrBlank()
    }
}
