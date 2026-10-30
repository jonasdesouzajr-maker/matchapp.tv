package com.jonas.papercup

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.provider.Settings
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView

/** Owner-supplied company artwork, shown intact before the original video soundtrack. */
internal class StudioPreludeView(context: Context) : FrameLayout(context) {
    private val motionEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ValueAnimator.areAnimatorsEnabled()
    } else {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    }
    private val artwork = ImageView(context).apply {
        setImageResource(R.drawable.adv_dev_ops_studio)
        scaleType = ImageView.ScaleType.FIT_CENTER
        adjustViewBounds = true
        contentDescription = context.getString(R.string.studio_identity)
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    }
    private var completion: (() -> Unit)? = null
    private val finishFade = Runnable { finishCard() }
    private val beginFade = Runnable {
        if (completion != null) {
            if (motionEnabled) animate().alpha(0f).setDuration(340L)
                .withEndAction { finishCard() }.start()
            else finishCard()
        }
    }

    init {
        setBackgroundColor(Color.rgb(6, 9, 12))
        isClickable = true
        // Keep the entire portrait artwork visible in every orientation and reserve Skip space.
        applySafeInsets(0, 0, 0, 0)
        addView(artwork, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    fun play(onFinished: () -> Unit) {
        dispose()
        completion = onFinished
        if (motionEnabled) {
            artwork.alpha = 0f
            artwork.scaleX = 0.98f
            artwork.scaleY = 0.98f
            artwork.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(650L)
                .setInterpolator(DecelerateInterpolator()).start()
        }
        postDelayed(beginFade, 2500L)
        // Independent of animation completion or the system's animation-duration scale.
        postDelayed(finishFade, 3000L)
    }

    fun applySafeInsets(left: Int, top: Int, right: Int, bottom: Int) {
        setPadding(dp(16) + left, dp(16) + top, dp(16) + right, dp(72) + bottom)
    }

    fun dispose() {
        completion = null
        removeCallbacks(beginFade)
        removeCallbacks(finishFade)
        animate().withEndAction(null).cancel()
        artwork.animate().cancel()
    }

    private fun finishCard() {
        val callback = completion ?: return
        dispose()
        callback()
    }

    override fun onDetachedFromWindow() {
        dispose()
        super.onDetachedFromWindow()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
