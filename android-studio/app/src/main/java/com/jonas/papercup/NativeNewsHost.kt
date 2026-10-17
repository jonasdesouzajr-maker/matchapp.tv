package com.jonas.papercup

import android.content.Context
import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.webkit.WebView
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * SDK assets own taps. Only an actual vertical drag beyond Android's touch slop
 * transfers to the reserved, non-interactive web slot so a card cannot trap page scrolling.
 */
internal class NativeNewsHost(context: Context) : FrameLayout(context) {
    private var web: WebView? = null
    private var onDrag: (() -> Unit)? = null
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var down: MotionEvent? = null
    var forwardingDrag = false
        private set

    fun attachScrollTarget(value: WebView, callback: () -> Unit) { web = value; onDrag = callback }

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                clearDown()
                down = MotionEvent.obtain(event)
            }
            MotionEvent.ACTION_MOVE -> {
                val start = down
                if (start != null && web != null && event.pointerCount == 1 &&
                    abs(event.y - start.y) > touchSlop && abs(event.y - start.y) > abs(event.x - start.x)) {
                    forwardingDrag = true
                    // ViewGroup delivers ACTION_CANCEL to the SDK child before this drag is handled.
                    return true
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> clearDown()
        }
        return false
    }

    // This non-accessible host handles only scrolling; SDK children retain every click/accessibility action.
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!forwardingDrag) return false
        down?.let { start ->
            forward(start)
            clearDown()
            onDrag?.invoke()
        }
        forward(event)
        if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
            forwardingDrag = false
            visibility = INVISIBLE
        }
        return true
    }

    private fun forward(event: MotionEvent) {
        val target = web ?: return
        val hostPosition = IntArray(2)
        val webPosition = IntArray(2)
        getLocationOnScreen(hostPosition)
        target.getLocationOnScreen(webPosition)
        val translated = MotionEvent.obtain(event)
        translated.offsetLocation((hostPosition[0] - webPosition[0]).toFloat(), (hostPosition[1] - webPosition[1]).toFloat())
        target.dispatchTouchEvent(translated)
        translated.recycle()
    }

    private fun clearDown() { down?.recycle(); down = null }

    override fun onDetachedFromWindow() {
        clearDown()
        forwardingDrag = false
        super.onDetachedFromWindow()
    }
}
