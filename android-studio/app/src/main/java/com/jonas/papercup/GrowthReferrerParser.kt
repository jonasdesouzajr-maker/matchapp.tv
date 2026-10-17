package com.jonas.papercup

import java.net.URLDecoder
import java.net.URLEncoder

/** Accept only our own, bounded recommendation context. Never accepts login credentials or arbitrary destinations. */
internal object GrowthReferrerParser {
    private val languages = setOf("en", "pt-BR", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "id", "ja", "ko", "zh")
    private val token = Regex("^[a-f0-9]{64}$")
    private val titlePath = Regex("^(?:/where-to-watch/[a-z0-9]+(?:-[a-z0-9]+)*/|/(?:en/(?:br|us|gb|pt)|pt/br)/watch/(?:movie|series)/[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*/)$")
    private val criteriaKeys = setOf("category", "mood", "platform", "genre", "vibe", "decade", "rating")
    private val criteriaChoice = Regex("^[A-Za-z0-9 &+./_-]{1,64}$")

    /** Only prefill choices; the web confirmation remains responsible for applying them. */
    private fun oneMatchDestination(values: Map<String, String>, query: String): String? {
        val criteria = values["criteria"]?.takeIf { it.isNotBlank() && it.length <= 2400 } ?: return null
        val pairs = criteria.split('&')
        if (pairs.size > criteriaKeys.size) return null
        val seen = mutableSetOf<String>()
        try {
            for (pair in pairs) {
                val parts = pair.split('=', limit = 2)
                val key = URLDecoder.decode(parts[0], "UTF-8")
                val value = URLDecoder.decode(parts.getOrElse(1) { "" }, "UTF-8")
                if (key !in criteriaKeys || !seen.add(key)) return null
                val choices = if (value.isEmpty()) emptyList() else value.split('|')
                if (choices.size > 40 || choices.distinct().size != choices.size ||
                    choices.any { !criteriaChoice.matches(it) }) return null
            }
        } catch (_: IllegalArgumentException) { return null }
        val resumeQuery = if (query.isEmpty()) "?app_resume=1" else "$query&app_resume=1"
        val fragment = URLEncoder.encode(criteria, "UTF-8").replace("+", "%20")
        return "https://matchapp.tv/$resumeQuery#ma-continue=$fragment"
    }

    fun destination(raw: String?): String? {
        if (raw.isNullOrBlank() || raw.length > 4096) return null
        val pairs = raw.split('&')
        if (pairs.size > 12) return null
        val values = mutableMapOf<String, String>()
        try {
            for (pair in pairs) {
                val parts = pair.split('=', limit = 2)
                val key = URLDecoder.decode(parts[0], "UTF-8")
                val value = URLDecoder.decode(parts.getOrElse(1) { "" }, "UTF-8")
                if (values.containsKey(key)) return null
                values[key] = value
            }
        } catch (_: IllegalArgumentException) { return null }
        if (values["utm_source"] != "matchapp_tv" || values["utm_medium"] != "web_to_app") return null
        val language = values["lang"]?.takeIf { it in languages }
        val query = language?.let { "?lang=" + URLEncoder.encode(it, "UTF-8") }.orEmpty()
        return when (values["utm_campaign"]) {
            "one_match_after_aha" -> oneMatchDestination(values, query)
            "together_after_aha" -> values["resume"]?.takeIf { token.matches(it) }
                ?.let { "https://matchapp.tv/together.html${query}#resume=$it" }
            "title_after_aha" -> values["path"]?.takeIf {
                titlePath.matches(it) && it != "/where-to-watch/availability-methodology/"
            }?.let { path ->
                val country = values["country"]?.takeIf { Regex("^[A-Z]{2}$").matches(it) }
                "https://matchapp.tv$path$query" + country?.let { "#availability-${it.lowercase()}" }.orEmpty()
            }
            else -> null
        }
    }
}
