package com.jonas.papercup

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognizerIntent
import android.view.View
import android.view.ViewGroup
import android.view.HapticFeedbackConstants
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Toast
import android.widget.VideoView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.WindowCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var offline: View
    private lateinit var fullscreenHost: FrameLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var splashKeep = false
    private var introHost: FrameLayout? = null
    private var introVideo: VideoView? = null
    private val introDeadline = Runnable { finishIntro() }
    private var startupHost: FrameLayout? = null
    private val startupDeadline = Runnable { finishStartupTransition() }
    private val startupPrefs by lazy { getSharedPreferences(STARTUP_PREFS, MODE_PRIVATE) }
    private var lastUrl = HOME

    // Web UI (including the responsive Avatar Studio) is shared with matchapp.tv.
    // Keep production pages fresh so phone/tablet WebViews receive approved UI updates immediately.
    private val sharedUiVersion = "adult-mobile-match-ai-runtime-20260927-1"

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
    }

    private val voiceRecognizer = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val transcript = result.data
            ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            ?.firstOrNull()
            ?.trim()
        if (result.resultCode == android.app.Activity.RESULT_OK && !transcript.isNullOrBlank()) {
            sendVoiceResult(transcript)
        } else {
            sendVoiceError("no-speech")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen().apply {
            setKeepOnScreenCondition { splashKeep }
            setOnExitAnimationListener { it.remove() }
        }
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Keep the native shell immersive, but never place the interactive WebView
        // underneath a status bar, punch-hole camera, or display cutout.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = ContextCompat.getColor(this, R.color.ink)

        web = findViewById(R.id.web)
        refresh = findViewById(R.id.refresh)
        offline = findViewById(R.id.offline)
        fullscreenHost = findViewById(R.id.fullscreen)
        applySafeInsets()
        findViewById<MaterialButton>(R.id.retry).setOnClickListener { retry() }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            // Always cold-load current production HTML/assets when the Android
            // activity starts; normal caching resumes after the first page finishes.
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            // Strip WebView's "; wv" marker so Google sign-in is not blocked.
            val chromeUa = userAgentString
                .replace("; wv)", ")")
                .replace("; wv ", " ")
                .replace(" Version/4.0 ", " ")
            userAgentString = "$chromeUa $APP_UA"
        }
        web.setBackgroundColor(Color.parseColor("#101010"))
        web.webViewClient = MatchClient()
        web.webChromeClient = MatchChrome()
        web.addJavascriptInterface(NativeVoiceBridge(), "MatchAppNativeVoice")
        web.addJavascriptInterface(NativeStartupBridge(), "MatchAppNativeStartup")
        web.addJavascriptInterface(NativeExperienceBridge(), "MatchAppNativeExperience")
        web.setDownloadListener { url, _, contentDisposition, mime, _ ->
            val name = URLUtil.guessFileName(url, contentDisposition, mime)
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            try {
                startActivity(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(this, name, Toast.LENGTH_SHORT).show()
            }
        }

        refresh.setColorSchemeColors(ContextCompat.getColor(this, R.color.gold))
        refresh.setProgressBackgroundColorSchemeColor(ContextCompat.getColor(this, R.color.royal))
        refresh.setOnRefreshListener {
            if (isOnline()) {
                web.settings.cacheMode = WebSettings.LOAD_NO_CACHE
                web.reload()
            } else {
                refresh.isRefreshing = false
                showOffline(true)
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    introHost != null -> finishIntro()
                    customView != null -> hideCustomView()
                    web.canGoBack() -> web.goBack()
                    else -> finish()
                }
            }
        })

        if (savedInstanceState == null && intent.data == null) startStartupExperience()

        val launch = resolveLaunchUrl(intent)
        lastUrl = launch
        if (isDebugSmokeUrl(launch) || isOnline()) web.loadUrl(launch) else {
            splashKeep = false
            showOffline(true)
        }
    }

    private fun applySafeInsets() {
        // The background remains edge-to-edge. Only normal adult-app content is
        // inset below system bars/camera cutouts; fullscreen intro/video remains immersive.
        ViewCompat.setOnApplyWindowInsetsListener(refresh) { view, insets ->
            val safe = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(view.paddingLeft, safe.top, view.paddingRight, view.paddingBottom)
            insets
        }
        ViewCompat.requestApplyInsets(refresh)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val url = resolveLaunchUrl(intent)
        if (url != lastUrl) {
            lastUrl = url
            web.loadUrl(url)
        }
    }

    override fun onPause() {
        finishIntro()
        finishStartupTransition(immediate = true)
        super.onPause()
        web.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        finishIntro()
        finishStartupTransition(immediate = true)
        fullscreenHost.removeAllViews()
        web.destroy()
        super.onDestroy()
    }

    private fun startStartupExperience() {
        if (startupPrefs.getBoolean(PREF_REGISTERED, false) ||
            startupPrefs.getBoolean(PREF_INTRO_SEEN, false)
        ) {
            startStartupTransition()
        } else {
            startIntro()
        }
    }

    private fun startStartupTransition() {
        val root = findViewById<FrameLayout>(R.id.root)
        val host = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#10091A"))
            isClickable = true
            isFocusable = true
        }
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.matchapp_official_icon)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            alpha = 0f
            scaleX = 0.94f
            scaleY = 0.94f
        }
        val size = (92 * resources.displayMetrics.density).toInt()
        host.addView(
            logo,
            FrameLayout.LayoutParams(size, size, android.view.Gravity.CENTER)
        )
        startupHost = host
        root.addView(
            host,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        logo.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(280L)
            .start()
        root.postDelayed(startupDeadline, 3200L)
    }

    private fun finishStartupTransition(immediate: Boolean = false) {
        findViewById<FrameLayout>(R.id.root)?.removeCallbacks(startupDeadline)
        val host = startupHost ?: return
        startupHost = null
        if (immediate) {
            (host.parent as? ViewGroup)?.removeView(host)
            return
        }
        host.animate()
            .alpha(0f)
            .setDuration(240L)
            .withEndAction { (host.parent as? ViewGroup)?.removeView(host) }
            .start()
    }

    private fun markIntroSeen() {
        startupPrefs.edit().putBoolean(PREF_INTRO_SEEN, true).apply()
    }

    // Playback is bundled, muted, finite, and independent of Home loading.
    private fun startIntro() {
        val root = findViewById<FrameLayout>(R.id.root)
        val host = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        val video = object : VideoView(this@MainActivity) {
            override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
                val width = View.MeasureSpec.getSize(widthMeasureSpec)
                val height = View.MeasureSpec.getSize(heightMeasureSpec)
                val scale = maxOf(width / 1080f, height / 1920f)
                setMeasuredDimension(kotlin.math.ceil(1080 * scale).toInt(), kotlin.math.ceil(1920 * scale).toInt())
            }
        }
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
        val skip = MaterialButton(this).apply {
            text = if (resources.configuration.locales[0].language == "pt") "Pular" else "Skip"
            setOnClickListener {
                markIntroSeen()
                finishIntro()
            }
        }
        introHost = host
        introVideo = video
        val bounds = resources.displayMetrics
        host.clipChildren = true
        host.addView(video, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, android.view.Gravity.CENTER))
        val margin = (16 * bounds.density).toInt()
        host.addView(skip, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, android.view.Gravity.BOTTOM or android.view.Gravity.END).apply {
            setMargins(margin, margin, margin, margin)
        })
        root.addView(host, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.postDelayed(introDeadline, 8000L)
        video.setOnPreparedListener { player ->
            player.setVolume(0f, 0f)
            player.isLooping = false
            markIntroSeen()
            root.removeCallbacks(introDeadline)
            val playbackFailsafe = maxOf(player.duration.toLong(), 10000L) + 5000L
            root.postDelayed(introDeadline, playbackFailsafe)
            video.start()
        }
        video.setOnCompletionListener { finishIntro() }
        video.setOnErrorListener { _, _, _ -> finishIntro(); true }
        try {
            video.setVideoURI(Uri.parse("android.resource://$packageName/${R.raw.matchapp_launch_intro}"))
        } catch (_: Exception) { finishIntro() }
    }

    private fun finishIntro() {
        findViewById<FrameLayout>(R.id.root)?.removeCallbacks(introDeadline)
        val host = introHost ?: return
        introHost = null
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
        ViewCompat.requestApplyInsets(refresh)
        try { introVideo?.stopPlayback() } catch (_: Exception) { }
        introVideo = null
        (host.parent as? ViewGroup)?.removeView(host)
    }

    private fun retry() {
        if (!isDebugSmokeUrl(lastUrl) && !isOnline()) {
            Toast.makeText(this, getString(R.string.offline_title), Toast.LENGTH_SHORT).show()
            return
        }
        showOffline(false)
        web.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        web.loadUrl(lastUrl)
    }

    private fun showOffline(show: Boolean) {
        offline.visibility = if (show) View.VISIBLE else View.GONE
        refresh.visibility = if (show) View.GONE else View.VISIBLE
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun debugSmokeUri(url: String?): Uri? {
        if (!BuildConfig.DEBUG || url.isNullOrBlank()) return null
        val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return null
        val host = uri.host.orEmpty().lowercase()
        return uri.takeIf {
            it.scheme.equals("http", ignoreCase = true) &&
                (host == "127.0.0.1" || host == "localhost")
        }
    }

    private fun isDebugSmokeUrl(url: String?): Boolean = debugSmokeUri(url) != null

    private fun debugSmokeLaunch(intent: Intent?): String? =
        intent?.getStringExtra("matchapp_smoke_url")
            ?.let { debugSmokeUri(it)?.toString() }

    private fun isMatchAppHost(host: String): Boolean {
        val normalized = host.lowercase()
        return normalized == "matchapp.tv" ||
            normalized == "www.matchapp.tv" ||
            normalized.endsWith(".matchapp.tv")
    }

    private fun hostIs(host: String, domain: String): Boolean =
        host == domain || host.endsWith(".$domain")

    private fun isTrustedAuthHost(host: String): Boolean =
        listOf("supabase.co", "google.com", "gstatic.com", "googleapis.com", "googleusercontent.com")
            .any { hostIs(host, it) }

    // Only the adult Match and Ask AI documents need cold document/asset
    // loads after the emergency provider changes; keep every other native
    // route and the entire desktop/browser experience untouched.
    private fun isAdultAiDocument(uri: Uri): Boolean =
        isMatchAppHost(uri.host.orEmpty()) &&
            (uri.path.orEmpty() == "/" || uri.path.orEmpty() == "/discover.html")

    private fun isKidsUri(uri: Uri): Boolean {
        if (!isMatchAppHost(uri.host.orEmpty())) return false
        val path = uri.path.orEmpty().lowercase().trimEnd('/')
        return path == "/kids" || path.startsWith("/kids/")
    }

    private fun isKidsUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return runCatching { isKidsUri(Uri.parse(url)) }.getOrDefault(false)
    }

    private fun resolveLaunchUrl(intent: Intent?): String {
        debugSmokeLaunch(intent)?.let { return it }
        val data = intent?.data
        if (data != null && (data.scheme == "https" || data.scheme == "http")) {
            if (isMatchAppHost(data.host.orEmpty()) && !isKidsUri(data)) {
                return data.buildUpon().scheme("https").build().toString()
            }
        }
        return HOME
    }

    private fun hideCustomView() {
        customViewCallback?.onCustomViewHidden()
        customViewCallback = null
        fullscreenHost.removeAllViews()
        fullscreenHost.visibility = View.GONE
        customView = null
        refresh.visibility = View.VISIBLE
    }

    private fun injectAppMode(view: WebView) {
        view.evaluateJavascript(APP_MODE_JS, null)
    }

    private inner class MatchClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (isAdultAiDocument(request.url)) view.settings.cacheMode = WebSettings.LOAD_NO_CACHE
            return handleUrl(request.url)
        }

        @Deprecated("Deprecated in Java")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
            val uri = Uri.parse(url)
            if (isAdultAiDocument(uri)) view.settings.cacheMode = WebSettings.LOAD_NO_CACHE
            return handleUrl(uri)
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            return AdBlocker.intercept(request.url.toString())
        }

        @Deprecated("Deprecated in Java")
        override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
            return AdBlocker.intercept(url)
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            val uri = url?.let { runCatching { Uri.parse(it) }.getOrNull() }
            if (uri != null && isKidsUri(uri)) {
                view.stopLoading()
                lastUrl = HOME
                view.loadUrl(HOME)
                return
            }
            if (uri != null && isAdultAiDocument(uri)) view.settings.cacheMode = WebSettings.LOAD_NO_CACHE
            lastUrl = url ?: lastUrl
            injectAppMode(view)
        }

        override fun onPageFinished(view: WebView, url: String?) {
            splashKeep = false
            finishStartupTransition()
            refresh.isRefreshing = false
            view.settings.cacheMode = WebSettings.LOAD_DEFAULT
            injectAppMode(view)
            CookieManager.getInstance().flush()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                splashKeep = false
                finishStartupTransition(immediate = true)
                refresh.isRefreshing = false
                if (!isOnline()) showOffline(true)
            }
        }
    }

    private fun handleUrl(uri: Uri): Boolean {
        val scheme = uri.scheme.orEmpty().lowercase()
        val host = uri.host.orEmpty().lowercase()
        if (scheme == "mailto" || scheme == "tel" || scheme == "sms" || scheme == "whatsapp" || scheme == "intent" || scheme == "market") {
            return openExternal(uri)
        }
        if (hostIs(host, "wa.me") || hostIs(host, "whatsapp.com") || hostIs(host, "play.google.com") || hostIs(host, "t.me")) {
            return openExternal(uri)
        }
        if (debugSmokeUri(uri.toString()) != null) return false
        if (isKidsUri(uri)) {
            if (!isKidsUrl(web.url)) web.loadUrl(HOME)
            return true
        }
        if (isMatchAppHost(host)) {
            if (scheme == "http") {
                web.loadUrl(uri.buildUpon().scheme("https").build().toString())
                return true
            }
            return scheme != "https"
        }
        if (scheme == "https" && isTrustedAuthHost(host)) return false
        return openExternal(uri)
    }

    private fun openExternal(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    private fun sendVoiceResult(text: String) {
        val value = JSONObject.quote(text)
        web.evaluateJavascript(
            "window.matchAppNativeVoiceResult&&window.matchAppNativeVoiceResult($value);",
            null
        )
    }

    private fun sendVoiceError(code: String) {
        val value = JSONObject.quote(code)
        web.evaluateJavascript(
            "window.matchAppNativeVoiceError&&window.matchAppNativeVoiceError($value);",
            null
        )
    }

    private inner class NativeStartupBridge {
        @JavascriptInterface
        fun markRegistered() {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current != null && isMatchAppHost(current.host.orEmpty())) {
                    startupPrefs.edit().putBoolean(PREF_REGISTERED, true).apply()
                }
            }
        }
    }

    private inner class NativeExperienceBridge {
        @JavascriptInterface
        fun haptic(kind: String?) {
            runOnUiThread {
                when (kind?.lowercase()) {
                    "success" -> web.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                    "reject" -> web.performHapticFeedback(HapticFeedbackConstants.REJECT)
                    "context" -> web.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                    else -> web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                }
            }
        }
    }

    private inner class NativeVoiceBridge {
        @JavascriptInterface
        fun start(languageTag: String?) {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current == null || !isMatchAppHost(current.host.orEmpty())) {
                    sendVoiceError("not-allowed")
                    return@runOnUiThread
                }
                val lang = languageTag
                    ?.takeIf { it.matches(Regex("^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$")) }
                    ?: "en-US"
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                try {
                    voiceRecognizer.launch(intent)
                } catch (_: ActivityNotFoundException) {
                    sendVoiceError("unavailable")
                }
            }
        }
    }

    private inner class MatchChrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            if (newProgress >= 100) refresh.isRefreshing = false
        }

        override fun onShowFileChooser(
            webView: WebView?,
            callback: ValueCallback<Array<Uri>>?,
            params: FileChooserParams?
        ): Boolean {
            filePathCallback?.onReceiveValue(null)
            filePathCallback = callback
            val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "image/*"
            }
            return try {
                fileChooser.launch(Intent.createChooser(intent, getString(R.string.file_chooser_title)))
                true
            } catch (_: ActivityNotFoundException) {
                filePathCallback = null
                false
            }
        }

        override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message?): Boolean {
            val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
            val child = WebView(this@MainActivity)
            child.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                    val target = request.url
                    val host = target.host.orEmpty().lowercase()
                    // Popups may not bypass the adult-only or HTTPS URL boundary.
                    when {
                        isKidsUri(target) -> web.loadUrl(HOME)
                        target.scheme.equals("https", ignoreCase = true) &&
                            (isMatchAppHost(host) || isTrustedAuthHost(host)) -> web.loadUrl(target.toString())
                        else -> openExternal(target)
                    }
                    child.post { child.destroy() }
                    return true
                }
            }
            transport.webView = child
            resultMsg.sendToTarget()
            return true
        }

        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
            if (customView != null) {
                callback?.onCustomViewHidden()
                return
            }
            customView = view
            customViewCallback = callback
            refresh.visibility = View.GONE
            fullscreenHost.visibility = View.VISIBLE
            fullscreenHost.addView(
                view,
                FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            )
        }

        override fun onHideCustomView() {
            hideCustomView()
        }
    }

    companion object {
        const val HOME = "https://matchapp.tv/?utm_source=android_app&appBuild=40"
        const val APP_UA = "MatchAppTVAndroid/1.1.36 MatchAppAiAndroid/1.1.36 MatchAppLaunchIntro/1"
        private const val STARTUP_PREFS = "matchapp_startup"
        private const val PREF_INTRO_SEEN = "intro_seen_v1"
        private const val PREF_REGISTERED = "registered_v1"
        private const val APP_MODE_JS = """
            (function(){
              window.MATCHAPP_IS_AD_FREE = true;
              window.MATCHAPP_ANDROID = true;
              window.MATCHAPP_ANDROID_KIDS_AVAILABLE = false;
              window.MATCHAPP_ANDROID_KIDS_BLOCKED = true;
              try { localStorage.setItem('match_ad_free','true'); } catch (e) {}
              var root = document.documentElement;
              root.classList.add('ads-empty','matchapp-android','matchapp-ai-android','is-chrome');

              if (!document.getElementById('matchapp-android-shell')) {
                var s = document.createElement('style');
                s.id = 'matchapp-android-shell';
                s.textContent =
                  '.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,' +
                  '.premium-ad-frame,ins.adsbygoogle,.ma-ad-label,#chrome-notice,.chrome-notice,.install-btn,' +
                  '.ma-kids-mode-entry,#matchapp-kids-entry' +
                  '{display:none!important;height:0!important;min-height:0!important;overflow:hidden!important;' +
                  'padding:0!important;margin:0!important;border:0!important}' +
                  'html.matchapp-ai-android{--android-gold:#e5c158;--android-violet:#8d5cff}' +
                  'html.matchapp-ai-android :is(button,a,[role="button"],.pill,.card){-webkit-tap-highlight-color:transparent}' +
                  'html.matchapp-ai-android :is(button,a,[role="button"]):active{transform:scale(.975);transition:transform 90ms ease}' +
                  'html.matchapp-ai-android .matchapp-android-thinking{animation:matchappAndroidBreathe 1.15s ease-in-out infinite}' +
                  '@keyframes matchappAndroidBreathe{50%{filter:drop-shadow(0 0 14px rgba(229,193,88,.55));transform:scale(1.015)}}' +
                  '@media(prefers-reduced-motion:reduce){html.matchapp-ai-android *,html.matchapp-ai-android *:before,html.matchapp-ai-android *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}';
                (document.head || root).appendChild(s);
              }

              document.querySelectorAll('ins.adsbygoogle,.ad-banner-container').forEach(function(el){ el.remove(); });

              if (!window.__matchAppAndroidPremiumBound) {
                window.__matchAppAndroidPremiumBound = true;
                var bridge = window.MatchAppNativeExperience;
                var haptic = function(kind){ try { bridge && bridge.haptic(kind || 'tap'); } catch(e){} };
                document.addEventListener('click', function(e){
                  var target = e.target && e.target.closest && e.target.closest('button,a,[role="button"]');
                  if (target) haptic('tap');
                }, true);
                document.addEventListener('contextmenu', function(e){
                  var card = e.target && e.target.closest && e.target.closest('[data-title],.title-card,.top-title-card,.result-card,.poster-card');
                  if (card) haptic('context');
                }, true);
                document.addEventListener('matchapp:match-start', function(){ haptic('tap'); root.classList.add('matchapp-android-thinking'); });
                document.addEventListener('matchapp:match-success', function(){ haptic('success'); root.classList.remove('matchapp-android-thinking'); });
                document.addEventListener('matchapp:match-reject', function(){ haptic('reject'); root.classList.remove('matchapp-android-thinking'); });
                document.addEventListener('matchapp:ai-thinking', function(){ root.classList.add('matchapp-android-thinking'); });
                document.addEventListener('matchapp:ai-done', function(){ haptic('success'); root.classList.remove('matchapp-android-thinking'); });

                // Observe the existing working web runtime instead of replacing matching/AI logic.
                var result = document.getElementById('result-box');
                if (result && window.MutationObserver) {
                  new MutationObserver(function(){
                    var visible = !result.hidden && getComputedStyle(result).display !== 'none';
                    var title = window.currentMatchIdentity && window.currentMatchIdentity.title;
                    if (visible && title && result.dataset.androidRevealed !== String(title)) {
                      result.dataset.androidRevealed = String(title);
                      haptic('success');
                      result.animate && result.animate(
                        [{opacity:.35,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
                        {duration:520,easing:'cubic-bezier(.2,.8,.2,1)'}
                      );
                    }
                  }).observe(result,{attributes:true,childList:true,subtree:true});
                }

                // Voice activity drives the Android AI presence without changing the shared AI engine.
                document.addEventListener('matchapp:voice-start', function(){ root.classList.add('matchapp-android-thinking'); haptic('tap'); });
                document.addEventListener('matchapp:voice-result', function(){ root.classList.remove('matchapp-android-thinking'); haptic('success'); });
                document.addEventListener('matchapp:voice-error', function(){ root.classList.remove('matchapp-android-thinking'); haptic('reject'); });
              }

              if (!document.querySelector('link[data-cinema-dim]')) {
                var dim = document.createElement('link');
                dim.rel = 'stylesheet';
                dim.href = 'https://matchapp.tv/cinema-dim.css?v=20260923-cinemadim2';
                dim.setAttribute('data-cinema-dim','1');
                (document.head || root).appendChild(dim);
              }
            })();
        """
    }
}
