package com.jonas.papercup

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import org.json.JSONObject

/**
 * Android-only profile + Taste DNA onboarding overlay.
 *
 * It deliberately loads the existing MatchApp profile page in a second WebView
 * so the real Supabase/session/profile/taste mechanisms remain the only source
 * of truth. The main Home WebView stays mounted underneath and is never replaced.
 */
class NativeOnboardingOverlay(
    private val activity: AppCompatActivity,
    private val root: FrameLayout,
    private val mainWebView: WebView
) {
    data class Copy(
        val title: String,
        val subtitle: String,
        val doneTitle: String,
        val doneSubtitle: String,
        val enter: String,
        val close: String,
        val prev: String,
        val next: String,
        val question: String,
        val of: String,
        val save: String,
        val signedOut: String
    )

    private var host: FrameLayout? = null
    private var card: LinearLayout? = null
    private var contentWebView: WebView? = null
    private var loading: ProgressBar? = null
    private var copy: Copy? = null
    private var lightAppearance = false
    private val surfaceColor get() = if (lightAppearance) 0xFFFFFDF9.toInt() else Color.rgb(10, 10, 15)
    private val textColor get() = if (lightAppearance) 0xFF302735.toInt() else Color.WHITE
    private val mutedColor get() = if (lightAppearance) 0xFF665B70.toInt() else Color.rgb(198, 187, 211)
    private val density get() = activity.resources.displayMetrics.density
    private fun dp(value: Int) = (value * density + 0.5f).toInt()

    private val profileScript by lazy {
        activity.assets.open("native-onboarding-profile.js").bufferedReader().use { it.readText() }
    }

    val isShowing: Boolean get() = host != null

    fun show(copy: Copy) {
        if (host != null) return
        mainWebView.evaluateJavascript("document.documentElement.dataset.theme === 'sunrise'") { value ->
            if (!activity.isFinishing && !activity.isDestroyed) showResolved(copy, value == "true")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun showResolved(copy: Copy, light: Boolean) {
        if (host != null) return
        lightAppearance = light
        this.copy = copy

        val overlay = FrameLayout(activity).apply {
            setBackgroundColor(Color.argb(220, 3, 3, 8))
            isClickable = true
            isFocusable = true
            elevation = dp(28).toFloat()
            setOnClickListener { close(showNudge = true) }
        }
        host = overlay

        val panel = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            clipToOutline = true
            isClickable = true
            setOnClickListener { /* Consume taps so only the outside margin dismisses. */ }
            elevation = dp(24).toFloat()
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                if (lightAppearance) intArrayOf(0xFFFFFDF9.toInt(),0xFFF7F3EE.toInt()) else intArrayOf(
                    Color.rgb(33, 22, 47),
                    Color.rgb(15, 13, 21),
                    Color.rgb(8, 8, 13)
                )
            ).apply {
                cornerRadius = dp(28).toFloat()
                setStroke(dp(1), Color.argb(48, 213, 187, 255))
            }
        }
        card = panel
        overlay.addView(
            panel,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            )
        )

        val header = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(12), dp(12), dp(12))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(
                    Color.argb(85, 74, 47, 98),
                    Color.argb(60, 50, 32, 68),
                    Color.argb(40, 40, 28, 52)
                )
            )
        }

        val logo = ImageView(activity).apply {
            setImageResource(R.drawable.matchapp_logo_exact)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = activity.getString(R.string.app_name)
        }
        header.addView(
            logo,
            LinearLayout.LayoutParams(dp(48), dp(48)).apply { marginEnd = dp(11) }
        )

        val titles = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val title = TextView(activity).apply {
            text = copy.title
            setTextColor(textColor)
            textSize = 19f
            setTypeface(typeface, Typeface.BOLD)
            maxLines = 2
        }
        val subtitle = TextView(activity).apply {
            text = copy.subtitle
            setTextColor(mutedColor)
            textSize = 12f
            maxLines = 2
            setPadding(0, dp(3), 0, 0)
        }
        titles.addView(title)
        titles.addView(subtitle)
        header.addView(
            titles,
            LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        )

        val close = MaterialButton(activity).apply {
            text = "×"
            textSize = 23f
            setTextColor(Color.WHITE)
            contentDescription = copy.close
            minWidth = 0
            minHeight = 0
            insetTop = 0
            insetBottom = 0
            setPadding(0, 0, 0, dp(2))
            backgroundTintList = null
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.rgb(127, 48, 70), Color.rgb(98, 34, 54))
            ).apply {
                shape = GradientDrawable.OVAL
                setStroke(dp(1), Color.argb(80, 243, 140, 157))
            }
            elevation = dp(8).toFloat()
            setOnClickListener { close(showNudge = true) }
        }
        header.addView(
            close,
            LinearLayout.LayoutParams(dp(44), dp(44)).apply { marginStart = dp(10) }
        )
        panel.addView(
            header,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val body = FrameLayout(activity).apply {
            setBackgroundColor(surfaceColor)
        }
        panel.addView(
            body,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )

        val onboardingWeb = WebView(activity).apply {
            setBackgroundColor(surfaceColor)
            visibility = View.INVISIBLE
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                @Suppress("DEPRECATION")
                databaseEnabled = true
                loadsImagesAutomatically = true
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                cacheMode = WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = true
                useWideViewPort = true
                loadWithOverviewMode = false
                builtInZoomControls = false
                displayZoomControls = false
                userAgentString = mainWebView.settings.userAgentString
            }
        }
        contentWebView = onboardingWeb
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(onboardingWeb, true)
        }
        onboardingWeb.addJavascriptInterface(HostBridge(), "MatchAppNativeOnboardingHost")
        onboardingWeb.webChromeClient = WebChromeClient()
        onboardingWeb.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host.orEmpty().lowercase()
                if (uri.scheme == "https" && (host == "matchapp.tv" || host == "www.matchapp.tv")) {
                    return false
                }
                runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                return true
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return true
                val host = uri.host.orEmpty().lowercase()
                if (uri.scheme == "https" && (host == "matchapp.tv" || host == "www.matchapp.tv")) {
                    return false
                }
                runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                return true
            }

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return AdBlocker.intercept(request.url.toString())
            }

            @Deprecated("Deprecated in Java")
            override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
                return AdBlocker.intercept(url)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                if (contentWebView !== view || host == null) return
                injectProfilePresentation(view)
                view.postDelayed({ if (contentWebView === view) injectProfilePresentation(view) }, 500L)
                view.postDelayed({ if (contentWebView === view) injectProfilePresentation(view) }, 1400L)
                loading?.visibility = View.GONE
                view.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    loading?.visibility = View.GONE
                    view.visibility = View.VISIBLE
                }
            }
        }
        body.addView(
            onboardingWeb,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        val spinner = ProgressBar(activity).apply {
            isIndeterminate = true
        }
        loading = spinner
        body.addView(
            spinner,
            FrameLayout.LayoutParams(dp(42), dp(42), Gravity.CENTER)
        )

        ViewCompat.setOnApplyWindowInsetsListener(overlay) { view, insets ->
            val safe = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(
                safe.left + dp(14),
                safe.top + dp(14),
                safe.right + dp(14),
                safe.bottom + dp(14)
            )
            insets
        }

        root.addView(
            overlay,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        ViewCompat.requestApplyInsets(overlay)
        onboardingWeb.loadUrl("https://matchapp.tv/profile/profile.html?maAndroidNativeOnboarding=1")
    }

    fun close(showNudge: Boolean) {
        val overlay = host ?: return
        host = null
        card = null
        loading = null
        val onboardingWeb = contentWebView
        contentWebView = null
        runCatching {
            onboardingWeb?.removeJavascriptInterface("MatchAppNativeOnboardingHost")
            onboardingWeb?.stopLoading()
            onboardingWeb?.loadUrl("about:blank")
            onboardingWeb?.destroy()
        }
        (overlay.parent as? ViewGroup)?.removeView(overlay)
        if (showNudge) {
            mainWebView.evaluateJavascript(
                "window.MatchAppAndroidOnboardingNudge&&window.MatchAppAndroidOnboardingNudge();",
                null
            )
        }
    }

    fun destroy() {
        close(showNudge = false)
    }

    private fun injectProfilePresentation(view: WebView) {
        val c = copy ?: return
        val json = JSONObject()
            .put("light", lightAppearance)
            .put("prev", c.prev)
            .put("next", c.next)
            .put("question", c.question)
            .put("of", c.of)
            .put("save", c.save)
            .put("signedOut", c.signedOut)
            .toString()
        view.evaluateJavascript("window.__MA_ONBOARDING_COPY__=$json;", null)
        view.evaluateJavascript(
            "(function(){var s=document.getElementById('ma-native-onboarding-bootstrap');" +
                "if(!s){s=document.createElement('style');s.id='ma-native-onboarding-bootstrap';" +
                "s.textContent='.app-header,.profile-hub,footer,.pf-support,.portfolio-tabs,.profile-security-card,.ma-cinema-dock,#ma-ambient-jonas,#ma-ambient-panel{display:none!important}'+" +
                "'#account-details{display:block!important}';document.head.appendChild(s);}"+ 
                "var a=document.getElementById('account-details');if(a){a.hidden=false;a.classList.add('profile-hub-open');a.style.setProperty('display','block','important');}})();",
            null
        )
        view.evaluateJavascript(profileScript, null)
    }

    private fun showComplete() {
        val panel = card ?: return
        val c = copy ?: return
        val onboardingWeb = contentWebView
        contentWebView = null
        runCatching {
            onboardingWeb?.removeJavascriptInterface("MatchAppNativeOnboardingHost")
            onboardingWeb?.stopLoading()
        }

        while (panel.childCount > 1) panel.removeViewAt(1)

        val done = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(28), dp(24), dp(28))
            setBackgroundColor(surfaceColor)
        }
        val logo = ImageView(activity).apply {
            setImageResource(R.drawable.matchapp_logo_exact)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            contentDescription = activity.getString(R.string.app_name)
        }
        done.addView(logo, LinearLayout.LayoutParams(dp(96), dp(96)))

        val title = TextView(activity).apply {
            text = c.doneTitle
            setTextColor(textColor)
            textSize = 27f
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(12), 0, 0)
        }
        done.addView(
            title,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val subtitle = TextView(activity).apply {
            text = c.doneSubtitle
            setTextColor(mutedColor)
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(8), dp(8), dp(18))
        }
        done.addView(
            subtitle,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        )

        val enter = MaterialButton(activity).apply {
            text = c.enter
            textSize = 15f
            setTextColor(Color.WHITE)
            setTypeface(typeface, Typeface.BOLD)
            minHeight = dp(50)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.rgb(111, 74, 146), Color.rgb(82, 54, 112))
            ).apply { cornerRadius = dp(999).toFloat() }
            elevation = dp(9).toFloat()
            setOnClickListener {
                mainWebView.evaluateJavascript(
                    "sessionStorage.removeItem('ma_android_onboarding_pending');" +
                        "history.replaceState(null,'','/');window.scrollTo({top:0,behavior:'smooth'});",
                    null
                )
                close(showNudge = false)
            }
        }
        done.addView(
            enter,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(52)
            ).apply {
                leftMargin = dp(12)
                rightMargin = dp(12)
            }
        )
        panel.addView(
            done,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )

        panel.postDelayed({
            runCatching {
                onboardingWeb?.loadUrl("about:blank")
                onboardingWeb?.destroy()
            }
        }, 700L)
    }

    private inner class HostBridge {
        @JavascriptInterface
        fun complete() {
            activity.runOnUiThread {
                if (host != null) showComplete()
            }
        }

        @JavascriptInterface
        fun stage(value: String?) {
            // Reserved for future native progress chrome. Keeping this bridge
            // makes the profile/DNA body independent of the visual header.
        }
    }
}
