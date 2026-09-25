package com.jonas.papercup

import android.net.Uri
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream

/**
 * The Play listing is ad-free. Block AdSense, DoubleClick and companion
 * ad scripts even if a page still contains leftover slots.
 */
object AdBlocker {
    private val empty by lazy {
        WebResourceResponse(
            "text/plain",
            "utf-8",
            ByteArrayInputStream(ByteArray(0))
        )
    }

    private val hosts = listOf(
        "pagead2.googlesyndication.com",
        "googleads.g.doubleclick.net",
        "tpc.googlesyndication.com",
        "partner.googleadservices.com",
        "www.googleadservices.com",
        "googleadservices.com",
        "adservice.google.com",
        "adservice.google.com.br",
        "doubleclick.net",
        "googlesyndication.com",
        "googletagservices.com",
        "fundingchoicesmessages.google.com",
        "pagead2.googleadservices.com",
        "ads.google.com",
        "securepubads.g.doubleclick.net",
        "static.doubleclick.net",
        "ad.doubleclick.net"
    )

    private val pathHints = listOf(
        "/ads-serve.js",
        "/ads-init.js",
        "adsbygoogle.js",
        "/pagead/",
        "/adsense/"
    )

    fun intercept(url: String?): WebResourceResponse? {
        if (url.isNullOrBlank()) return null
        val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return null
        val host = (uri.host ?: "").lowercase()
        if (host.isNotEmpty() && hosts.any { host == it || host.endsWith(".$it") }) {
            return empty
        }
        val full = url.lowercase()
        if (pathHints.any { full.contains(it) }) return empty
        return null
    }
}
