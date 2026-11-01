package com.jonas.papercup

import java.net.URI
import kotlin.math.abs

/** Only geometry and language cross this boundary; HTML never supplies an ad asset or URL. */
internal object NativeNewsPolicy {
    const val HEIGHT_CSS = 480
    const val CONTENT_HEIGHT_CSS = 360
    const val MIN_WIDTH_CSS = 280
    const val MAX_WIDTH_CSS = 640
    const val SAFE_INSET_CSS = 8
    const val MAX_SAMPLE_AGE_MS = 750L
    val languages = setOf("en", "pt", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "id", "ja", "ko", "zh")
    private val idPattern = Regex("^[A-Za-z0-9_-]{16,64}$")
    private val accountPattern = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
    private val adPaths = setOf("/", "/index.html", "/ebooks/", "/ebooks/index.html",
        "/news/", "/news/index.html", "/explore.html")

    data class Bounds(val x: Double, val y: Double, val width: Double, val height: Double)
    data class Viewport(val width: Double, val height: Double, val offsetX: Double, val offsetY: Double, val scale: Double)

    fun validRequestId(value: String): Boolean = idPattern.matches(value)
    fun validAccount(value: String): Boolean = value == "guest" || accountPattern.matches(value)
    // Native content placements have their own exact route boundary. Adding Explore
    // here must not enable rewarded requests on that destination.
    fun isAdDocument(value: String): Boolean = RewardedRequestPolicy.isFirstPartyOrigin(value) && runCatching {
        val uri = URI(value)
        uri.rawPath == uri.path && uri.path.orEmpty() in adPaths
    }.getOrDefault(false)
    fun isReporterDocument(value: String): Boolean = isAdDocument(value)
    fun isNewsDocument(value: String): Boolean = isReporterDocument(value) && runCatching {
        URI(value).path in setOf("/news/", "/news/index.html")
    }.getOrDefault(false)
    fun heightCss(value: String): Int? = if (!isAdDocument(value)) null
        else if (isNewsDocument(value)) HEIGHT_CSS else CONTENT_HEIGHT_CSS

    fun validSample(rect: Bounds, viewport: Viewport): Boolean = validSampleForHeight(rect, viewport, HEIGHT_CSS)
    fun validSample(rect: Bounds, viewport: Viewport, documentUrl: String): Boolean =
        heightCss(documentUrl)?.let { validSampleForHeight(rect, viewport, it) } ?: false

    private fun validSampleForHeight(rect: Bounds, viewport: Viewport, expectedHeightCss: Int): Boolean =
        listOf(rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height,
            viewport.offsetX, viewport.offsetY, viewport.scale).all { it.isFinite() } &&
            viewport.width in 280.0..4096.0 && viewport.height in 200.0..4096.0 &&
            abs(viewport.scale - 1.0) <= 0.005 && abs(viewport.offsetX) <= 0.5 && abs(viewport.offsetY) <= 0.5 &&
            rect.width in MIN_WIDTH_CSS.toDouble()..MAX_WIDTH_CSS.toDouble() &&
            abs(rect.height - expectedHeightCss) <= 0.5 && abs(rect.x) <= 100_000 && abs(rect.y) <= 100_000

    fun fullyVisible(rect: Bounds, viewport: Viewport): Boolean = fullyVisibleForHeight(rect, viewport, HEIGHT_CSS)
    fun fullyVisible(rect: Bounds, viewport: Viewport, documentUrl: String): Boolean =
        heightCss(documentUrl)?.let { fullyVisibleForHeight(rect, viewport, it) } ?: false

    private fun fullyVisibleForHeight(rect: Bounds, viewport: Viewport, expectedHeightCss: Int): Boolean =
        validSampleForHeight(rect, viewport, expectedHeightCss) &&
        rect.x >= SAFE_INSET_CSS && rect.y >= SAFE_INSET_CSS &&
        rect.x + rect.width <= viewport.width - SAFE_INSET_CSS &&
        rect.y + rect.height <= viewport.height - SAFE_INSET_CSS

    fun stable(previous: Bounds, current: Bounds): Boolean =
        abs(previous.x - current.x) <= 0.5 && abs(previous.y - current.y) <= 0.5 &&
            abs(previous.width - current.width) <= 0.5 && abs(previous.height - current.height) <= 0.5

    fun fresh(sampleAt: Long, now: Long): Boolean = now >= sampleAt && now - sampleAt <= MAX_SAMPLE_AGE_MS

    fun matchesNativeViewport(viewport: Viewport, widthPx: Int, heightPx: Int, density: Float): Boolean =
        widthPx > 0 && heightPx > 0 && density.isFinite() && density > 0 &&
            abs(viewport.width * density - widthPx) <= 2 * density &&
            abs(viewport.height * density - heightPx) <= 2 * density
}
