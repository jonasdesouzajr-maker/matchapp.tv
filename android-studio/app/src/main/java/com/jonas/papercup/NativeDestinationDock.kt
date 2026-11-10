package com.jonas.papercup

import android.animation.AnimatorInflater
import android.animation.ValueAnimator
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.navigation.NavigationBarView
import org.json.JSONObject

/** Native touch targets reuse the current page's navigation and translated labels. */
class NativeDestinationDock(private val bar: BottomNavigationView, private val web: WebView) {
    private val icons = listOf(R.drawable.ic_dock_home, R.drawable.ic_dock_explore, R.drawable.matchapp_logo_exact,
        R.drawable.ic_dock_list, R.drawable.ic_dock_profile)
    private val script by lazy { web.context.assets.open("native-destination-dock.js").bufferedReader().use { it.readText() } }
    private val brandScript by lazy { web.context.assets.open("android-brand-data.js").bufferedReader().use { it.readText() } }
    private val premiumScript by lazy { web.context.assets.open("android-premium-shell.js").bufferedReader().use { it.readText() } }
    private var syncing = false
    private var keyboard = false
    private var requested = false
    private var pressMotion: Boolean? = null
    private var previousRoute: String? = null
    private var documentUrl: String? = null
    private val density = bar.resources.displayMetrics.density
    private val origins = setOf("https://matchapp.tv", "https://www.matchapp.tv")

    fun install() {
        val supported = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
        Log.d("MatchAppDock", "install webMessageSupported=$supported")
        if (!supported) return
        bar.background = GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            intArrayOf(Color.rgb(34, 25, 46), Color.rgb(18, 17, 25), Color.rgb(11, 11, 15))
        ).apply {
            cornerRadius = 24 * density
            setStroke((0.8f * density).toInt().coerceAtLeast(1), Color.argb(42, 211, 183, 241))
        }
        // MainActivity already reserves system bars for the parent content.
        // Material's default inset listener would reserve them again here and
        // squeeze the label group to a single pixel on compact phone layouts.
        ViewCompat.setOnApplyWindowInsetsListener(bar) { view, insets ->
            val padding = (4 * density).toInt()
            view.setPadding(0, padding, 0, padding)
            insets
        }
        bar.itemPaddingTop = (6 * density).toInt()
        bar.itemPaddingBottom = (6 * density).toInt()
        bar.elevation = 18 * density
        bar.translationZ = 10 * density
        bar.itemIconTintList = null
        bar.itemIconSize = (24 * density).toInt()
        bar.setItemTextAppearanceActive(R.style.TextAppearance_MatchApp_Dock)
        bar.setItemTextAppearanceInactive(R.style.TextAppearance_MatchApp_Dock)
        bar.itemTextColor = ColorStateList(
            arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
            intArrayOf(Color.rgb(255, 226, 165), Color.rgb(201, 195, 211))
        )
        bar.isItemActiveIndicatorEnabled = true
        bar.itemActiveIndicatorColor = ColorStateList.valueOf(Color.rgb(78, 54, 94))
        bar.labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
        bar.isItemHorizontalTranslationEnabled = false
        val initialLabels = listOf("Home", "Explore", "Matches", "My List", "Profile")
        icons.forEachIndexed { index, icon -> bar.menu.add(0,index+1,index,initialLabels[index]).setIcon(icon) }
        bar.labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
        fun activate(id: Int) {
            if (requested && documentUrl == web.url)
                web.evaluateJavascript("window.__maNativeDock?.activate(${id-1})", null)
        }
        bar.setOnItemSelectedListener { item ->
            if (syncing) true else { activate(item.itemId); false }
        }
        bar.setOnItemReselectedListener { if (!syncing) activate(it.itemId) }
        WebViewCompat.addWebMessageListener(web,"MatchAppDestinationDock",origins) { view,message,origin,mainFrame,reply ->
            if (!mainFrame || origin.toString().trimEnd('/') !in origins) return@addWebMessageListener
            val data=message.data?.takeIf { it.length<=8192 }?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return@addWebMessageListener
            val href=data.optString("href")
            if (view.url!=href || !allowed(href)) return@addWebMessageListener
            val labels=data.optJSONArray("labels") ?: return@addWebMessageListener
            val active=data.optInt("selected",-1)
            requested=data.optBoolean("visible") && labels.length()==icons.size && active in icons.indices &&
                (0 until labels.length()).all { labels.optString(it).length in 1..80 } &&
                bar.resources.configuration.fontScale<=1.35f
            Log.d("MatchAppDock", "href=$href visible=${data.optBoolean("visible")} labels=${labels.length()} active=$active fontScale=${bar.resources.configuration.fontScale} requested=$requested")
            documentUrl=href
            if (requested) {
                bar.layoutDirection=if(data.optBoolean("rtl")) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
                syncing=true
                try {
                    for(index in icons.indices){
                        val label=labels.getString(index)
                        val item=bar.menu.getItem(index)
                        if(item.title!=label)item.title=label
                    }
                    if(bar.selectedItemId!=active+1)bar.selectedItemId=active+1
                } finally { syncing=false }
                val motion=data.optBoolean("motion") && animatorsEnabled()
                if (pressMotion!=motion) {
                    for (id in 1..icons.size) {
                        val target=bar.findViewById<View>(id) ?: continue
                        target.stateListAnimator=if(motion) AnimatorInflater.loadStateListAnimator(bar.context,R.animator.dock_press_depth) else null
                        if(!motion){target.scaleX=1f; target.scaleY=1f; target.rotationX=0f}
                    }
                    pressMotion=motion
                }
                val uri=Uri.parse(href)
                val route=uri.path.orEmpty()+"#"+uri.fragment.orEmpty()
                if(previousRoute!=null && previousRoute!=route && motion) enterScreen()
                previousRoute=route
            }
            render()
            reply.postMessage(if(requested)"shown" else "hidden")
        }
    }

    private fun animatorsEnabled(): Boolean = if(Build.VERSION.SDK_INT>=26) ValueAnimator.areAnimatorsEnabled()
        else Settings.Global.getFloat(web.context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0

    private fun enterScreen() {
        web.animate().cancel()
        web.scaleX=.992f
        web.scaleY=.992f
        web.translationY=7*density
        web.animate().scaleX(1f).scaleY(1f).translationY(0f).setDuration(170L)
            .setInterpolator(DecelerateInterpolator()).start()
    }

    fun onDocumentChanged() {
        requested=false
        documentUrl=null
        render()
        web.animate().cancel()
        web.scaleX=1f; web.scaleY=1f; web.translationY=0f
    }

    fun attach(url: String?) {
        val allowedNow = allowed(url)
        val supported = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
        Log.d("MatchAppDock", "attach url=$url allowed=$allowedNow supported=$supported")
        if (allowedNow && supported) {
            web.evaluateJavascript(brandScript) { Log.d("MatchAppDock", "brandInjected result=$it") }
            web.evaluateJavascript(script) { Log.d("MatchAppDock", "dockInjected result=$it") }
            web.evaluateJavascript(premiumScript) { Log.d("MatchAppDock", "premiumInjected result=$it") }
        }
    }

    fun setKeyboard(visible: Boolean) { keyboard=visible; render() }

    private fun render() {
        bar.visibility=if(requested && !keyboard) View.VISIBLE else View.GONE
    }

    private fun allowed(url: String?): Boolean {
        val uri=url?.let(Uri::parse) ?: return false
        val first=uri.path.orEmpty().trimStart('/').substringBefore('/')
        return uri.scheme=="https" && uri.host in setOf("matchapp.tv","www.matchapp.tv") &&
            uri.port in setOf(-1,443) && first !in setOf("kids","oauth","private-voice","lumina-match","reelforge")
    }
}
