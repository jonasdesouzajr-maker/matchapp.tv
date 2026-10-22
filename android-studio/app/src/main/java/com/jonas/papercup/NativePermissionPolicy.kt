package com.jonas.papercup

import java.net.URI
import java.util.Locale

/** Pure policy for the optional native permission message endpoint. */
internal object NativePermissionPolicy {
    private val hosts = setOf("matchapp.tv", "www.matchapp.tv")

    private fun parse(raw: String?): URI? =
        raw?.let { runCatching { URI(it) }.getOrNull() }

    private fun allowedOrigin(uri: URI): Boolean =
        uri.scheme.equals("https", ignoreCase = true) &&
            (uri.host?.lowercase(Locale.ROOT) ?: "") in hosts &&
            uri.port in setOf(-1, 443) && uri.rawUserInfo == null

    fun allowsCaller(sourceOrigin: String, currentUrl: String?, mainFrame: Boolean): Boolean {
        if (!mainFrame) return false
        val origin = parse(sourceOrigin) ?: return false
        val current = parse(currentUrl) ?: return false
        if (!allowedOrigin(origin) || !allowedOrigin(current) ||
            !origin.host.equals(current.host, ignoreCase = true) ||
            origin.rawPath.orEmpty() !in setOf("", "/") ||
            origin.rawQuery != null || origin.rawFragment != null) return false
        val path = runCatching {
            URI(null, null, "/" + current.path.orEmpty().trimStart('/'), null).normalize().path
        }.getOrNull()?.lowercase(Locale.ROOT)?.trim('/') ?: return false
        return path != "kids" && !path.startsWith("kids/")
    }

    data class RequestState(
        val resumed: Boolean,
        val focused: Boolean,
        val pageReady: Boolean,
        val overlayShowing: Boolean,
        val requestPending: Boolean,
        val microphonePending: Boolean,
        val terminating: Boolean,
        val lastInteractionAt: Long
    )

    fun allowsRequest(state: RequestState, now: Long): Boolean =
        state.resumed && state.focused && state.pageReady && !state.overlayShowing &&
            !state.requestPending && !state.microphonePending && !state.terminating &&
            state.lastInteractionAt > 0L && now >= state.lastInteractionAt &&
            now - state.lastInteractionAt <= 1500L
}
