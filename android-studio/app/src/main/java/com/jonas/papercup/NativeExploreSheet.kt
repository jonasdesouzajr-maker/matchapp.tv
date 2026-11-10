package com.jonas.papercup

import android.animation.AnimatorInflater
import android.animation.ValueAnimator
import android.app.Dialog
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.provider.Settings
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.animation.DecelerateInterpolator
import android.view.accessibility.AccessibilityManager
import android.view.View
import android.view.ViewGroup.LayoutParams
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.google.android.material.card.MaterialCardView
import org.json.JSONObject
import kotlin.math.roundToInt

/** Explore opens instantly, even when the underlying document is still rendering. */
class NativeExploreSheet(private val context: Context) {
    private val copies by lazy {
        context.assets.open("native-explore.json").bufferedReader().use { JSONObject(it.readText()) }
    }
    private var dialog: Dialog? = null
    private fun dp(value: Int) = (value * context.resources.displayMetrics.density).roundToInt()
    private fun label(value: String, size: Float, bold: Boolean, color: Int) = TextView(context).apply {
        text = value
        textSize = size
        setTextColor(color)
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }

    fun close() { dialog?.dismiss() }

    fun show(lang: String, rtl: Boolean, exploreLabel: String, motion: Boolean, light: Boolean = false, select: (String, String) -> Unit) {
        if (dialog?.isShowing == true) return
        val selectedLanguage = NativeLaunchPolicy.appLanguageTag(lang)
        val code = selectedLanguage.substringBefore('-').lowercase(java.util.Locale.ROOT)
        val locale = when {
            selectedLanguage == "zh-TW" -> "zh-TW"
            code == "pt" -> "pt-BR"
            copies.has(code) -> code
            else -> "en"
        }
        val copy = copies.getJSONObject(locale)
        val textColor = if (light) 0xFF302735.toInt() else 0xFFFFF6EC.toInt()
        val mutedColor = if (light) 0xFF665B70.toInt() else 0xFFDFD3E3.toInt()
        val wide = context.resources.configuration.smallestScreenWidthDp >= 600
        val systemMotion = if (Build.VERSION.SDK_INT >= 26) ValueAnimator.areAnimatorsEnabled() else
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0
        val animate = motion && systemMotion &&
            !(context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager).isTouchExplorationEnabled
        val sheet = Dialog(context, android.R.style.Theme_Material_NoActionBar)
        dialog = sheet
        sheet.setOnDismissListener { if (dialog === sheet) dialog = null }
        val panel = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutDirection = if (rtl) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
            setPadding(dp(if (wide) 28 else 18), dp(if (wide) 24 else 10), dp(if (wide) 28 else 18), dp(24))
            ViewCompat.setAccessibilityPaneTitle(this, exploreLabel)
        }
        val scroll = ScrollView(context).apply { isFillViewport = true; clipToPadding = false }
        val backdrop = GradientDrawable(GradientDrawable.Orientation.TL_BR,
            if (light) intArrayOf(0xFFF3EDF6.toInt(),0xFFFFFDF9.toInt(),0xFFF7F3EE.toInt())
            else intArrayOf(0xFF3B284C.toInt(), 0xFF211B30.toInt(), 0xFF17151F.toInt()))
        scroll.background = backdrop
        val frame = FrameLayout(context)
        val width = minOf(dp(if (wide) 880 else 650), context.resources.displayMetrics.widthPixels)
        val split = wide && context.resources.configuration.screenWidthDp >= 720 && context.resources.configuration.fontScale <= 1.15f
        frame.addView(panel, FrameLayout.LayoutParams(width, LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
            topMargin = dp(if (wide) 56 else 20)
        })
        scroll.addView(frame)
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        val header = LinearLayout(context).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(ImageView(context).apply {
            setImageResource(R.mipmap.ic_launcher)
            elevation = dp(9).toFloat()
            outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            background = GradientDrawable().apply { setColor(0xFF271536.toInt()); cornerRadius = dp(19).toFloat() }
            clipToOutline = true
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(if (wide) 88 else 64),dp(if (wide) 88 else 64)).apply { marginEnd = dp(16) })
        val headings = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPaddingRelative(0,dp(12),dp(8),dp(12))
            addView(label("MatchApp Ai · $exploreLabel", 12f, true, if (light) 0xFF8C6021.toInt() else 0xFFF1D29A.toInt()))
            addView(label(copy.getString("heading"), if (wide) 28f else 20f, true, textColor))
        }
        header.addView(headings, LinearLayout.LayoutParams(0,LayoutParams.WRAP_CONTENT,1f))
        header.addView(ImageButton(context).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            setColorFilter(if (light) 0xFF93293F.toInt() else 0xFFEDDFEC.toInt())
            val value = android.util.TypedValue()
            context.theme.resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, value,true)
            setBackgroundResource(value.resourceId)
            contentDescription = copy.getString("close")
            setOnClickListener { close() }
        }, LinearLayout.LayoutParams(dp(48),dp(48)))
        panel.addView(header, LinearLayout.LayoutParams(-1,-2).apply { bottomMargin = dp(16) })
        var cardIndex = 0
        fun card(key: String, titleKey: String, hintKey: String?, icon: Int, color: Int,
                 host: LinearLayout = panel, tile: Boolean = false, primary: Boolean = false) {
            val title = copy.getString(titleKey)
            val hint = hintKey?.let(copy::getString)
            val item = MaterialCardView(context).apply {
                radius = dp(if (wide) 21 else 16).toFloat()
                cardElevation = dp(6).toFloat()
                cameraDistance = 9000 * context.resources.displayMetrics.density
                if (animate) stateListAnimator = AnimatorInflater.loadStateListAnimator(context, R.animator.explore_press_depth)
                setCardBackgroundColor(if (light) when(key) {
                    "matches" -> 0xFFF3E6D7.toInt()
                    "tech" -> 0xFFEDE4F5.toInt()
                    "trail" -> 0xFFE2EFEB.toInt()
                    else -> 0xFFF0EBF2.toInt()
                } else color)
                strokeWidth = 0
                rippleColor = ColorStateList.valueOf(0x44FFF0CC)
                isClickable = true
                isFocusable = true
                contentDescription = listOfNotNull(title,hint).joinToString(". ")
                setOnClickListener { close(); select(key, locale) }
            }
            val row = LinearLayout(context).apply {
                gravity = if (tile) Gravity.START else Gravity.CENTER_VERTICAL
                orientation = if (tile) LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
                background = GradientDrawable(GradientDrawable.Orientation.TL_BR,
                    intArrayOf(0x16FFFFFF,0x03FFFFFF,0x16000000))
                minimumHeight = dp(if (tile) 184 else if (primary) 108 else if (hint == null) 56 else 80)
                setPadding(dp(if (wide) 20 else 16),dp(if (primary) 18 else 12),dp(16),dp(if (primary) 18 else 12))
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
            }
            row.addView(ImageView(context).apply {
                setImageResource(icon)
                if (light && key != "matches") setColorFilter(when(key) {
                    "tech" -> 0xFF6D458F.toInt()
                    "trail" -> 0xFF276F69.toInt()
                    else -> 0xFF8C6021.toInt()
                })
                setPadding(dp(10),dp(10),dp(10),dp(10))
                background = GradientDrawable(GradientDrawable.Orientation.TL_BR,
                    intArrayOf(0x305F466F,0x15000000)).apply { cornerRadius = dp(16).toFloat() }
            }, LinearLayout.LayoutParams(dp(49),dp(49)))
            val captions = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPaddingRelative(dp(if (tile) 0 else 15),dp(if (tile) 15 else 0),0,0)
                addView(label(title,if (primary) 22f else if (wide) 19f else 17f,true,textColor))
                if (hint != null) addView(label(hint,if (wide) 14f else 13f,false,mutedColor))
            }
            row.addView(captions,if (tile) LinearLayout.LayoutParams(-1,-2) else LinearLayout.LayoutParams(0,-2,1f))
            row.addView(ImageView(context).apply {
                setImageResource(R.drawable.ic_explore_arrow)
                if (light) setColorFilter(0xFF8C6021.toInt())
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }, LinearLayout.LayoutParams(dp(20),dp(20)).apply { marginStart = dp(10); if (tile) { gravity = Gravity.END; topMargin = dp(12) } })
            item.addView(row)
            host.addView(item,if (tile) LinearLayout.LayoutParams(0,-1,1f).apply {
                if (key == "trail") marginStart = dp(14)
            } else LinearLayout.LayoutParams(-1,-2).apply { topMargin = dp(12) })
            if (animate) {
                item.alpha = 0f
                item.translationY = dp(15).toFloat()
                item.animate().alpha(1f).translationY(0f).setStartDelay(40L * cardIndex)
                    .setDuration(240L).setInterpolator(DecelerateInterpolator()).start()
            }
            cardIndex++
        }
        card("matches","pick","matchHint",R.drawable.matchapp_logo_exact,0xFF4E3742.toInt(),primary = true)
        val discoveries = if (split) LinearLayout(context).also { row ->
            row.orientation = LinearLayout.HORIZONTAL
            panel.addView(row,LinearLayout.LayoutParams(-1,-2).apply { topMargin = dp(14) })
        } else panel
        card("tech","tech","techHint",R.drawable.ic_dock_explore,0xFF433453.toInt(),discoveries,split)
        card("trail","trail","trailHint",R.drawable.ic_dock_list,0xFF293E42.toInt(),discoveries,split)
        card("all","all",null,R.drawable.ic_dock_home,0xFF353040.toInt())
        sheet.setContentView(scroll)
        sheet.window?.let { window ->
            WindowCompat.setDecorFitsSystemWindows(window,false)
            WindowInsetsControllerCompat(window,scroll).isAppearanceLightStatusBars = light
            WindowInsetsControllerCompat(window,scroll).isAppearanceLightNavigationBars = light
        }
        sheet.show()
        sheet.window?.setLayout(LayoutParams.MATCH_PARENT,LayoutParams.MATCH_PARENT)
    }
}
