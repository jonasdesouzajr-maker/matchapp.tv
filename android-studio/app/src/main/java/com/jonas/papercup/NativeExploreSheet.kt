package com.jonas.papercup

import android.app.Dialog
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
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
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
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

    fun show(lang: String, rtl: Boolean, exploreLabel: String, select: (String, String) -> Unit) {
        if (dialog?.isShowing == true) return
        val code = lang.substringBefore('-').lowercase(java.util.Locale.ROOT)
        val locale = when {
            code == "pt" -> "pt-BR"
            copies.has(code) -> code
            else -> "en"
        }
        val copy = copies.getJSONObject(locale)
        val wide = context.resources.configuration.smallestScreenWidthDp >= 600
        val sheet: Dialog = if (wide) Dialog(context, android.R.style.Theme_Material_NoActionBar) else BottomSheetDialog(context)
        dialog = sheet
        sheet.setOnDismissListener { if (dialog === sheet) dialog = null }
        val panel = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutDirection = if (rtl) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
            setPadding(dp(if (wide) 28 else 18), dp(if (wide) 24 else 10), dp(if (wide) 28 else 18), dp(24))
            ViewCompat.setAccessibilityPaneTitle(this, exploreLabel)
        }
        val scroll = ScrollView(context).apply { isFillViewport = wide }
        val backdrop = GradientDrawable(GradientDrawable.Orientation.TL_BR,
            intArrayOf(0xFF3B284C.toInt(), 0xFF211B30.toInt(), 0xFF17151F.toInt()))
        if (wide) {
            scroll.background = backdrop
            val frame = FrameLayout(context)
            val width = minOf(dp(650), context.resources.displayMetrics.widthPixels)
            frame.addView(panel, FrameLayout.LayoutParams(width, LayoutParams.WRAP_CONTENT, Gravity.CENTER))
            scroll.addView(frame)
            ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
                val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom)
                insets
            }
        } else {
            backdrop.cornerRadius = dp(25).toFloat()
            panel.background = backdrop
            scroll.addView(panel)
            panel.addView(View(context).apply {
                background = GradientDrawable().apply { setColor(0xFFA79AAC.toInt()); cornerRadius = dp(3).toFloat() }
            }, LinearLayout.LayoutParams(dp(36),dp(4)).apply { gravity = Gravity.CENTER_HORIZONTAL })
        }
        val header = LinearLayout(context).apply { gravity = Gravity.CENTER_VERTICAL }
        if (wide) header.addView(ImageView(context).apply {
            setImageResource(R.drawable.matchapp_launcher_orbit)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(96),dp(96)))
        val headings = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPaddingRelative(0,dp(12),dp(8),dp(12))
            addView(label(exploreLabel, 14f, true, 0xFFF1D29A.toInt()))
            addView(label(copy.getString("heading"), if (wide) 30f else 22f, true, 0xFFFFF7EC.toInt()))
        }
        header.addView(headings, LinearLayout.LayoutParams(0,LayoutParams.WRAP_CONTENT,1f))
        header.addView(ImageButton(context).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            setColorFilter(0xFFEDDFEC.toInt())
            val value = android.util.TypedValue()
            context.theme.resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, value,true)
            setBackgroundResource(value.resourceId)
            contentDescription = copy.getString("close")
            setOnClickListener { close() }
        }, LinearLayout.LayoutParams(dp(48),dp(48)))
        panel.addView(header)
        fun card(key: String, titleKey: String, hintKey: String?, icon: Int, color: Int) {
            val title = copy.getString(titleKey)
            val hint = hintKey?.let(copy::getString)
            val item = MaterialCardView(context).apply {
                radius = dp(if (wide) 21 else 16).toFloat()
                cardElevation = dp(3).toFloat()
                setCardBackgroundColor(color)
                strokeWidth = 0
                rippleColor = ColorStateList.valueOf(0x44FFF0CC)
                isClickable = true
                isFocusable = true
                contentDescription = listOfNotNull(title,hint).joinToString(". ")
                setOnClickListener { close(); select(key, locale) }
            }
            val row = LinearLayout(context).apply {
                gravity = Gravity.CENTER_VERTICAL
                minimumHeight = dp(if (wide) 83 else if (hint == null) 48 else 64)
                setPadding(dp(if (wide) 22 else 15),dp(10),dp(15),dp(10))
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
            }
            row.addView(ImageView(context).apply { setImageResource(icon) }, LinearLayout.LayoutParams(dp(30),dp(30)))
            val captions = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPaddingRelative(dp(15),0,0,0)
                addView(label(title,if (wide) 20f else 16f,true,0xFFFFF6EC.toInt()))
                if (hint != null) addView(label(hint,if (wide) 15f else 13f,false,0xFFDFD3E3.toInt()))
            }
            row.addView(captions,LinearLayout.LayoutParams(0,LayoutParams.WRAP_CONTENT,1f))
            item.addView(row)
            panel.addView(item,LinearLayout.LayoutParams(-1,-2).apply { topMargin = dp(if (wide) 12 else 7) })
        }
        card("matches","pick","matchHint",R.drawable.ic_dock_matches,0xFF4E3742.toInt())
        card("tech","tech","techHint",R.drawable.ic_dock_explore,0xFF433453.toInt())
        card("trail","trail","trailHint",R.drawable.ic_dock_list,0xFF293E42.toInt())
        card("all","all",null,R.drawable.ic_dock_home,0xFF353040.toInt())
        sheet.setContentView(scroll)
        if (sheet is BottomSheetDialog) {
            sheet.setOnShowListener {
                sheet.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)?.setBackgroundColor(Color.TRANSPARENT)
                sheet.behavior.state = BottomSheetBehavior.STATE_EXPANDED
            }
        } else sheet.window?.setLayout(LayoutParams.MATCH_PARENT,LayoutParams.MATCH_PARENT)
        sheet.show()
    }
}
