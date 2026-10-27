package tv.matchapp.shared

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** A single in-flow native notice. No message text is passed to diagnostics. */
class NativeErrorNotice(
    private val context: Context,
    anchor: View,
    private val closeLabel: () -> String,
    private val onError: () -> Unit
) {
    private fun dp(value: Int) = (value * context.resources.displayMetrics.density).toInt()
    private val row = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.TOP
        setPadding(dp(12), dp(12), dp(12), dp(12))
        background = GradientDrawable().apply {
            setColor(Color.rgb(33, 28, 44))
            cornerRadius = dp(16).toFloat()
            setStroke(dp(1).coerceAtLeast(1), Color.rgb(215, 183, 117))
        }
        visibility = View.GONE
    }
    private val copy = TextView(context).apply {
        setTextColor(Color.rgb(244, 215, 164))
        textSize = 16f
        setPadding(0, 0, dp(8), 0)
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
        accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
    }
    private val retry = Button(context).apply {
        isAllCaps = false
        textSize = 16f
        setTextColor(Color.rgb(33, 18, 10))
        backgroundTintList = null
        background = GradientDrawable().apply { setColor(Color.rgb(230, 195, 106)); cornerRadius = dp(24).toFloat() }
        minHeight = dp(48)
        visibility = View.GONE
    }
    private val close = Button(context).apply {
        text = "×"
        backgroundTintList = null
        background = GradientDrawable().apply { setColor(Color.rgb(51, 43, 73)); cornerRadius = dp(24).toFloat(); setStroke(dp(1).coerceAtLeast(1), Color.rgb(215, 183, 117)) }
        textSize = 24f
        minWidth = dp(48)
        minHeight = dp(48)
        setPadding(0, 0, 0, 0)
        setTextColor(Color.rgb(244, 215, 164))
        setOnClickListener { hide() }
    }
    init {
        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(copy, LinearLayout.LayoutParams(-1, -2))
            addView(retry, LinearLayout.LayoutParams(-1, -2))
        }
        val scroll = object : ScrollView(context) {
            override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
                val available = anchor.rootView.height.takeIf { it > 0 } ?: dp(480)
                val cap = minOf(dp(160), (available * .35f).toInt()).coerceAtLeast(dp(48))
                super.onMeasure(widthMeasureSpec, MeasureSpec.makeMeasureSpec(cap, MeasureSpec.AT_MOST))
            }
        }.apply { addView(content); isFillViewport = false }
        row.addView(scroll, LinearLayout.LayoutParams(0, -2, 1f))
        row.addView(close, LinearLayout.LayoutParams(dp(48), dp(48)))
        val parent = anchor.parent as ViewGroup
        val host = if (parent is LinearLayout && parent.orientation == LinearLayout.VERTICAL) parent else {
            val index = parent.indexOfChild(anchor)
            val original = anchor.layoutParams
            parent.removeView(anchor)
            LinearLayout(context).apply {
                // The standalone Kids wrapper draws edge-to-edge; reserve system bars here.
                // Adult already owns insets on its existing vertical ad shell.
                fitsSystemWindows = true
                orientation = LinearLayout.VERTICAL
                addView(anchor, LinearLayout.LayoutParams(-1, 0, 1f))
                parent.addView(this, index, original)
            }
        }
        host.addView(row, 0, LinearLayout.LayoutParams(-1, -2).apply { setMargins(dp(8), dp(8), dp(8), dp(8)) })
    }
    fun show(message: String, retryLabel: String? = null, action: (() -> Unit)? = null) {
        copy.text = message
        close.contentDescription = closeLabel()
        retry.text = retryLabel
        retry.visibility = if (action == null) View.GONE else View.VISIBLE
        retry.setOnClickListener { action?.invoke() }
        row.visibility = View.VISIBLE
        onError()
    }
    fun hide() {
        row.visibility = View.GONE
        copy.text = ""
        retry.setOnClickListener(null)
    }
}
