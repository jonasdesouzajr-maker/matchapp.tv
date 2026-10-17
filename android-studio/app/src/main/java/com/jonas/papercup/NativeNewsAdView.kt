package com.jonas.papercup

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdView
import java.util.Locale
import kotlin.math.min
import kotlin.math.roundToInt

/** All creative assets and attribution stay inside the SDK view; all ad taps belong to the SDK. */
internal object NativeNewsAdView {
    fun cardBackground(context: Context): GradientDrawable = GradientDrawable().apply {
        val density = context.resources.displayMetrics.density
        setColor(Color.rgb(24, 24, 33))
        cornerRadius = 14 * density
        setStroke(density.roundToInt().coerceAtLeast(1), Color.rgb(181, 149, 75))
    }

    fun create(context: Context, ad: NativeAd, language: String, widthPx: Int, heightPx: Int): NativeAdView? {
        if (language !in NativeNewsPolicy.languages || ad.headline.isNullOrBlank() ||
            ad.callToAction.isNullOrBlank() || ad.headline.orEmpty().length > 400 ||
            ad.callToAction.orEmpty().length > 100) return null
        val density = context.resources.displayMetrics.density
        fun dp(value: Int) = (value * density).roundToInt()
        val locale = Locale.forLanguageTag(language)
        val attributionResource = when (language) {
            "en" -> R.string.native_news_sponsored_en
            "pt" -> R.string.native_news_sponsored_pt
            "es" -> R.string.native_news_sponsored_es
            "fr" -> R.string.native_news_sponsored_fr
            "de" -> R.string.native_news_sponsored_de
            "it" -> R.string.native_news_sponsored_it
            "tr" -> R.string.native_news_sponsored_tr
            "ru" -> R.string.native_news_sponsored_ru
            "ar" -> R.string.native_news_sponsored_ar
            "hi" -> R.string.native_news_sponsored_hi
            "id" -> R.string.native_news_sponsored_id
            "ja" -> R.string.native_news_sponsored_ja
            "ko" -> R.string.native_news_sponsored_ko
            "zh" -> R.string.native_news_sponsored_zh
            else -> return null
        }
        val native = NativeAdView(context).apply {
            layoutDirection = if (language == "ar") View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
            isClickable = false
            clipToPadding = false
        }
        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            // Together with the outer 8dp SDK inset this matches the news card's 16dp padding.
            setPadding(dp(8), dp(8), dp(8), dp(8))
            isClickable = false
        }
        native.addView(column, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        fun text(size: Float, bold: Boolean = false) = TextView(context).apply {
            textSize = size
            textLocale = locale
            setTextColor(Color.rgb(248, 248, 252))
            typeface = if (bold) Typeface.create("sans-serif", Typeface.BOLD) else Typeface.create("sans-serif", Typeface.NORMAL)
            textDirection = View.TEXT_DIRECTION_LOCALE
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
        }
        val attributionRow = FrameLayout(context)
        val attribution = text(12f, true).apply {
            text = context.getString(attributionResource)
            minWidth = dp(24)
            minHeight = dp(24)
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = GradientDrawable().apply {
                setColor(Color.rgb(53, 48, 33))
                cornerRadius = dp(6).toFloat()
            }
        }
        attributionRow.addView(attribution, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.START
        ).apply { marginEnd = dp(32) })
        // Always leave a clear logical-end corner for the SDK-generated AdChoices icon.
        column.addView(attributionRow, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            height = ViewGroup.LayoutParams.WRAP_CONTENT
            bottomMargin = dp(12)
        })
        attributionRow.minimumHeight = dp(32)

        val headlineRow = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val icon = ad.icon
        if (icon != null) {
            val drawable = icon.drawable
            if (drawable == null) { native.destroy(); return null }
            val image = ImageView(context).apply {
                setImageDrawable(drawable)
                scaleType = ImageView.ScaleType.FIT_CENTER
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }
            headlineRow.addView(image, LinearLayout.LayoutParams(dp(48), dp(48)).apply { marginEnd = dp(12) })
            native.iconView = image
        }
        val headline = text(18f, true).apply { text = ad.headline }
        headlineRow.addView(headline, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        column.addView(headlineRow, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        native.headlineView = headline

        val media = ad.mediaContent
        if (media != null) {
            val mediaWidth = min(widthPx - dp(16), dp(320))
            val mediaHeight = (mediaWidth * 9.0 / 16.0).roundToInt()
            if (media.hasVideoContent() && (mediaWidth < dp(120) || mediaHeight < dp(120) || mediaWidth < 256)) {
                native.destroy()
                return null
            }
            val mediaView = MediaView(context).apply {
                setImageScaleType(ImageView.ScaleType.FIT_CENTER)
                mediaContent = media
            }
            column.addView(mediaView, LinearLayout.LayoutParams(mediaWidth, mediaHeight).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = dp(16)
            })
            native.mediaView = mediaView
        }

        val cta = Button(context).apply {
            text = ad.callToAction
            textLocale = locale
            textDirection = View.TEXT_DIRECTION_LOCALE
            textSize = 16f
            setTextColor(Color.WHITE)
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            isAllCaps = false
            minHeight = dp(52)
            minimumHeight = dp(52)
            setPadding(dp(16), dp(12), dp(16), dp(12))
            background = GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.rgb(83, 45, 151), Color.rgb(108, 67, 155))).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(dp(1).coerceAtLeast(1), Color.rgb(214, 183, 98))
            }
        }
        column.addView(cta, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(16)
        })
        native.callToActionView = cta

        // Full advertiser text is measured at the user's font scale. Never truncate a required asset to force a fit.
        native.measure(View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.AT_MOST))
        column.measure(View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
        if (column.measuredHeight > heightPx) {
            native.destroy()
            return null
        }
        native.setNativeAd(ad)
        return native
    }
}
