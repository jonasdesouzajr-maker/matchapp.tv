package com.jonas.papercup

import java.net.URI
import java.net.URLDecoder
import java.security.MessageDigest

/** Startup decisions use the installed package, never a website release or click. */
internal object NativeLaunchPolicy {
    enum class VoicePermissionAction { START, REQUEST, DENY }

    fun voicePermissionAction(granted: Boolean, setupComplete: Boolean): VoicePermissionAction = when {
        granted -> VoicePermissionAction.START
        setupComplete -> VoicePermissionAction.DENY
        else -> VoicePermissionAction.REQUEST
    }

    /** Remember a consumed launch without saving an OAuth callback's contents. */
    fun launchIntentFingerprint(action: String?, data: String?): String? {
        if (data.isNullOrBlank()) return null
        return MessageDigest.getInstance("SHA-256")
            .digest((action.orEmpty() + '\u0000' + data).toByteArray(Charsets.UTF_8))
            .joinToString("") { (it.toInt() and 0xff).toString(16).padStart(2, '0') }
    }

    fun shouldRestoreSavedScreen(savedLaunch: String?, currentLaunch: String?): Boolean =
        currentLaunch == null || currentLaunch == savedLaunch

    /** A new explicit app link always wins over an old disk checkpoint. */
    fun checkpointFallbackUrl(savedUrl: String?, currentLaunch: String?, checkpoint: String?): String? =
        if (restorableUrl(savedUrl) == null && currentLaunch == null) checkpointUrl(checkpoint) else null

    /** Durable state contains presentation identifiers, never arbitrary URL parameters. */
    fun checkpointUrl(value: String?): String? {
        val safe = restorableUrl(value) ?: return null
        val uri = URI(safe)
        val path = uri.normalize().path.orEmpty().ifEmpty { "/" }
        if (path.contains('%') || path.lowercase().split('/').any {
                it in setOf("api", "auth", "oauth", "private", "private-voice", "logout", "signout") ||
                    it in setOf("reset-password.html", "reset.html", "login.html", "signup.html", "signin.html", "billing-check.html")
            }) return null
        val languages = setOf("en", "pt", "pt-BR", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "id", "ja", "ko", "zh")
        val tabs = setOf("history", "watchlater", "seenit", "audio", "notforme", "activity", "profile", "settings", "saved", "seen", "favorites")
        val query = uri.rawQuery.orEmpty().split('&').mapNotNull { part ->
            val pair = part.split('=', limit = 2)
            if (pair.size != 2) return@mapNotNull null
            val key = runCatching { URLDecoder.decode(pair[0], "UTF-8") }.getOrNull() ?: return@mapNotNull null
            val entry = runCatching { URLDecoder.decode(pair[1], "UTF-8") }.getOrNull() ?: return@mapNotNull null
            when {
                key == "lang" && entry in languages -> "$key=$entry"
                key == "tab" && entry in tabs -> "$key=$entry"
                key == "appBuild" && entry.matches(Regex("[0-9]{1,9}")) -> "$key=$entry"
                key == "utm_source" && entry == "android_app" -> "$key=$entry"
                else -> null
            }
        }.distinct().joinToString("&").ifEmpty { null }
        val fragment = uri.fragment?.takeIf {
            it.matches(Regex("chapter-[0-9]{1,2}")) || it in setOf("home", "explore", "questionnaire-box", "tab-watchlater",
                "tab-history", "tab-seenit", "tab-audio", "tab-notforme", "tab-seen", "tab-favorites", "history", "activity-panel", "profile", "settings", "main-content")
        }
        return URI("https", null, uri.host, uri.port, path, query, fragment).toASCIIString()
    }

    /** A safe current page must not cause earlier authentication URLs to be saved. */
    fun canSaveHistory(urls: List<String?>): Boolean =
        urls.isNotEmpty() && urls.all { restorableUrl(it) != null }

    fun canUseApproximateLocation(origin: String?, currentPage: String?, permissionGranted: Boolean): Boolean {
        if (!permissionGranted || origin.isNullOrBlank() || restorableUrl(currentPage) == null) return false
        val uri = runCatching { URI(origin) }.getOrNull() ?: return false
        return uri.scheme == "https" && uri.host in setOf("matchapp.tv", "www.matchapp.tv") &&
            uri.userInfo == null && uri.port in setOf(-1, 443) && uri.path.orEmpty() in setOf("", "/") &&
            uri.rawQuery == null && uri.rawFragment == null
    }

    fun shouldPlayIntro(
        installedVersion: Int,
        consumedVersion: Int,
        legacySeen: Boolean,
        registered: Boolean,
        installedByPlay: Boolean,
        packageWasUpdated: Boolean
    ): Boolean {
        if (installedVersion <= 0 || consumedVersion >= installedVersion) return false
        if (consumedVersion > 0) return installedByPlay
        // Migrate a returning installation without replaying on an ordinary reopen.
        if (legacySeen || registered) return installedByPlay && packageWasUpdated
        return true
    }

    /** Authentication/payment callbacks and foreign origins are not restorable app screens. */
    fun restorableUrl(value: String?): String? {
        if (value.isNullOrBlank() || value.length > 4096) return null
        val uri = runCatching { URI(value) }.getOrNull() ?: return null
        if (uri.scheme != "https" || uri.host !in setOf("matchapp.tv", "www.matchapp.tv") ||
            uri.userInfo != null || uri.port !in setOf(-1, 443)) return null
        val path = uri.normalize().path.orEmpty().lowercase()
        if (path.split('/').any { it == "." || it == ".." }) return null
        if (path == "/kids" || path.startsWith("/kids/") ||
            path.startsWith("/oauth") || path.startsWith("/private-voice") ||
            path in setOf("/callback.html", "/confirm.html", "/auth-confirmation.html", "/purchase.html")) return null
        val identity = runCatching {
            URLDecoder.decode(uri.rawQuery.orEmpty() + "&" + uri.rawFragment.orEmpty(), "UTF-8")
        }.getOrNull() ?: return null
        if (Regex("(?:^|&)(?:access_token|refresh_token|code|token|token_hash|session_id)=", RegexOption.IGNORE_CASE)
                .containsMatchIn(identity)) return null
        return value
    }
}
