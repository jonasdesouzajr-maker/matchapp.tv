package com.jonas.papercup

import android.Manifest
import android.content.pm.PackageManager
import android.speech.SpeechRecognizer
import android.speech.RecognitionListener
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.provider.Settings
import android.speech.RecognitionService
import android.util.Log
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
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
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
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var offline: View
    private lateinit var fullscreenHost: FrameLayout
    private var adMobController: AdMobController? = null

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
    private var voiceTts: TextToSpeech? = null
    private var voiceTtsReady = false
    private var pendingVoiceUtterance: Pair<String, String?>? = null
    private var homeVoiceRecognition = false
    private var inlineRecognizer: SpeechRecognizer? = null
    private var recognitionGeneration = 0
    private var pendingRecognitionLang = "en-US"
    private var voicePersona = "jonas"
    private var activeSpeechId = ""
    private val androidAvatarHomeJs by lazy { assets.open("avatar-ai/home-preview.js").bufferedReader().use { it.readText() } }
    private val androidAvatarCompanionJs by lazy { assets.open("avatar-ai/companion-v44.js").bufferedReader().use { it.readText() } }
    private val jonasPaidChatJs by lazy { assets.open("avatar-ai/jonas-chat-plus.js").bufferedReader().use { it.readText() } }
    private val jonasPremiumJs by lazy { assets.open("avatar-ai/premium-jonas.js").bufferedReader().use { it.readText() } }
    private val avatarImageLoader by lazy { androidx.webkit.WebViewAssetLoader.Builder().addPathHandler("/assets/", androidx.webkit.WebViewAssetLoader.AssetsPathHandler(this)).build() }

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

    private val audioPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startInlineRecognition(pendingRecognitionLang)
        else sendVoiceError("permission-denied")
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
        // Fixed legacy system-bar colors are supplied by Theme.MatchApp.

        web = findViewById(R.id.web)
        refresh = findViewById(R.id.refresh)
        offline = findViewById(R.id.offline)
        fullscreenHost = findViewById(R.id.fullscreen)
        adMobController = AdMobController(
            this,
            findViewById(R.id.ad_shell),
            findViewById(R.id.ad_container),
            findViewById(R.id.ad_privacy)
        ).also { it.start() }
        voiceTts = TextToSpeech(this, { status ->
            voiceTtsReady = status == TextToSpeech.SUCCESS
            if (voiceTtsReady) {
                voiceTts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) = if (utteranceId == activeSpeechId) sendVoiceSpeakingState(true) else Unit
                    override fun onDone(utteranceId: String?) = if (utteranceId == activeSpeechId) sendVoiceSpeakingState(false) else Unit
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) = if (utteranceId == activeSpeechId) sendVoiceSpeakingState(false) else Unit
                    override fun onError(utteranceId: String?, errorCode: Int) = if (utteranceId == activeSpeechId) sendVoiceSpeakingState(false) else Unit
                })
                runOnUiThread {
                    val pending = pendingVoiceUtterance
                    pendingVoiceUtterance = null
                    if (pending != null) speakVoiceText(pending.first, pending.second)
                }
            } else {
                pendingVoiceUtterance = null
            }
        }, "com.google.android.tts")
        applySafeInsets()
        findViewById<MaterialButton>(R.id.retry).setOnClickListener { retry() }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
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
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
        web.setBackgroundColor(Color.parseColor("#101010"))
        web.webViewClient = MatchClient()
        web.webChromeClient = MatchChrome()
        web.addJavascriptInterface(NativeVoiceBridge(), "MatchAppNativeVoice")
        web.addJavascriptInterface(JonasAiBridge(), "MatchAppNativeAI")
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
                    else -> closeActiveChatOrNavigateBack()
                }
            }
        })

        if (savedInstanceState == null && intent.data == null) startStartupExperience()

        val launch = resolveLaunchUrl(intent)
        lastUrl = launch
        if (isPackagedJonasPage(Uri.parse(launch)) || isDebugSmokeUrl(launch) || isOnline()) web.loadUrl(launch) else {
            splashKeep = false
            showOffline(true)
        }
    }

    private fun closeActiveChatOrNavigateBack() {
        // Android Back must dismiss the active Jonas sheet before leaving the app.
        // Handle both the packaged preview and the injected production companion.
        web.evaluateJavascript(
            """
            (function() {
              var sheet = document.getElementById('chat-sheet');
              if (sheet && !sheet.hidden) {
                var close = document.getElementById('close-chat');
                if (close) { close.click(); return true; }
              }
              var avatar = document.querySelector('#ma-avatar-home[data-open="true"]');
              if (avatar) {
                var dismiss = avatar.querySelector('#ma-av-dismiss');
                if (dismiss) { dismiss.click(); return true; }
              }
              return false;
            })();
            """.trimIndent()
        ) { handled ->
            if (handled != "true") {
                if (web.canGoBack()) web.goBack() else finish()
            }
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
        val adShell = findViewById<View>(R.id.ad_shell)
        ViewCompat.setOnApplyWindowInsetsListener(adShell) { view, insets ->
            val navigation = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, navigation.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(refresh)
        ViewCompat.requestApplyInsets(adShell)
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
        adMobController?.pause()
        super.onPause()
        web.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        adMobController?.resume()
        // Re-resolve account entitlement after returning from browser/payment/account
        // changes. APP_MODE_JS is idempotent and keeps paid users fail-closed.
        injectAppMode(web)
    }

    override fun onDestroy() {
        finishIntro()
        finishStartupTransition(immediate = true)
        adMobController?.destroy()
        adMobController = null
        inlineRecognizer?.cancel()
        inlineRecognizer?.destroy()
        inlineRecognizer = null
        voiceTts?.stop()
        voiceTts?.shutdown()
        voiceTts = null
        voiceTtsReady = false
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
            setImageResource(R.drawable.ic_launcher_foreground)
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

    // Test-only voice access for the USB-reversed local Jonas Python preview.
    private fun isPackagedJonasPage(uri: Uri?): Boolean =
        BuildConfig.BUILD_TYPE == "preview" && uri?.scheme == "https" &&
            uri.host == "appassets.androidplatform.net" &&
            uri.path == "/assets/jonas/index.html"

    private fun isTrustedVoicePage(uri: Uri): Boolean =
        (isMatchAppHost(uri.host.orEmpty()) && !isKidsUri(uri)) ||
        (BuildConfig.DEBUG && debugSmokeUri(uri.toString()) != null && uri.port == 8877) ||
        isPackagedJonasPage(uri)

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
        if (BuildConfig.BUILD_TYPE == "preview" &&
            intent?.action == Intent.ACTION_MAIN &&
            intent.hasCategory(Intent.CATEGORY_LAUNCHER)) {
            return "https://appassets.androidplatform.net/assets/jonas/index.html"
        }
        debugSmokeLaunch(intent)?.let { return it }
        // Normal debug launches use the real adult site. Local smoke testing
        // requires an explicit matchapp_smoke_url intent instead.
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
        val uri = runCatching { Uri.parse(view.url.orEmpty()) }.getOrNull()
        // The first-party production website retains sign-in, credits, and catalog.
        // Inject the persistent Jonas interface across its adult pages only;
        // DOM-ready guard avoids the WebView onPageStarted null-root race.
        if (uri != null && uri.scheme == "https" &&
            isMatchAppHost(uri.host.orEmpty()) && !isKidsUri(uri)) {
            view.evaluateJavascript(
                "if(document.body){" + androidAvatarHomeJs + ";" + androidAvatarCompanionJs + ";" + jonasPaidChatJs + ";" + jonasPremiumJs + "}",
                null
            )
        }
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
            return avatarImageLoader.shouldInterceptRequest(request.url)
                ?: AdBlocker.intercept(request.url.toString())
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

        override fun onPageCommitVisible(view: WebView, url: String?) {
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

    private fun openKidsInBrowser(): Boolean {
        val uri = Uri.parse("https://matchapp.tv/kids/?utm_source=android_app&utm_medium=kids_notice")
        val base = Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)
        val externalPackage = packageManager
            .queryIntentActivities(base, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            .mapNotNull { it.activityInfo?.packageName }
            .firstOrNull { it != packageName }

        if (externalPackage.isNullOrBlank()) return false

        return try {
            startActivity(
                Intent(base)
                    .setPackage(externalPackage)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    private fun sendVoiceResult(text: String) {
        sendVoiceListeningState("idle")
        homeVoiceRecognition = false
        // Keep final transcripts in the existing quota-checked Ask AI + speech flow.
        val value = JSONObject.quote(text)
        web.evaluateJavascript(
            "if (!(window.matchappAvatarVoiceCommand && window.matchappAvatarVoiceCommand($value))) {" +
                "window.matchAppNativeVoiceResult&&window.matchAppNativeVoiceResult($value);}",
            null
        )
    }

    private fun sendVoiceError(code: String) {
        sendVoiceListeningState("idle")
        homeVoiceRecognition = false
        val value = JSONObject.quote(code)
        web.evaluateJavascript(
            "window.matchAppNativeVoiceError&&window.matchAppNativeVoiceError($value);",
            null
        )
    }

    private fun sendVoiceListeningState(state: String) {
        if (!::web.isInitialized) return
        val safe = JSONObject.quote(state)
        runOnUiThread {
            web.evaluateJavascript("document.dispatchEvent(new CustomEvent('matchapp:voice-state',{detail:{state:" + safe + "}}));", null)
        }
    }

    private fun startInlineRecognition(lang: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingRecognitionLang = lang
            audioPermission.launch(Manifest.permission.RECORD_AUDIO)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sendVoiceError("unavailable")
            return
        }
        val generation = ++recognitionGeneration
        inlineRecognizer?.cancel()
        inlineRecognizer?.destroy()
        // Resolve only installed, enabled recognition services visible to this app.
        val services = packageManager.queryIntentServices(Intent(RecognitionService.SERVICE_INTERFACE), 0)
            .mapNotNull { it.serviceInfo?.takeIf { service -> service.enabled && service.exported }
                ?.let { service -> ComponentName(service.packageName, service.name) } }
        val configured = Settings.Secure.getString(contentResolver, "voice_recognition_service")
            ?.let { ComponentName.unflattenFromString(it) }
        val service = services.firstOrNull { it == configured } ?: services.firstOrNull()
        inlineRecognizer = try {
            if (service != null) SpeechRecognizer.createSpeechRecognizer(this, service)
            else SpeechRecognizer.createSpeechRecognizer(this)
        } catch (_: Exception) {
            sendVoiceError("unavailable")
            return
        }
        inlineRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { if (generation == recognitionGeneration) sendVoiceListeningState("listening") }
            override fun onBeginningOfSpeech() { if (generation == recognitionGeneration) sendVoiceListeningState("listening") }
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() { if (generation == recognitionGeneration) sendVoiceListeningState("processing") }
            override fun onError(error: Int) {
                if (generation != recognitionGeneration) return
                Log.w("MatchAppVoice", "Recognition error=$error service=${service?.flattenToShortString()}")
                sendVoiceError(when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission-denied"
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network"
                    SpeechRecognizer.ERROR_AUDIO -> "audio"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
                    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "language"
                    else -> "unavailable"
                })
            }
            override fun onResults(results: Bundle?) {
                if (generation != recognitionGeneration) return
                recognitionGeneration++
                val transcript = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim()
                if (!transcript.isNullOrBlank()) sendVoiceResult(transcript)
                else sendVoiceError("no-speech")
            }
            override fun onPartialResults(partialResults: Bundle?) {
                if (generation != recognitionGeneration) return
                // Never submit partial hypotheses or charge credits twice.
                val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim()?.take(300).orEmpty()
                if (partial.isNotBlank()) web.evaluateJavascript(
                    "document.dispatchEvent(new CustomEvent('matchapp:voice-partial',{detail:{text:" +
                        JSONObject.quote(partial) + "}}));", null
                )
            }
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        try {
            sendVoiceListeningState("listening")
            inlineRecognizer?.startListening(intent)
        } catch (_: Exception) {
            sendVoiceError("unavailable")
        }
    }

    private fun sendVoiceSpeakingState(active: Boolean) {
        if (!::web.isInitialized) return
        runOnUiThread {
            web.evaluateJavascript(
                "window.matchAppNativeSpeechState&&window.matchAppNativeSpeechState(" + active + ");document.dispatchEvent(new CustomEvent('matchapp:avatar-speech',{detail:{speaking:" + active + "}}));",
                null
            )
        }
    }

    private fun speakVoiceText(text: String?, languageTag: String?) {
        val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
        if (current == null || !isTrustedVoicePage(current)) {
            sendVoiceError("not-allowed")
            return
        }
        val value = text?.trim()?.take(4000).orEmpty()
        val engine = voiceTts
        if (value.isBlank()) return
        if (engine == null || !voiceTtsReady) {
            // TTS initialization is asynchronous on fresh installs. Preserve the
            // latest requested spoken reply rather than silently dropping it.
            pendingVoiceUtterance = value to languageTag
            return
        }
        pendingVoiceUtterance = null
        val tag = languageTag
            ?.takeIf { it.matches(Regex("^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$")) }
            ?: "en-US"
        val locale = Locale.forLanguageTag(tag)
        if (locale.language.isNotBlank()) {
            val languageVoices = engine.voices
                ?.filter { it.locale.language.equals(locale.language, ignoreCase = true) }
                .orEmpty()
            val chosen = AvatarVoicePolicy.choose(languageVoices, voicePersona, locale)
            if (chosen == null || engine.setVoice(chosen) != TextToSpeech.SUCCESS) {
                engine.stop()
                sendVoiceSpeakingState(false)
                web.evaluateJavascript("document.dispatchEvent(new CustomEvent('matchapp:avatar-voice-unavailable'));", null)
                return
            }
            if (BuildConfig.DEBUG) android.util.Log.i("MatchAppVoice", "persona=$voicePersona voice=${chosen.name} locale=${chosen.locale}")
        }
        engine.setSpeechRate(0.98f)
        engine.setPitch(1.0f)
        web.evaluateJavascript("document.dispatchEvent(new CustomEvent('matchapp:avatar-answer',{detail:{text:" + JSONObject.quote(value) + "}}));", null)
        activeSpeechId = "matchapp-ai-reply-${System.nanoTime()}"
        if (engine.speak(value, TextToSpeech.QUEUE_FLUSH, null, activeSpeechId) == TextToSpeech.ERROR) {
            sendVoiceSpeakingState(false)
            sendVoiceError("speech-unavailable")
        }
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
        fun setAdFree(adFree: Boolean) {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current == null || !isMatchAppHost(current.host.orEmpty())) return@runOnUiThread
                adMobController?.setAdFree(adFree)
            }
        }

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

        @JavascriptInterface
        fun openVoiceAvatar() = openVoiceAvatarForPersona("", "jonas")

        @JavascriptInterface
        fun openVoiceAvatarForPersona(prompt: String?, persona: String?) {
            runOnUiThread {
                val page = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (page == null || page.scheme != "https" || !isMatchAppHost(page.host.orEmpty()) || isKidsUri(page)) return@runOnUiThread
                // The token is read only from first-party MatchApp auth storage on its own origin.
                // The owner's session still requires backend JWT authorization.
                val readSession = """
                    (function(){
                      try {
                        var keys=Object.keys(localStorage).filter(function(k){return /^sb-.+-auth-token$/.test(k)});
                        for(var i=0;i<keys.length;i++){
                          var s=JSON.parse(localStorage.getItem(keys[i])||'null');
                          if(s&&s.user&&s.user.id&&s.access_token){return s.access_token}
                        }
                        return '';
                      }catch(e){return ''}
                    })();
                """.trimIndent()
                web.evaluateJavascript(readSession) { encoded ->
                    val token = runCatching {
                        JSONObject("{\"token\":" + encoded + "}").optString("token", "")
                    }.getOrDefault("")
                    if (token.length !in 100..6000) {
                        Toast.makeText(this@MainActivity, "Sign in with your MatchApp account to test Avatar AI.", Toast.LENGTH_LONG).show()
                        return@evaluateJavascript
                    }
                    startActivity(
                        Intent(this@MainActivity, VoiceAvatarActivity::class.java)
                            .putExtra(VoiceAvatarActivity.EXTRA_TOKEN, token)
                            .putExtra(VoiceAvatarActivity.EXTRA_PERSONA, "jonas")
                            .putExtra(VoiceAvatarActivity.EXTRA_PROMPT, prompt.orEmpty().take(1000))
                    )
                }
            }
        }

        @JavascriptInterface
        fun openKidsBrowser() {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current == null || !isMatchAppHost(current.host.orEmpty())) return@runOnUiThread
                if (!openKidsInBrowser()) {
                    Toast.makeText(
                        this@MainActivity,
                        "Open matchapp.tv/kids in your browser",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    // Preview-only bridge: the bundled UI uses the existing metered Supabase proxy.
    // The legacy anon JWT is PUBLIC by design; the upstream rate limiter still applies.
    // No secret provider API keys are shipped to Android.
    private inner class JonasAiBridge {
        private fun deliver(id: String, reply: String, error: String) {
            runOnUiThread {
                if (!isPackagedJonasPage(runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull())) return@runOnUiThread
                val js = "window.matchAppNativeAiResult&&window.matchAppNativeAiResult(" +
                    JSONObject.quote(id) + "," + JSONObject.quote(reply) + "," + JSONObject.quote(error) + ");"
                web.evaluateJavascript(js, null)
            }
        }

        @JavascriptInterface
        fun ask(data: String?) {
            if (data == null || data.length > 16000) return
            runOnUiThread {
                if (!isPackagedJonasPage(runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull())) return@runOnUiThread
                Thread {
                    var id = ""
                    var answer = ""
                    var error = "Jonas cannot connect right now. Please try again shortly."
                    try {
                        val input = JSONObject(data)
                        id = input.optString("id", "").take(72)
                        require(id.matches(Regex("^[a-zA-Z0-9_-]{1,72}$"))) { "Invalid request id" }
                        val messages = input.optJSONArray("messages")
                            ?: throw IllegalArgumentException("Missing messages")
                        require(messages.length() in 1..12) { "Conversation too long" }
                        val latest = messages.optJSONObject(messages.length() - 1)
                            ?: throw IllegalArgumentException("Last message missing")
                        require(latest.optString("role") == "user") { "Invalid last message" }
                        val question = latest.optString("content").trim().take(600)
                        require(question.isNotEmpty()) { "Question missing" }
                        val history = org.json.JSONArray()
                        for (i in 0 until messages.length() - 1) {
                            val row = messages.optJSONObject(i) ?: continue
                            val role = row.optString("role")
                            if (role != "user" && role != "assistant") continue
                            val text = row.optString("content").take(600)
                            if (text.isNotBlank()) history.put(JSONObject().put("role", role).put("text", text))
                        }
                        val key = BuildConfig.MATCHAPP_ANON_KEY
                        require(key.isNotBlank()) { "Provider not configured" }
                        val body = JSONObject()
                            .put("mode", "discover")
                            .put("persona", "Jonas")
                            .put("kidsMode", false)
                            .put("question", question)
                            .put("history", history)
                            .put("country", "")
                            .put("lang", input.optString("locale", "en").take(8))
                            .toString()
                        val conn = URL("https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/gemini-proxy")
                            .openConnection() as HttpURLConnection
                        try {
                            conn.requestMethod = "POST"
                            conn.connectTimeout = 12000
                            conn.readTimeout = 68000
                            conn.doOutput = true
                            conn.setRequestProperty("Content-Type", "application/json")
                            conn.setRequestProperty("apikey", key)
                            conn.setRequestProperty("Authorization", "Bearer " + key)
                            conn.outputStream.use { stream ->
                                stream.write(body.toByteArray(Charsets.UTF_8))
                            }
                            val status = conn.responseCode
                            if (status == 429) {
                                error = "Jonas is getting many questions. Please try again shortly."
                            } else if (status == 200) {
                                val responseText = conn.inputStream.bufferedReader(Charsets.UTF_8)
                                    .use { it.readText().take(150000) }
                                val outer = JSONObject(responseText)
                                val content = outer.getJSONArray("candidates").getJSONObject(0)
                                    .getJSONObject("content").getJSONArray("parts")
                                    .getJSONObject(0).getString("text")
                                answer = JSONObject(content).optString("answer", "").take(7000)
                                if (answer.isNotBlank()) error = ""
                            }
                        } finally {
                            conn.disconnect()
                        }
                    } catch (_: Exception) {
                        // Never expose upstream tokens, URLs or exception traces to the web UI.
                    }
                    if (id.isNotBlank()) deliver(id, answer, error)
                }.start()
            }
        }
    }

    private inner class NativeVoiceBridge {
        @JavascriptInterface
        fun setPersona(persona: String?) {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current != null && isMatchAppHost(current.host.orEmpty()) && !isKidsUri(current)) {
                    val next = "jonas"
                    if (next != voicePersona) {
                        pendingVoiceUtterance = null
                        voiceTts?.stop()
                        sendVoiceSpeakingState(false)
                    }
                    voicePersona = next
                }
            }
        }

        @JavascriptInterface
        fun speak(text: String?, languageTag: String?) {
            runOnUiThread { speakVoiceText(text, languageTag) }
        }

        @JavascriptInterface
        fun stopSpeaking() {
            runOnUiThread {
                pendingVoiceUtterance = null
                voiceTts?.stop()
                sendVoiceSpeakingState(false)
            }
        }

        @JavascriptInterface
        fun stopListening() {
            runOnUiThread {
                recognitionGeneration++
                inlineRecognizer?.cancel()
                sendVoiceListeningState("idle")
            }
        }

        @JavascriptInterface
        fun start(languageTag: String?) {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current == null || !isTrustedVoicePage(current)) {
                    sendVoiceError("not-allowed")
                    return@runOnUiThread
                }
                homeVoiceRecognition = current.path.orEmpty() == "/" || current.path.orEmpty() == "/index.html"
                val lang = languageTag
                    ?.takeIf { it.matches(Regex("^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$")) }
                    ?: "en-US"
                startInlineRecognition(lang)
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
        const val HOME = "https://matchapp.tv/?utm_source=android_app&appBuild=45"
        const val APP_UA = "MatchAppTVAndroid/1.1.41 MatchAppAiAndroid/1.1.41 MatchAppLaunchIntro/1"
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
              // onPageStarted can fire before the DOM root exists. A later
              // onPageCommitVisible/onPageFinished injection will safely apply it.
              if (!root) return;
              root.classList.add('ads-empty','matchapp-android','matchapp-ai-android','is-chrome');

              if (!document.getElementById('matchapp-android-shell')) {
                var s = document.createElement('style');
                s.id = 'matchapp-android-shell';
                s.textContent =
                  '.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,' +
                  '.premium-ad-frame,ins.adsbygoogle,.ma-ad-label,#chrome-notice,.chrome-notice,.install-btn' +
                  '{display:none!important;height:0!important;min-height:0!important;overflow:hidden!important;' +
                  'padding:0!important;margin:0!important;border:0!important}' +
                  'html #matchapp-kids-entry,html .ma-kids-mode-entry{display:none!important}' +
                  'html.matchapp-ai-android{--android-gold:#e5c158;--android-violet:#8d5cff}' +
                  'html.matchapp-ai-android :is(button,a,[role="button"],.pill,.card){-webkit-tap-highlight-color:transparent}' +
                  'html.matchapp-ai-android :is(button,a,[role="button"]):active{transform:scale(.975);transition:transform 90ms ease}' +
                  'html.matchapp-ai-android .matchapp-android-thinking{animation:matchappAndroidBreathe 1.15s ease-in-out infinite}' +
                  '@keyframes matchappAndroidBreathe{50%{filter:drop-shadow(0 0 14px rgba(229,193,88,.55));transform:scale(1.015)}}' +
                  '#matchapp-android-avatar-launcher{position:relative;z-index:40;display:flex;flex-direction:column;align-items:center;gap:8px;width:max-content;max-width:100%;margin:8px auto 4px;pointer-events:none}' +
                  '#matchapp-android-avatar-launcher button,#matchapp-android-avatar-launcher .jonas-copy{pointer-events:auto}' +
                  '#matchapp-android-avatar-launcher .jonas-face{width:var(--jonas-size,156px);height:var(--jonas-size,156px);padding:0;border:3px solid #e5c158;border-radius:50%;overflow:hidden;background:#140c22;box-shadow:0 12px 32px rgba(0,0,0,.45),0 0 0 6px rgba(229,193,88,.16)}' +
                  '#matchapp-android-avatar-launcher .jonas-face img{width:100%;height:100%;display:block;object-fit:cover;object-position:center 18%;border-radius:50%}' +
                  '#matchapp-android-avatar-launcher .jonas-copy{max-width:min(78vw,280px);text-align:center;color:#f7f2ff;text-shadow:0 2px 10px #000}' +
                  '#matchapp-android-avatar-launcher .jonas-copy strong{display:block;font-size:13px}' +
                  '#matchapp-android-avatar-launcher .jonas-copy span{display:block;margin-top:3px;font-size:12px;line-height:1.35;color:#ddd4ef}' +
                  '#matchapp-android-avatar-launcher.is-compact{position:fixed;z-index:2147483000;top:max(8px, env(safe-area-inset-top));right:12px;left:auto;margin:0;flex-direction:row;gap:8px;padding:4px 10px 4px 4px;border-radius:999px;background:rgba(10,7,18,.92);border:1px solid rgba(229,193,88,.5);transform:none}' +
                  '#matchapp-android-avatar-launcher.is-compact .jonas-copy span,#matchapp-android-avatar-launcher.is-compact .jonas-live{display:none}' +
                  '#matchapp-android-avatar-launcher .jonas-live{min-height:32px;padding:0 8px;border:0;background:transparent;color:#e5c158;font-size:11px;font-weight:800;text-decoration:underline}' +
                  '#matchapp-android-avatar-spacer{width:100%;pointer-events:none}' +
                  '@media(prefers-reduced-motion:reduce){html.matchapp-ai-android *,html.matchapp-ai-android *:before,html.matchapp-ai-android *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}';
                (document.head || root).appendChild(s);
              }

              document.querySelectorAll('ins.adsbygoogle,.ad-banner-container').forEach(function(el){ el.remove(); });

              // Native AdMob is separate from the website's AdSense surface. Keep native
              // ads OFF until account entitlement is known; paid/ad-free accounts therefore
              // fail closed instead of briefly flashing a banner while auth hydrates.
              function syncNativeAdEntitlement() {
                var bridge = window.MatchAppNativeExperience;
                if (!bridge || typeof bridge.setAdFree !== 'function') return;

                var state = window.matchProfileState && window.matchProfileState.status;
                if (state === 'signedout') {
                  try { bridge.setAdFree(false); } catch (_) {}
                  return;
                }
                if (window.isUserLoggedIn !== true) {
                  try { bridge.setAdFree(true); } catch (_) {}
                  return;
                }

                // Authenticated accounts remain ad-free while the authoritative profile
                // row is resolved. VIP, Business and one-time Ad-Free entitlements all win.
                try { bridge.setAdFree(true); } catch (_) {}
                var client = window.supabaseClient;
                if (!client || !client.from) return;

                var sessionPromise;
                try {
                  sessionPromise = typeof window.ensureCompactMatchSession === 'function'
                    ? window.ensureCompactMatchSession()
                    : client.auth.getSession();
                } catch (_) { return; }

                Promise.resolve(sessionPromise).then(function(sessionResult){
                  var user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
                  if (!user || !user.id) return;
                  return client.from('profiles')
                    .select('is_vip,is_business,is_ad_free')
                    .eq('id', user.id)
                    .maybeSingle();
                }).then(function(result){
                  if (!result || result.error || !result.data) return;
                  var profile = result.data;
                  var adFree = profile.is_vip === true ||
                    profile.is_business === true ||
                    profile.is_ad_free === true;
                  try { bridge.setAdFree(adFree); } catch (_) {}
                }).catch(function(){
                  // Keep the safe ad-free default on entitlement/network errors.
                });
              }

              if (!window.__matchAppNativeAdEntitlementBound) {
                window.__matchAppNativeAdEntitlementBound = true;
                document.addEventListener('matchapp:authchange', function(){
                  setTimeout(syncNativeAdEntitlement, 0);
                });
                document.addEventListener('matchapp:profilehydrated', function(){
                  setTimeout(syncNativeAdEntitlement, 0);
                });
              }
              setTimeout(syncNativeAdEntitlement, 450);
              setTimeout(syncNativeAdEntitlement, 1600);

              function configureAndroidKidsEntry() {
                document.querySelectorAll('#matchapp-kids-entry,.ma-kids-mode-entry').forEach(function(kids){
                  kids.hidden = true;
                  kids.style.setProperty('display','none','important');
                  kids.setAttribute('aria-hidden','true');
                  kids.setAttribute('tabindex','-1');
                });
              }

              function showAndroidKidsNotice() {
                if (document.getElementById('matchapp-android-kids-notice')) return;
                var lang = String(window.MATCH_LANG || document.documentElement.lang || 'en').toLowerCase();
                var pt = lang.indexOf('pt') === 0;
                var copy = pt ? {
                  title: 'MatchApp Ai Kids em breve no Google Play',
                  body: 'O app MatchApp Ai Kids ainda não está disponível dentro deste aplicativo. Enquanto isso, você pode usar o MatchApp Kids normalmente no navegador do seu smartphone.',
                  open: 'Abrir MatchApp Kids no navegador',
                  close: 'Agora não'
                } : {
                  title: 'MatchApp Ai Kids is coming soon to Google Play',
                  body: 'MatchApp Ai Kids is not available inside this app yet. For now, you can use MatchApp Kids normally in your smartphone browser.',
                  open: 'Open MatchApp Kids in browser',
                  close: 'Not now'
                };

                var overlay = document.createElement('div');
                overlay.id = 'matchapp-android-kids-notice';
                overlay.setAttribute('role','dialog');
                overlay.setAttribute('aria-modal','true');
                overlay.setAttribute('aria-label',copy.title);
                overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(4,3,8,.82);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px';

                var card = document.createElement('div');
                card.style.cssText = 'width:min(92vw,440px);background:linear-gradient(145deg,#171126,#090812);border:1px solid rgba(229,193,88,.48);border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.55);text-align:center;color:#fff';

                var logo = document.createElement('img');
                logo.src = '/kids/kids-logo-sm.jpeg';
                logo.alt = '';
                logo.width = 62;
                logo.height = 62;
                logo.style.cssText = 'border-radius:50%;object-fit:cover;margin:0 auto 14px;display:block';

                var title = document.createElement('h2');
                title.textContent = copy.title;
                title.style.cssText = 'margin:0 0 10px;font-size:20px;line-height:1.25;color:#f3d875';

                var body = document.createElement('p');
                body.textContent = copy.body;
                body.style.cssText = 'margin:0 0 20px;color:#d7d1e2;font-size:14px;line-height:1.55';

                var open = document.createElement('button');
                open.type = 'button';
                open.textContent = copy.open;
                open.style.cssText = 'width:100%;border:0;border-radius:999px;padding:13px 16px;background:linear-gradient(135deg,#e5c158,#f4dd83);color:#17110a;font-weight:900;font-size:14px;cursor:pointer';

                var close = document.createElement('button');
                close.type = 'button';
                close.textContent = copy.close;
                close.style.cssText = 'width:100%;border:0;background:transparent;color:#aaa1bc;padding:12px 10px 2px;font-weight:700;font-size:13px;cursor:pointer';

                function dismiss(){ overlay.remove(); }
                open.addEventListener('click', function(){
                  try { window.MatchAppNativeExperience && window.MatchAppNativeExperience.openKidsBrowser(); }
                  catch (_) {}
                  dismiss();
                });
                close.addEventListener('click', dismiss);
                overlay.addEventListener('click', function(e){ if (e.target === overlay) dismiss(); });

                card.append(logo,title,body,open,close);
                overlay.appendChild(card);
                document.body.appendChild(overlay);
                requestAnimationFrame(function(){ open.focus(); });
              }

              // Owner beta: launcher appears only inside the Android app, never on the website.
              // Server-side Realtime remains owner-gated until a metered public usage policy exists.
              // Avatar controls belong inside Ask AI, never above other controls.
              document.getElementById('matchapp-android-avatar-launcher')?.remove();

              // Only the installed Android shell gets gesture and speech handoff
              // recovery. Keep shared site scripts, desktop, and Kids untouched.
              function installAndroidInteractionRecovery() {
                // Conversation polish wraps readAloud with browser-only speechSynthesis.
                // Restore the original player on Android so it uses our native TTS
                // bridge, including automatic replies after microphone prompts.
                var speechPlayer=window.readAloud;
                if(window.MatchAppNativeVoice && typeof window.MatchAppNativeVoice.speak==='function' &&
                   typeof speechPlayer==='function' && speechPlayer.__humanPatched &&
                   typeof speechPlayer.__original==='function') {
                  window.readAloud=speechPlayer.__original;
                  speechPlayer=window.readAloud;
                }
                if(typeof speechPlayer==='function' && !speechPlayer.__avatarCaption){
                  var captioned=function(text, btn){
                    var cap=document.getElementById('matchapp-android-avatar-caption');
                    var spoken=String(text||'').replace(/\s+/g,' ').trim();
                    if(cap && spoken) cap.textContent=spoken.slice(0, 220);
                    return speechPlayer.call(this, text, btn);
                  };
                  captioned.__avatarCaption=true;
                  captioned.__original=speechPlayer.__original||speechPlayer;
                  window.readAloud=captioned;
                }
                if(!window.__matchappAndroidVoiceSubmitBound){
                  window.__matchappAndroidVoiceSubmitBound=true;
                  document.addEventListener('matchapp:voice-transcript',function(event){
                    var data=event.detail||{}, value=String(data.text||'').trim();
                    if(!value || (data.inputId!=='discover-new-input' && data.inputId!=='specific-search-input'))return;
                    // The existing final-recognition callback submits synchronously.
                    // Rescue only if the text is still waiting after it has returned;
                    // this avoids a second AI call or a second credit debit.
                    setTimeout(function(){
                      var field=document.getElementById(data.inputId);
                      if(!field || String(field.value||'').trim()!==value)return;
                      if(data.inputId==='discover-new-input' && typeof window.newDiscoverSearch==='function'){
                        window.newDiscoverSearch();
                      }else if(data.inputId==='specific-search-input'){
                        field.closest('.home-ask-composer')?.querySelector('.gold-btn')?.click();
                      }
                    },400);
                  });
                }
                var vp=document.getElementById('marquee-viewport');
                if(!vp || vp.dataset.androidSwipeReady==='1')return;
                vp.dataset.androidSwipeReady='1';
                vp.style.setProperty('overflow-x','auto','important');
                vp.style.setProperty('touch-action','pan-y','important');
                var start=null, suppressTapUntil=0;
                vp.addEventListener('touchstart',function(e){
                  if(e.touches.length!==1)return;
                  var touch=e.touches[0];
                  start={x:touch.clientX,y:touch.clientY,scroll:vp.scrollLeft,moved:false};
                  vp.__railHold?.();
                },{passive:true});
                vp.addEventListener('touchmove',function(e){
                  if(!start || e.touches.length!==1)return;
                  var touch=e.touches[0],dx=start.x-touch.clientX,dy=start.y-touch.clientY;
                  if(!start.moved && Math.abs(dx)<10)return;
                  if(!start.moved && Math.abs(dx)<=Math.abs(dy)*1.18)return;
                  start.moved=true;
                  if(e.cancelable)e.preventDefault();
                  vp.scrollLeft=start.scroll+dx;
                  vp.__railHold?.();
                  suppressTapUntil=Date.now()+550;
                },{passive:false});
                function finishAndroidSwipe(){start=null;}
                vp.addEventListener('touchend',finishAndroidSwipe,{passive:true});
                vp.addEventListener('touchcancel',finishAndroidSwipe,{passive:true});
                vp.addEventListener('click',function(e){
                  if(Date.now()<suppressTapUntil && e.target.closest?.('.marquee-item')){
                    e.preventDefault();e.stopImmediatePropagation();
                  }
                },true);
              }
              installAndroidInteractionRecovery();
              setTimeout(installAndroidInteractionRecovery,500);
              setTimeout(installAndroidInteractionRecovery,1500);
              setTimeout(installAndroidInteractionRecovery,3200);

              configureAndroidKidsEntry();
              setTimeout(configureAndroidKidsEntry, 450);
              setTimeout(configureAndroidKidsEntry, 1400);

              if (!window.__matchAppAndroidKidsNoticeBound) {
                window.__matchAppAndroidKidsNoticeBound = true;
                document.addEventListener('click', function(e){
                  var kids = e.target && e.target.closest && e.target.closest('#matchapp-kids-entry,.ma-kids-mode-entry');
                  if (!kids) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  showAndroidKidsNotice();
                }, true);
              }

              // Google Play policy guard: the Play-distributed Android app must never
              // fall through to the website's Stripe checkout for digital goods.
              // This guard is Android-only and will be replaced by the native Play
              // purchase bridge once the Play catalog is activated.
              if (!window.__matchAppAndroidBillingGuard) {
                window.__matchAppAndroidBillingGuard = true;
                document.addEventListener('click', function(e){
                  var button = e.target && e.target.closest && e.target.closest(
                    '#btn-ad_free,#btn-vip_monthly,#btn-vip_annual,#btn-business,' +
                    '[data-match-pack],[data-credit-pack]'
                  );
                  if (!button) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  var key = button.id && button.id.indexOf('btn-') === 0
                    ? button.id.slice(4)
                    : (button.getAttribute('data-match-pack') || button.getAttribute('data-credit-pack') || '');
                  var message = key === 'ad_free'
                    ? 'Ad-free access on Android is included with VIP and Business. Google Play purchases are being activated for this release.'
                    : 'Google Play purchases are being activated for this Android release. Please try again after the next Play update.';
                  try {
                    if (typeof window.showToast === 'function') window.showToast(message);
                    else window.alert(message);
                  } catch (_) {}
                }, true);
              }

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
