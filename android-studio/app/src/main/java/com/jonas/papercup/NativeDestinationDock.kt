package com.jonas.papercup

import android.animation.AnimatorInflater
import android.animation.ValueAnimator
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.webkit.WebView
import androidx.core.view.AccessibilityDelegateCompat
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.navigation.NavigationBarView
import org.json.JSONObject

/** Native touch targets reuse the current page's navigation and translated labels. */
class NativeDestinationDock(
    private val bar: BottomNavigationView,
    private val web: WebView,
    private val playHaptic: (LongArray) -> Unit
) {
    private val icons = listOf(R.drawable.ic_dock_home, R.drawable.ic_dock_explore, R.drawable.ic_dock_matches,
        R.drawable.ic_dock_list, R.drawable.ic_dock_profile)
    private val script by lazy { web.context.assets.open("native-destination-dock.js").bufferedReader().use { it.readText() } }
    private val explore = NativeExploreSheet(bar.context)
    private var language = "en"
    private var syncing = false
    private var keyboard = false
    private var requested = false
    private var pressMotion: Boolean? = null
    private var previousRoute: String? = null
    private var documentUrl: String? = null
    private var documentReply: JavaScriptReplyProxy? = null
    private var pendingHaptic: String? = null
    private var explorePending = false
    private var tappedAt = 0L
    private val density = bar.resources.displayMetrics.density
    private val origins = setOf("https://matchapp.tv", "https://www.matchapp.tv")

    fun install() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        bar.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(Color.rgb(38,32,50), Color.rgb(22,19,31)))
        bar.elevation = 8 * density
        bar.itemIconTintList = null
        bar.itemTextColor = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
            intArrayOf(Color.rgb(255,226,165), Color.rgb(218,211,230)))
        bar.isItemActiveIndicatorEnabled = true
        bar.itemActiveIndicatorColor = ColorStateList.valueOf(Color.rgb(75,56,91))
        bar.labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
        bar.isItemHorizontalTranslationEnabled = false
        icons.forEachIndexed { index, icon -> bar.menu.add(0,index+1,index,"").setIcon(icon) }
        // Explore opens a native destination chooser even when its tab is selected.
        // Material normally removes the click action from a selected navigation item.
        bar.post {
            bar.findViewById<View>(2)?.let { target ->
                ViewCompat.setAccessibilityDelegate(target, object : AccessibilityDelegateCompat() {
                    override fun onInitializeAccessibilityNodeInfo(host: View, info: AccessibilityNodeInfoCompat) {
                        super.onInitializeAccessibilityNodeInfo(host, info)
                        info.isClickable = true
                        info.addAction(AccessibilityNodeInfoCompat.AccessibilityActionCompat.ACTION_CLICK)
                    }
                })
            }
        }
        fun sendCommand(message: String) {
            if (!requested || keyboard || documentUrl != web.url) return
            explorePending = message == "explore:1"
            pendingHaptic = message
            tappedAt = SystemClock.elapsedRealtime()
            documentReply?.postMessage(message)
        }
        fun activate(id: Int) {
            sendCommand(if (id == 2) "explore:1" else "activate:" + (id - 1))
        }
        fun showExplore() {
            explore.show(language, bar.layoutDirection == View.LAYOUT_DIRECTION_RTL,
                bar.menu.getItem(1).title.toString(), pressMotion == true) { key, locale ->
                if (!requested || keyboard || documentUrl != web.url) return@show
                when (key) {
                    "matches" -> sendCommand("activate:2")
                    "all" -> sendCommand("activate:1")
                    "tech", "trail" -> {
                        val group = if (key == "tech") "tech" else "catalog-trails"
                        val edition = if (locale == "en") "" else locale.lowercase(java.util.Locale.ROOT) + "/"
                        web.loadUrl("https://matchapp.tv/$group/$edition")
                    }
                }
            }
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
            if (data.optBoolean("openExplore")) {
                if (!explorePending || !requested || keyboard || documentUrl != href ||
                    SystemClock.elapsedRealtime() - tappedAt > 1000) return@addWebMessageListener
                explorePending = false
                showExplore()
                return@addWebMessageListener
            }
            if (data.has("dockHaptic")) {
                // A freshly navigated WebView may deny vibrate() until its own surface is touched.
                // Permit one bounded pattern only for the current physical menu activation.
                if (data.optString("dockHaptic") != pendingHaptic || documentUrl != href ||
                    SystemClock.elapsedRealtime() - tappedAt > 1000) return@addWebMessageListener
                pendingHaptic = null
                val pattern = data.optJSONArray("timings") ?: return@addWebMessageListener
                if (pattern.length() !in setOf(1,3)) return@addWebMessageListener
                val timings = LongArray(pattern.length()) { pattern.optLong(it) }
                if (timings.all { it in 1L..40L }) playHaptic(longArrayOf(0L) + timings)
                return@addWebMessageListener
            }
            val labels=data.optJSONArray("labels") ?: return@addWebMessageListener
            val active=data.optInt("selected",-1)
            requested=data.optBoolean("visible") && labels.length()==icons.size && active in icons.indices &&
                (0 until labels.length()).all { labels.optString(it).length in 1..80 } &&
                bar.resources.configuration.fontScale<=1.35f
            documentUrl=href
            documentReply=reply
            if (requested) {
                language = data.optString("lang","en").take(16)
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
        explore.close()
        requested=false
        documentUrl=null
        documentReply=null
        pendingHaptic=null
        explorePending=false
        render()
        web.animate().cancel()
        web.scaleX=1f; web.scaleY=1f; web.translationY=0f
    }

    fun attach(url: String?) {
        if (allowed(url) && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
            web.evaluateJavascript(script,null)
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
