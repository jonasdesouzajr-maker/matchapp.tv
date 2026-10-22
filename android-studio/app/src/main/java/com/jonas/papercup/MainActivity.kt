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
import android.os.Build
import android.os.Message
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognizerIntent
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import android.Manifest
import android.content.pm.PackageManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.View
import android.view.ViewGroup
import android.view.MotionEvent
import android.view.HapticFeedbackConstants
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
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
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewCompat
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
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.json.JSONObject
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var offline: View
    private lateinit var fullscreenHost: FrameLayout
    private var adMobController: AdMobController? = null
    private var nativeRewardedBridge: NativeRewardedBridge? = null
    private var nativePlayBillingBridge: NativePlayBillingBridge? = null
    private var nativeNewsBridge: NativeNewsBridge? = null

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var splashKeep = false
    private var introHost: FrameLayout? = null
    private var introVideo: VideoView? = null
    private val introDeadline = Runnable { finishIntro() }
    private var introRevealFailsafe: Runnable? = null
    private var startupHost: FrameLayout? = null
    private val startupDeadline = Runnable { finishStartupTransition() }
    private val startupPrefs by lazy { getSharedPreferences(STARTUP_PREFS, MODE_PRIVATE) }
    private var growthReferrer: GrowthInstallReferrer? = null
    private var growthCanRestore = false
    private var lastUrl = HOME
    private var pageUiState: String? = null
    private var pendingPageUiState: String? = null
    private data class ScrollRestore(val url: String, val x: Int, val y: Int, var ownedByPage: Boolean = false)
    private var pendingScrollRestore: ScrollRestore? = null
    private var activityResumed = false
    private var permissionSetupShowing = false
    private val nativePageStateScript by lazy {
        runCatching { assets.open("native-page-state.js").bufferedReader().use { it.readText() } }.getOrNull()
    }
    private var voiceTts: TextToSpeech? = null
    private var voiceTtsReady = false
    private var currentVoiceText = ""
    private var pendingVoiceUtterance: Pair<String, String?>? = null

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

    // Inline Android SpeechRecognizer: keeps Jonas visible instead of opening
    // the Google full-screen speech intent. Starts only with a user-initiated voice conversation.
    private var inlineVoiceRecognizer: SpeechRecognizer? = null
    private var requestedVoiceLanguage = "en-US"
    private var microphonePermissionPending = false
    private val microphonePermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val waiting = microphonePermissionPending
        microphonePermissionPending = false
        if (granted && waiting) startInlineRecognition(requestedVoiceLanguage)
        else if (!granted && waiting) sendVoiceError("permission-denied")
    }

    // This launcher grants capabilities only: no recording or location lookup.
    private val initialPermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        startupPrefs.edit().putBoolean(PREF_PERMISSION_SETUP, true).apply()
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
        // Preserve the current edge-to-edge shell on older supported Android releases.
        @Suppress("DEPRECATION")
        window.statusBarColor = Color.TRANSPARENT
        @Suppress("DEPRECATION")
        window.navigationBarColor = ContextCompat.getColor(this, R.color.ink)

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
        voiceTts = TextToSpeech(this) { status ->
            voiceTtsReady = status == TextToSpeech.SUCCESS
            if (voiceTtsReady) {
                voiceTts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) = sendVoiceSpeakingState(true)
                    override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                        if (utteranceId != "matchapp-ai-reply") return
                        val snapshot = currentVoiceText
                        if (start >= 0 && end > start && end <= snapshot.length) {
                            sendVoiceWordRange(snapshot.substring(start, end).take(35))
                        }
                    }
                    override fun onDone(utteranceId: String?) = sendVoiceSpeakingState(false)
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) = sendVoiceSpeakingState(false)
                    override fun onError(utteranceId: String?, errorCode: Int) = sendVoiceSpeakingState(false)
                })
                runOnUiThread {
                    val pending = pendingVoiceUtterance
                    pendingVoiceUtterance = null
                    if (pending != null) speakVoiceText(pending.first, pending.second)
                }
            } else {
                pendingVoiceUtterance = null
            }
        }
        applySafeInsets()
        findViewById<MaterialButton>(R.id.retry).setOnClickListener { retry() }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setGeolocationEnabled(true)
            // WebAuthn via Android Credential Manager for signed-in passkey enrollment.
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
                WebSettingsCompat.setWebAuthenticationSupport(
                    this,
                    WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
                )
            }
            // Preserve the existing WebView storage compatibility behavior.
            @Suppress("DEPRECATION")
            databaseEnabled = true
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            // Always cold-load current production HTML/assets when the Android
            // activity starts; normal caching resumes after the first page finishes.
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = false
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
        installPageStateBridge()
        web.addJavascriptInterface(NativeVoiceBridge(), "MatchAppNativeVoice")
        web.addJavascriptInterface(NativeStartupBridge(), "MatchAppNativeStartup")
        web.addJavascriptInterface(NativeExperienceBridge(), "MatchAppNativeExperience")
        web.addJavascriptInterface(NativeAuthBridge(), "MatchAppNativeAuth")
        nativeRewardedBridge = NativeRewardedBridge(
            this, web,
            { adMobController?.canRequestRewarded() == true },
            RewardedClaimClient::verify
        ).also { it.install() }
        nativePlayBillingBridge = NativePlayBillingBridge(this, web).also { it.install() }
        if (BuildConfig.ADMOB_NATIVE_NEWS_ENABLED) {
            nativeNewsBridge = NativeNewsBridge(this, web, findViewById(R.id.root)) {
                adMobController?.canRequestRewarded() == true
            }.also { it.install() }
        }
        web.setDownloadListener { url, _, contentDisposition, mime, _ ->
            val name = URLUtil.guessFileName(url, contentDisposition, mime)
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            try {
                startActivity(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(this, name, Toast.LENGTH_SHORT).show()
            }
        }

        // A downward page gesture scrolls content; it never destroys the current
        // result, draft or route by performing a browser document reload.
        refresh.isEnabled = false

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                cancelPendingPageRestore()
                when {
                    introHost != null -> finishIntro()
                    customView != null -> hideCustomView()
                    web.canGoBack() -> web.goBack()
                    else -> finish()
                }
            }
        })

        if (savedInstanceState == null) startStartupExperience()

        // Android may recreate a stopped Activity to deliver a new app link.
        // That link wins, while the original consumed launch still permits
        // rotation/process restoration of the screen the user navigated to.
        val currentLaunch = launchIntentFingerprint(intent)
        val restoreSavedScreen = NativeLaunchPolicy.shouldRestoreSavedScreen(
            savedInstanceState?.getString(STATE_LAUNCH_INTENT), currentLaunch
        )
        val savedUrl = if (restoreSavedScreen)
            NativeLaunchPolicy.restorableUrl(savedInstanceState?.getString(STATE_URL)) else null
        // The launcher may create a fresh Activity without a saved Bundle after
        // process death. Only a data-less launch may use this disk fallback.
        val checkpoint = if (savedUrl == null && currentLaunch == null) readScreenCheckpoint() else null
        val restoredUrl = savedUrl ?: NativeLaunchPolicy.checkpointFallbackUrl(
            savedUrl, currentLaunch, checkpoint?.getString(STATE_URL)
        )
        val restoreState = if (savedUrl != null) savedInstanceState else checkpoint
        pendingPageUiState = restoredUrl?.let { validatedPageState(restoreState?.getString(STATE_UI), it) }
        pendingScrollRestore = restoredUrl?.let {
            ScrollRestore(it, (restoreState?.getInt(STATE_SCROLL_X) ?: 0).coerceIn(0, 1000000),
                (restoreState?.getInt(STATE_SCROLL_Y) ?: 0).coerceIn(0, 1000000))
        }
        val restored = savedUrl != null && savedInstanceState?.getBundle(STATE_WEB)?.let { state ->
            runCatching { web.restoreState(state) }.getOrNull() != null
        } == true
        val launch = restoredUrl ?: resolveLaunchUrl(intent)
        lastUrl = launch
        if (!restored) {
            if (isDebugSmokeUrl(launch) || isOnline()) web.loadUrl(launch) else {
                splashKeep = false
                showOffline(true)
            }
        }
        // Resolve a recent, explicitly requested web-to-app handoff without delaying normal startup.
        growthCanRestore = restoredUrl == null && savedInstanceState == null && currentLaunch == null
        if (growthCanRestore) {
            growthReferrer = GrowthInstallReferrer(this) { destination ->
                if (growthCanRestore && !isFinishing && !isDestroyed && lastUrl == launch) {
                    growthCanRestore = false
                    lastUrl = destination
                    web.loadUrl(destination)
                }
            }.also { it.start() }
        }
    }

    private fun applySafeInsets() {
        // One safe-area owner surrounds the existing WebView/ad layout, including
        // when the ad shell is gone. Ad sizing stays unchanged; fullscreen intro
        // and video are sibling layers outside these insets.
        val content = refresh.parent as View
        for (target in listOf(content, offline)) {
            val left = target.paddingLeft
            val top = target.paddingTop
            val right = target.paddingRight
            val bottom = target.paddingBottom
            ViewCompat.setOnApplyWindowInsetsListener(target) { view, insets ->
                val safe = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                )
                // adjustResize already reduces the WebView for the keyboard.
                // Do not reserve the IME height or its navigation area twice.
                val bottomSafe = if (insets.isVisible(WindowInsetsCompat.Type.ime())) 0 else safe.bottom
                view.setPadding(left + safe.left, top + safe.top, right + safe.right, bottom + bottomSafe)
                insets
            }
            ViewCompat.requestApplyInsets(target)
        }
    }

    override fun onNewIntent(intent: Intent) {
        growthCanRestore = false
        growthReferrer?.close()
        super.onNewIntent(intent)
        setIntent(intent)
        // Tapping the launcher resumes the current screen. Only an explicit app
        // link (or the existing debug fixture) may navigate a running Activity.
        if (intent.data == null && debugSmokeLaunch(intent) == null) return
        cancelPendingPageRestore()
        val url = resolveLaunchUrl(intent)
        if (url != lastUrl) {
            lastUrl = url
            web.loadUrl(url)
        }
    }

    override fun onPause() {
        finishIntro(immediate = true)
        finishStartupTransition(immediate = true)
        activityResumed = false
        // Commit the already available route/UI/native offsets before the
        // process can be killed. JS capture may refine it, but is not required.
        persistScreenCheckpoint()
        web.evaluateJavascript("window.MatchAppNativePageCapture&&window.MatchAppNativePageCapture.capture();", null)
        nativeRewardedBridge?.onPause()
        nativePlayBillingBridge?.onPause()
        nativeNewsBridge?.onPause()
        adMobController?.pause()
        super.onPause()
        web.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onStop() {
        persistScreenCheckpoint()
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        activityResumed = true
        web.onResume()
        adMobController?.resume()
        nativeRewardedBridge?.onResume()
        nativePlayBillingBridge?.onResume()
        nativeNewsBridge?.onResume()
        // Re-resolve account entitlement after returning from browser/payment/account
        // changes. APP_MODE_JS is idempotent and keeps paid users fail-closed.
        injectAppMode(web)
        web.post { maybeShowPermissionSetup() }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(STATE_LAUNCH_INTENT, launchIntentFingerprint(intent))
        NativeLaunchPolicy.restorableUrl(web.url ?: lastUrl)?.let { url ->
            val safeHistory = runCatching {
                val entries = web.copyBackForwardList()
                NativeLaunchPolicy.canSaveHistory((0 until entries.size).flatMap {
                    val entry = entries.getItemAtIndex(it)
                    listOf(entry?.url, entry?.originalUrl)
                })
            }.getOrDefault(false)
            if (safeHistory) {
                val history = Bundle()
                if (runCatching { web.saveState(history) }.getOrNull() != null) outState.putBundle(STATE_WEB, history)
            }
            outState.putString(STATE_URL, url)
            outState.putString(STATE_UI, pageUiState ?: validatedPageState(pendingPageUiState, url))
            val pending = pendingScrollRestore?.takeIf { it.url == url }
            outState.putInt(STATE_SCROLL_X, pending?.x ?: web.scrollX)
            outState.putInt(STATE_SCROLL_Y, pending?.y ?: web.scrollY)
        }
        super.onSaveInstanceState(outState)
    }

    private fun persistScreenCheckpoint() {
        if (!this::web.isInitialized) return
        val currentUrl = web.url ?: lastUrl
        val url = NativeLaunchPolicy.checkpointUrl(currentUrl)
        if (url == null) {
            // Never leave a previous account screen as the fallback when the
            // current destination is an auth/payment/private flow.
            startupPrefs.edit().remove(PREF_SCREEN_CHECKPOINT).commit()
            return
        }
        val pending = pendingScrollRestore?.takeIf { it.url == currentUrl }
        val ui = validatedPageState(pageUiState, currentUrl) ?: validatedPageState(pendingPageUiState, currentUrl)
        val safeUi = ui?.let { JSONObject(it).put("url", url).toString() }
        val checkpoint = JSONObject().put("version", 1).put("url", url)
            .put("scrollX", (pending?.x ?: web.scrollX).coerceIn(0, 1000000))
            .put("scrollY", (pending?.y ?: web.scrollY).coerceIn(0, 1000000))
        if (safeUi != null) checkpoint.put("ui", safeUi)
        // This small preference file is excluded from cloud backup and device
        // transfer. No WebView history, arbitrary query, form or result is saved.
        startupPrefs.edit().putString(PREF_SCREEN_CHECKPOINT, checkpoint.toString()).commit()
    }

    private fun readScreenCheckpoint(): Bundle? {
        val raw = startupPrefs.getString(PREF_SCREEN_CHECKPOINT, null) ?: return null
        if (raw.length > 24576) return null
        return runCatching {
            val checkpoint = JSONObject(raw)
            if (checkpoint.optInt("version") != 1) return null
            val storedUrl = checkpoint.optString("url")
            val url = NativeLaunchPolicy.checkpointUrl(storedUrl)?.takeIf { it == storedUrl } ?: return null
            Bundle().apply {
                putString(STATE_URL, url)
                putString(STATE_UI, validatedPageState(checkpoint.optString("ui"), url))
                putInt(STATE_SCROLL_X, checkpoint.optInt("scrollX").coerceIn(0, 1000000))
                putInt(STATE_SCROLL_Y, checkpoint.optInt("scrollY").coerceIn(0, 1000000))
            }
        }.getOrNull()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && this::web.isInitialized) web.post { maybeShowPermissionSetup() }
    }

    override fun onUserInteraction() {
        cancelPendingPageRestore()
        growthCanRestore = false
        nativeRewardedBridge?.recordUserInteraction()
        nativePlayBillingBridge?.recordUserInteraction()
        super.onUserInteraction()
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        nativeNewsBridge?.onActivityTouch(event)
        return super.dispatchTouchEvent(event)
    }

    override fun onDestroy() {
        growthReferrer?.close()
        growthReferrer = null
        finishIntro(immediate = true)
        finishStartupTransition(immediate = true)
        nativeRewardedBridge?.destroy()
        nativeRewardedBridge = null
        nativePlayBillingBridge?.destroy()
        nativePlayBillingBridge = null
        nativeNewsBridge?.destroy()
        nativeNewsBridge = null
        adMobController?.destroy()
        adMobController = null
        inlineVoiceRecognizer?.destroy()
        inlineVoiceRecognizer = null
        voiceTts?.stop()
        voiceTts?.shutdown()
        voiceTts = null
        voiceTtsReady = false
        fullscreenHost.removeAllViews()
        web.destroy()
        super.onDestroy()
    }

    private fun startStartupExperience() {
        val installedByPlay = runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // The installer of record can survive a subsequent sideload.
                // Unknown initiating sources fail closed through the comparison below.
                packageManager.getInstallSourceInfo(packageName).initiatingPackageName
            } else {
                // Older Android versions expose only the installer of record,
                // which cannot prove who initiated this update. Do not rearm.
                null
            }
        }.getOrNull() == "com.android.vending"
        @Suppress("DEPRECATION")
        val packageWasUpdated = runCatching { packageManager.getPackageInfo(packageName, 0) }
            .getOrNull()?.let { it.lastUpdateTime > it.firstInstallTime } == true
        val play = NativeLaunchPolicy.shouldPlayIntro(
            BuildConfig.VERSION_CODE, startupPrefs.getInt(PREF_INTRO_VERSION, 0),
            startupPrefs.getBoolean(PREF_INTRO_SEEN, false), startupPrefs.getBoolean(PREF_REGISTERED, false),
            installedByPlay, packageWasUpdated
        )
        // Consume before attempting playback: failure, skip and process death
        // must not defer the soundtrack to an unrelated later launch or click.
        val recorded = startupPrefs.edit().putInt(PREF_INTRO_VERSION,
            maxOf(startupPrefs.getInt(PREF_INTRO_VERSION, 0), BuildConfig.VERSION_CODE)).commit()
        if (play && recorded) startIntro() else startStartupTransition()
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
            web.post { maybeShowPermissionSetup() }
            return
        }
        host.animate()
            .alpha(0f)
            .setDuration(240L)
            .withEndAction {
                (host.parent as? ViewGroup)?.removeView(host)
                maybeShowPermissionSetup()
            }
            .start()
    }

    private fun markIntroSeen() {
        startupPrefs.edit().putBoolean(PREF_INTRO_SEEN, true).apply()
    }

    // The sole Android intro owner: bundled, finite and bound to package version.
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
            text = startupStrings().getString(R.string.intro_skip)
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
            // Preserve the original video soundtrack at a restrained volume.
            // The OS media-volume/mute setting remains authoritative.
            player.setVolume(0.55f, 0.55f)
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

    private fun finishIntro(immediate: Boolean = false) {
        findViewById<FrameLayout>(R.id.root)?.removeCallbacks(introDeadline)
        val host = introHost ?: return
        introHost = null
        try { introVideo?.stopPlayback() } catch (_: Exception) { }
        introVideo = null
        val content = refresh.parent as View
        var removed = false
        val remove = {
            if (!removed) {
                removed = true
                ViewCompat.setOnApplyWindowInsetsListener(host, null)
                host.removeCallbacks(introRevealFailsafe)
                (host.parent as? ViewGroup)?.removeView(host)
                web.post { maybeShowPermissionSetup() }
            }
        }
        // Keep the opaque intro layer until the content has been laid out with
        // the restored system-bar insets, so the dock is never drawn against
        // the stale fullscreen geometry for a frame.
        if (!immediate && activityResumed && content.isAttachedToWindow) {
            // Safety net only if the platform never reports visible bars.
            introRevealFailsafe = Runnable { remove() }
            host.postDelayed(introRevealFailsafe, 1000L)
            ViewCompat.setOnApplyWindowInsetsListener(host) { _, insets ->
                if (insets.isVisible(WindowInsetsCompat.Type.systemBars())) {
                    androidx.core.view.OneShotPreDrawListener.add(content) { remove() }
                    content.requestLayout()
                }
                insets
            }
        }
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
        ViewCompat.requestApplyInsets(content)
        val current = ViewCompat.getRootWindowInsets(content)
        if (immediate || !activityResumed || !content.isAttachedToWindow ||
            current == null || current.isVisible(WindowInsetsCompat.Type.systemBars())) remove()
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

    private fun launchIntentFingerprint(intent: Intent?): String? =
        NativeLaunchPolicy.launchIntentFingerprint(intent?.action, debugSmokeLaunch(intent) ?: intent?.dataString)

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

    private fun installPageStateBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
        WebViewCompat.addWebMessageListener(web, "MatchAppNativePageState",
            setOf("https://matchapp.tv", "https://www.matchapp.tv")) { view, message, origin, mainFrame, _ ->
            if (!mainFrame || origin.scheme != "https" ||
                origin.host !in setOf("matchapp.tv", "www.matchapp.tv")) return@addWebMessageListener
            val raw = runCatching { message.data }.getOrNull() ?: return@addWebMessageListener
            // Do not replace a pending native offset with a short document's
            // temporary scroll position before its visual callback completes.
            if (pendingScrollRestore?.let { !it.ownedByPage && it.url == view.url } == true) return@addWebMessageListener
            pageUiState = validatedPageState(raw, view.url) ?: return@addWebMessageListener
            if (pendingScrollRestore?.let { it.ownedByPage && it.url == view.url } == true) pendingScrollRestore = null
            if (!activityResumed) persistScreenCheckpoint()
            val language = runCatching { JSONObject(pageUiState!!).optString("lang") }.getOrDefault("")
            if (language in APP_LANGUAGES) startupPrefs.edit().putString(PREF_APP_LANGUAGE, language).apply()
        }
    }

    private fun validatedPageState(raw: String?, currentUrl: String?): String? {
        if (raw == null || raw.length > 16384 || NativeLaunchPolicy.restorableUrl(currentUrl) == null) return null
        return runCatching {
            val input = JSONObject(raw)
            if (input.optInt("version") != 1 || input.optString("url") != currentUrl) return null
            val filters = JSONObject()
            val supplied = input.optJSONObject("filters") ?: JSONObject()
            for (id in PAGE_FILTER_IDS) {
                val values = supplied.optJSONArray(id) ?: continue
                if (values.length() > 40) return null
                val selected = org.json.JSONArray()
                for (index in 0 until values.length()) {
                    val value = values.optString(index)
                    if (value.length > 128) return null
                    selected.put(value)
                }
                filters.put(id, selected)
            }
            JSONObject().put("version", 1).put("url", currentUrl).put("filters", filters)
                .put("scrollX", input.optInt("scrollX").coerceIn(0, 1000000))
                .put("scrollY", input.optInt("scrollY").coerceIn(0, 1000000))
                .put("lang", input.optString("lang").takeIf { it in APP_LANGUAGES }.orEmpty())
                .toString()
        }.getOrNull()
    }

    private fun injectPageState(view: WebView) {
        if (NativeLaunchPolicy.restorableUrl(view.url) == null) return
        val source = nativePageStateScript ?: return
        val restored = validatedPageState(pendingPageUiState, view.url)
        // A redirect or newer explicit app link invalidates the old screen's
        // snapshot; it must not be applied later when the user visits that URL.
        pendingPageUiState = null
        if (restored != null && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            pageUiState = restored
            pendingScrollRestore?.takeIf { it.url == view.url }?.ownedByPage = true
        }
        view.evaluateJavascript(
            (if (restored != null) "window.__MATCHAPP_NATIVE_RESTORE__=$restored;" else "") + source,
            null
        )
    }

    private fun cancelPendingPageRestore() {
        val pending = pendingPageUiState != null || pendingScrollRestore != null
        pendingPageUiState = null
        pendingScrollRestore = null
        if (pending) pageUiState = null
        if (pending && this::web.isInitialized && NativeLaunchPolicy.restorableUrl(web.url) != null) {
            web.evaluateJavascript("window.MatchAppNativePageCapture&&window.MatchAppNativePageCapture.cancelRestore&&window.MatchAppNativePageCapture.cancelRestore();delete window.__MATCHAPP_NATIVE_RESTORE__;", null)
        }
    }

    private fun restorePendingScroll(view: WebView, attempt: Int = 0) {
        val pending = pendingScrollRestore ?: return
        if (pending.ownedByPage || isFinishing || isDestroyed) return
        if (view.url != pending.url) { pendingScrollRestore = null; return }
        // A posted runnable during onCreate runs before content has height.
        // This fallback also covers safe-URL reloads when history/state JS is unavailable.
        view.postVisualStateCallback(0L, object : WebView.VisualStateCallback() {
            override fun onComplete(requestId: Long) {
                if (pendingScrollRestore !== pending || pending.ownedByPage || isFinishing || isDestroyed) return
                if (view.url != pending.url) { pendingScrollRestore = null; return }
                view.scrollTo(pending.x, pending.y)
                if (attempt < 12 && (kotlin.math.abs(view.scrollX - pending.x) > 2 || kotlin.math.abs(view.scrollY - pending.y) > 2)) {
                    view.postDelayed({ restorePendingScroll(view, attempt + 1) }, 100L)
                } else {
                    pendingScrollRestore = null
                    view.evaluateJavascript("window.MatchAppNativePageCapture&&window.MatchAppNativePageCapture.capture();", null)
                }
            }
        })
    }

    private fun startupStrings(language: String? = startupPrefs.getString(PREF_APP_LANGUAGE, null)): android.content.Context {
        val selected = language?.takeIf { it in APP_LANGUAGES } ?: return this
        val configuration = android.content.res.Configuration(resources.configuration)
        configuration.setLocale(Locale.forLanguageTag(selected))
        return createConfigurationContext(configuration)
    }

    private fun missingStartupPermissions(): Array<String> =
        listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.ACCESS_COARSE_LOCATION)
            .filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
            .toTypedArray()

    private fun maybeShowPermissionSetup() {
        if (!activityResumed || isFinishing || isDestroyed || !hasWindowFocus() ||
            introHost != null || startupHost != null || permissionSetupShowing ||
            startupPrefs.getBoolean(PREF_PERMISSION_SETUP, false) ||
            NativeLaunchPolicy.restorableUrl(web.url) == null || web.progress < 100) return
        if (missingStartupPermissions().isEmpty()) {
            startupPrefs.edit().putBoolean(PREF_PERMISSION_SETUP, true).apply()
            return
        }
        permissionSetupShowing = true
        web.evaluateJavascript("(window.MATCH_LANG||document.documentElement.lang||'')") { encoded ->
            if (!activityResumed || isFinishing || isDestroyed || !hasWindowFocus() ||
                introHost != null || startupHost != null ||
                startupPrefs.getBoolean(PREF_PERMISSION_SETUP, false) ||
                NativeLaunchPolicy.restorableUrl(web.url) == null || web.progress < 100) {
                permissionSetupShowing = false
                return@evaluateJavascript
            }
            val language = runCatching { JSONObject("{\"lang\":$encoded}").optString("lang") }.getOrNull()
            val copy = startupStrings(language)
            val complete = { startupPrefs.edit().putBoolean(PREF_PERMISSION_SETUP, true).apply() }
            val dialog = MaterialAlertDialogBuilder(this)
                .setTitle(copy.getString(R.string.permission_setup_title))
                .setMessage(copy.getString(R.string.permission_setup_body))
                .setPositiveButton(copy.getString(R.string.permission_setup_allow)) { _, _ ->
                    complete()
                    val missing = missingStartupPermissions()
                    if (missing.isNotEmpty()) initialPermissions.launch(missing)
                }
                .setNegativeButton(copy.getString(R.string.permission_setup_skip)) { _, _ -> complete() }
                .setOnCancelListener { complete() }
                .setOnDismissListener { permissionSetupShowing = false }
                .create()
            dialog.show()
        }
    }

    private fun injectAmbientJonas(view: WebView) {
        // The native shell only loads this same-origin, remotely maintained UI.
        // Future Jonas panel layout and conversational fixes do not require AAB updates.
        val url = runCatching { Uri.parse(view.url.orEmpty()) }.getOrNull() ?: return
        if ((!isMatchAppHost(url.host.orEmpty()) && !isDebugSmokeUrl(url.toString())) || isKidsUri(url)) return
        if (BuildConfig.DEBUG) {
            // Instant same-origin preview, even when the production page has
            // parser-blocking scripts in its head. Never bundled in RELEASE.
            val staged = runCatching {
                assets.open("ambient-preview/jonas/android-ambient-assistant-20261011.js")
                    .bufferedReader().use { it.readText() }
            }.getOrNull()
            if (staged != null) {
                view.evaluateJavascript(staged, null)
                return
            }
        }
        view.evaluateJavascript(
            """
            (function() {
              if (window.top !== window || document.getElementById('matchapp-ambient-jonas-script')) return;
              var script = document.createElement('script');
              script.id = 'matchapp-ambient-jonas-script';
              script.async = true;
              script.src = '/jonas/android-ambient-assistant-20261011.js?live=' + Date.now() + '&stellar=20261020-1';
              (document.head || document.documentElement).appendChild(script);
            })();
            """.trimIndent(), null
        )
    }

    private fun debugAmbientPreview(url: String): WebResourceResponse? {
        // Debug APK alone can preview unreleased Jonas UI while visiting the
        // actual first-party origin; release/AAB bundles never ship these assets.
        if (!BuildConfig.DEBUG) return null
        val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return null
        if (uri.scheme != "https" || !isMatchAppHost(uri.host.orEmpty())) return null
        val relative = when (uri.path.orEmpty()) {
            "/jonas/android-ambient-assistant-20261011.js" -> "jonas/android-ambient-assistant-20261011.js"
            "/jonas/android-ambient-assistant-20261011.css" -> "jonas/android-ambient-assistant-20261011.css"
            "/jonas/android-ambient-embed-20261011.css" -> "jonas/android-ambient-embed-20261011.css"
            "/jonas/narrated-transcript-20261011.js" -> "jonas/narrated-transcript-20261011.js"
            "/voice-input.js" -> "voice-input.js"
            "/discover.js" -> "discover.js"
            else -> return null
        }
        return runCatching {
            val mime = if (relative.endsWith(".css")) "text/css" else "application/javascript"
            WebResourceResponse(mime, "UTF-8", assets.open("ambient-preview/$relative")).apply {
                responseHeaders = mapOf("Cache-Control" to "no-store",
                    "Access-Control-Allow-Origin" to "https://matchapp.tv")
            }
        }.getOrNull()
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
            return debugAmbientPreview(request.url.toString()) ?: AdBlocker.intercept(request.url.toString())
        }

        @Deprecated("Deprecated in Java")
        override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
            return debugAmbientPreview(url) ?: AdBlocker.intercept(url)
        }

        override fun onPageCommitVisible(view: WebView, url: String?) {
            // Home can spend seconds parsing head resources. The assistant's
            // persistent bubble must be available before onPageFinished.
            injectAppMode(view)
            injectAmbientJonas(view)
            injectPageState(view)
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            nativeRewardedBridge?.onNavigation()
            nativePlayBillingBridge?.onNavigation()
            nativeNewsBridge?.onNavigation()
            val uri = url?.let { runCatching { Uri.parse(it) }.getOrNull() }
            if (uri != null && isKidsUri(uri)) {
                view.stopLoading()
                lastUrl = HOME
                view.loadUrl(HOME)
                return
            }
            if (uri != null && isAdultAiDocument(uri)) view.settings.cacheMode = WebSettings.LOAD_NO_CACHE
            if (pendingScrollRestore?.let { it.url != url } == true) cancelPendingPageRestore()
            lastUrl = url ?: lastUrl
            if (runCatching { JSONObject(pageUiState.orEmpty()).optString("url") }.getOrNull() != url) pageUiState = null
            injectAppMode(view)
            if (uri != null && (isMatchAppHost(uri.host.orEmpty()) || isDebugSmokeUrl(url))) {
                // Retry early injection while the document is being parsed;
                // onPageCommitVisible and onPageFinished remain safe fallbacks.
                view.postDelayed({ injectAmbientJonas(view) }, 400L)
                view.postDelayed({ injectAmbientJonas(view) }, 1500L)
            }
        }

        override fun onPageFinished(view: WebView, url: String?) {
            splashKeep = false
            finishStartupTransition()
            refresh.isRefreshing = false
            view.settings.cacheMode = WebSettings.LOAD_DEFAULT
            injectAppMode(view)
            injectAmbientJonas(view)
            injectPageState(view)
            restorePendingScroll(view)
            CookieManager.getInstance().flush()
            maybeShowPermissionSetup()
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
        // Maps can redirect to an intent: URL that WebView cannot render.
        // Hand off the validated HTTPS search before the Google auth allowlist.
        if (NativeCinemaNavigationPolicy.isSearchUrl(uri.toString())) return openCinemaMaps(uri)
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

    private fun openCinemaMaps(uri: Uri): Boolean {
        try {
            // The OS chooses Maps or a browser from the original HTTPS URL.
            // Do not load it in the main WebView or parse arbitrary intent data.
            startActivity(Intent(Intent.ACTION_VIEW, uri).apply {
                addCategory(Intent.CATEGORY_BROWSABLE)
            })
        } catch (_: ActivityNotFoundException) {
            showCinemaMapsUnavailable()
        } catch (_: SecurityException) {
            showCinemaMapsUnavailable()
        }
        // Missing/disabled handlers must leave the current MatchApp page usable.
        return true
    }

    private fun showCinemaMapsUnavailable() {
        Toast.makeText(this, startupStrings().getString(R.string.cinema_maps_unavailable), Toast.LENGTH_LONG).show()
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

    private fun sendVoicePartial(text: String) {
        val value = JSONObject.quote(text)
        web.evaluateJavascript(
            "window.matchAppNativeVoicePartial&&window.matchAppNativeVoicePartial($value);",
            null
        )
    }

    private fun startInlineRecognition(language: String) {
        when (NativeLaunchPolicy.voicePermissionAction(
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED,
            startupPrefs.getBoolean(PREF_PERMISSION_SETUP, false)
        )) {
            NativeLaunchPolicy.VoicePermissionAction.DENY -> {
                // Respect the upfront choice and later revocation. A voice tap
                // must not repeat the OS prompt; text remains available.
                microphonePermissionPending = false
                sendVoiceError("permission-denied")
                return
            }
            NativeLaunchPolicy.VoicePermissionAction.REQUEST -> {
                requestedVoiceLanguage = language
                microphonePermissionPending = true
                microphonePermission.launch(Manifest.permission.RECORD_AUDIO)
                return
            }
            NativeLaunchPolicy.VoicePermissionAction.START -> Unit
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sendVoiceError("unavailable")
            return
        }
        inlineVoiceRecognizer?.destroy()
        inlineVoiceRecognizer = null
        val recognizer = try { SpeechRecognizer.createSpeechRecognizer(this) }
                         catch (_: Exception) { sendVoiceError("unavailable"); return }
        inlineVoiceRecognizer = recognizer
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) {
                if (inlineVoiceRecognizer !== recognizer) return
                inlineVoiceRecognizer = null
                recognizer.destroy()
                sendVoiceError(when(error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission-denied"
                    else -> "unavailable"
                })
            }
            override fun onResults(results: Bundle?) {
                if (inlineVoiceRecognizer !== recognizer) return
                inlineVoiceRecognizer = null
                recognizer.destroy()
                val transcript = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim()
                if (transcript.isNullOrBlank()) sendVoiceError("no-speech")
                else sendVoiceResult(transcript)
            }
            override fun onPartialResults(partialResults: Bundle?) {
                if (inlineVoiceRecognizer !== recognizer) return
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim()?.takeIf { it.isNotBlank() }?.let(::sendVoicePartial)
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        try { recognizer.startListening(intent) }
        catch (_: Exception) {
            inlineVoiceRecognizer = null
            recognizer.destroy()
            sendVoiceError("unavailable")
        }
    }

    private fun sendVoiceError(code: String) {
        val value = JSONObject.quote(code)
        web.evaluateJavascript(
            "window.matchAppNativeVoiceError&&window.matchAppNativeVoiceError($value);",
            null
        )
    }

    private fun sendVoiceSpeakingState(active: Boolean) {
        if (!::web.isInitialized) return
        runOnUiThread {
            web.evaluateJavascript(
                "window.matchAppNativeSpeechState&&window.matchAppNativeSpeechState(" + active + ");",
                null
            )
        }
    }

    private fun sendVoiceWordRange(fragment: String) {
        if (!::web.isInitialized || fragment.isBlank()) return
        // Only actual TTS word timing is forwarded; no synthetic phoneme clock.
        runOnUiThread {
            web.evaluateJavascript(
                "window.matchAppNativeSpeechWord&&window.matchAppNativeSpeechWord(" +
                    JSONObject.quote(fragment) + ");", null
            )
        }
    }

    private fun speakVoiceText(text: String?, languageTag: String?) {
        val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
        if (current == null ||
            (!isMatchAppHost(current.host.orEmpty()) && !isDebugSmokeUrl(current.toString()))) {
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
        // Fail closed instead of speaking using Android's default (often female) TTS.
        if (locale.language.isBlank() || !chooseJonasVoice(engine, locale)) {
            sendVoiceSpeakingState(false)
            return
        }
        engine.setSpeechRate(0.98f)
        currentVoiceText = value
        engine.speak(value, TextToSpeech.QUEUE_FLUSH, null, "matchapp-ai-reply")
    }

    /**
     * Android TTS does not expose a trustworthy voice-gender field. Never use
     * language defaults or pitch-shift female/unknown voices into a "male" voice.
     * If a voice cannot be positively identified, keep Jonas silent (text works).
     */
    private fun chooseJonasVoice(engine: TextToSpeech, locale: Locale): Boolean {
        val approvedMale = Regex(
            "(^|[^a-z])(male|man|guy|david|daniel|mark|george|fred|aaron|alex|arthur|" +
                "oliver|ryan|andrew|ricardo|jorge|pablo|diego|paulo|thiago|antonio|" +
                "henri|thomas|luca|stefan|conrad|pavel|dmitry|hamed|hemant|ichiro|" +
                "keita|madhur|yunxi|yunyang|injoon|hyunsu)([^a-z]|$)",
            RegexOption.IGNORE_CASE
        )
        val femaleOrUnknownGender = Regex(
            "(^|[^a-z])(female|woman|girl|samantha|jenny|aria|zira|susan|ava|" +
                "karen|helena|luciana|joana)([^a-z]|$)|x-sfg|x-tpf|x-iog|-f\\d",
            RegexOption.IGNORE_CASE
        )
        val eligible = engine.voices.orEmpty()
            .filterNot { it.isNetworkConnectionRequired }
            .filter { it.locale.language.equals(locale.language, ignoreCase = true) }
            .filter { approvedMale.containsMatchIn(it.name.orEmpty()) }
            .filterNot { femaleOrUnknownGender.containsMatchIn(it.name.orEmpty()) }
        val selected = eligible.maxByOrNull { candidate ->
            (if (candidate.locale.toLanguageTag().equals(locale.toLanguageTag(), true)) 1000 else 0) +
                (if (!candidate.isNetworkConnectionRequired) 200 else 0) + candidate.quality
        } ?: return false
        return runCatching {
            engine.voice = selected
            engine.setPitch(1.0f)
            engine.voice?.name == selected.name
        }.getOrDefault(false)
    }

    private inner class NativeStartupBridge {
        /** Read-only grant state for the web guide's permission step; no prompt, no data. */
        @JavascriptInterface
        fun permissionStatus(): String {
            val mic = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
            val location = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
            return JSONObject()
                .put("microphone", mic)
                .put("location", location)
                .put("setupDone", startupPrefs.getBoolean(PREF_PERMISSION_SETUP, false))
                .toString()
        }

        /**
         * Lets the adult web guide re-offer ONLY the runtime permissions this app
         * already declares (microphone for Jonas voice, approximate location for
         * cinemas) after a user tap. Kids and non-MatchApp pages are refused; the
         * OS itself suppresses repeat prompts after a permanent denial.
         */
        @JavascriptInterface
        fun requestStartupPermissions() {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current?.scheme != "https" || !isMatchAppHost(current.host.orEmpty()) ||
                    isKidsUri(current) || permissionSetupShowing || isFinishing || isDestroyed) return@runOnUiThread
                val missing = missingStartupPermissions()
                if (missing.isEmpty()) {
                    startupPrefs.edit().putBoolean(PREF_PERMISSION_SETUP, true).apply()
                    return@runOnUiThread
                }
                initialPermissions.launch(missing)
            }
        }

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

    /**
     * Open Google OAuth only in the OS browser/account chooser.
     * The callback stays on the verified MatchApp HTTPS App Link and returns to
     * this same WebView, preserving the PKCE verifier and the local auth session.
     */
    private inner class NativeAuthBridge {
        @JavascriptInterface
        fun openOAuth(url: String?) {
            runOnUiThread {
                val source = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (source?.scheme != "https" || !isMatchAppHost(source.host.orEmpty()) ||
                    isKidsUri(source) || url.isNullOrBlank() || url.length > 8192) return@runOnUiThread
                val target = runCatching { Uri.parse(url) }.getOrNull() ?: return@runOnUiThread
                if (target.scheme != "https" ||
                    target.host != "zkymvqrmbabngsqblyye.supabase.co" ||
                    target.path != "/auth/v1/authorize" ||
                    target.getQueryParameter("provider") != "google") return@runOnUiThread
                val redirect = runCatching {
                    Uri.parse(target.getQueryParameter("redirect_to").orEmpty())
                }.getOrNull()
                if (redirect?.scheme != "https" ||
                    !isMatchAppHost(redirect.host.orEmpty()) ||
                    redirect.path != "/index.html") return@runOnUiThread
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, target).apply {
                        addCategory(Intent.CATEGORY_BROWSABLE)
                    })
                } catch (_: ActivityNotFoundException) {
                    Toast.makeText(this@MainActivity, "Install or enable a browser to continue with Google.", Toast.LENGTH_LONG).show()
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
                if (adFree) nativeRewardedBridge?.onAdFreeEntitlement()
                nativeNewsBridge?.onEntitlementChanged()
            }
        }

        @JavascriptInterface
        fun setNewsAccountContext(account: String) {
            if (account.length > 36) return
            runOnUiThread {
                if (!NativeNewsPolicy.isReporterDocument(web.url.orEmpty())) return@runOnUiThread
                nativeNewsBridge?.onAccountContext(account)
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
        fun openVoiceAvatar() {
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
                    )
                }
            }
        }


    }

    private inner class NativeVoiceBridge {
        @JavascriptInterface
        fun speak(text: String?, languageTag: String?) {
            runOnUiThread { speakVoiceText(text, languageTag) }
        }

        @JavascriptInterface
        fun stopSpeaking() {
            runOnUiThread {
                pendingVoiceUtterance = null
                currentVoiceText = ""
                voiceTts?.stop()
                sendVoiceSpeakingState(false)
            }
        }

        @JavascriptInterface
        fun stop() {
            // Closing Jonas's overlay immediately releases Android recognition;
            // the page beneath the overlay remains exactly where the user left it.
            runOnUiThread {
                inlineVoiceRecognizer?.cancel()
                inlineVoiceRecognizer?.destroy()
                inlineVoiceRecognizer = null
                microphonePermissionPending = false
            }
        }

        @JavascriptInterface
        fun start(languageTag: String?) {
            runOnUiThread {
                val current = runCatching { Uri.parse(web.url.orEmpty()) }.getOrNull()
                if (current == null ||
                    (!isMatchAppHost(current.host.orEmpty()) && !isDebugSmokeUrl(current.toString()))) {
                    sendVoiceError("not-allowed")
                    return@runOnUiThread
                }
                val lang = languageTag
                    ?.takeIf { it.matches(Regex("^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$")) }
                    ?: "en-US"
                startInlineRecognition(lang)
            }
        }
    }

    private inner class MatchChrome : WebChromeClient() {
        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
            val granted = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
            val allowed = NativeLaunchPolicy.canUseApproximateLocation(origin, web.url, granted)
            // Recheck OS permission for each deliberate feature request. Never
            // show a new runtime prompt here or remember a revoked grant.
            callback.invoke(origin, allowed, false)
        }

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
                        NativeCinemaNavigationPolicy.isSearchUrl(target.toString()) -> openCinemaMaps(target)
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
        const val HOME = "https://matchapp.tv/?utm_source=android_app&appBuild=58"
        const val APP_UA = "MatchAppTVAndroid/1.1.58 MatchAppAiAndroid/1.1.58 MatchAppLaunchIntro/1"
        private const val STARTUP_PREFS = "matchapp_startup"
        private const val PREF_INTRO_SEEN = "intro_seen_v1"
        private const val PREF_INTRO_VERSION = "intro_consumed_package_version_v2"
        private const val PREF_REGISTERED = "registered_v1"
        private const val PREF_PERMISSION_SETUP = "permissions_setup_complete_v2"
        private const val PREF_APP_LANGUAGE = "app_language_v1"
        private const val PREF_SCREEN_CHECKPOINT = "screen_checkpoint_v1"
        private const val STATE_URL = "matchapp_current_url_v1"
        private const val STATE_LAUNCH_INTENT = "matchapp_consumed_launch_v1"
        private const val STATE_WEB = "matchapp_webview_history_v1"
        private const val STATE_UI = "matchapp_page_ui_v1"
        private const val STATE_SCROLL_X = "matchapp_scroll_x_v1"
        private const val STATE_SCROLL_Y = "matchapp_scroll_y_v1"
        private val PAGE_FILTER_IDS = setOf("q-category", "q-mood", "q-platform", "q-genre", "q-vibe", "q-decade", "q-rating")
        private val APP_LANGUAGES = setOf("en", "pt", "pt-BR", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "id", "ja", "ko", "zh")
        private const val APP_MODE_JS = """
            (function(){
              window.MATCHAPP_IS_AD_FREE = true;
              window.MATCHAPP_ANDROID = true;
              window.MATCHAPP_ANDROID_KIDS_AVAILABLE = false;
              window.MATCHAPP_ANDROID_KIDS_BLOCKED = true;
              try { localStorage.setItem('match_ad_free','true'); } catch (e) {}
              var root = document.documentElement;
              // onPageStarted can run before the new document has a root.
              // Commit/finish injections retry normally once parsing begins.
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
                var generation = (window.__matchAppNativeAdEntitlementGeneration || 0) + 1;
                window.__matchAppNativeAdEntitlementGeneration = generation;

                var state = window.matchProfileState && window.matchProfileState.status;
                if (state === 'signedout') {
                  try { if (typeof bridge.setNewsAccountContext === 'function') bridge.setNewsAccountContext('guest'); } catch (_) {}
                  try { bridge.setAdFree(false); } catch (_) {}
                  return;
                }
                if (window.isUserLoggedIn !== true) {
                  try { bridge.setAdFree(true); } catch (_) {}
                  return;
                }

                // Authenticated accounts remain ad-free while the authoritative profile
                // row and verified Pro status resolve. Existing ad-free entitlements all win.
                try { bridge.setAdFree(true); } catch (_) {}
                var client = window.supabaseClient;
                if (!client || !client.from || !client.rpc) return;

                var sessionPromise;
                var newsAccountContext = '';
                try {
                  sessionPromise = typeof window.ensureCompactMatchSession === 'function'
                    ? window.ensureCompactMatchSession()
                    : client.auth.getSession();
                } catch (_) { return; }

                Promise.resolve(sessionPromise).then(function(sessionResult){
                  var user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
                  if (!user || !user.id) return;
                  newsAccountContext = user.id;
                  return Promise.all([
                    client.from('profiles')
                      .select('is_vip,is_business,is_ad_free')
                      .eq('id', user.id)
                      .maybeSingle(),
                    client.rpc('pro_status')
                  ]);
                }).then(function(results){
                  if (generation !== window.__matchAppNativeAdEntitlementGeneration ||
                      window.isUserLoggedIn !== true || !results) return;
                  var result = results[0], proResult = results[1];
                  if (!result || result.error || !result.data ||
                      !proResult || proResult.error || !proResult.data) return;
                  var profile = result.data, pro = proResult.data;
                  if (typeof pro.active !== 'boolean' || typeof pro.adFree !== 'boolean' ||
                      (pro.active && (typeof pro.expiresAt !== 'number' ||
                        !isFinite(pro.expiresAt) || pro.expiresAt <= Date.now()))) return;
                  var adFree = profile.is_vip === true ||
                    profile.is_business === true ||
                    profile.is_ad_free === true || pro.active === true || pro.adFree === true;
                  try { if (typeof bridge.setNewsAccountContext === 'function') bridge.setNewsAccountContext(newsAccountContext); } catch (_) {}
                  try { bridge.setAdFree(adFree); } catch (_) {}
                }).catch(function(){
                  // Keep the safe ad-free default on entitlement/network errors.
                });
              }

              if (!window.__matchAppNativeAdEntitlementBound) {
                window.__matchAppNativeAdEntitlementBound = true;
                document.addEventListener('matchapp:authchange', function(){
                  try { if (window.MatchAppNativeExperience && typeof window.MatchAppNativeExperience.setNewsAccountContext === 'function') window.MatchAppNativeExperience.setNewsAccountContext(''); } catch (_) {}
                  window.__matchAppNativeAdEntitlementGeneration = (window.__matchAppNativeAdEntitlementGeneration || 0) + 1;
                  setTimeout(syncNativeAdEntitlement, 0);
                });
                document.addEventListener('matchapp:profilehydrated', function(){
                  setTimeout(syncNativeAdEntitlement, 0);
                });
                document.addEventListener('matchapp:prostatus', function(){
                  setTimeout(syncNativeAdEntitlement, 0);
                });
              }
              setTimeout(syncNativeAdEntitlement, 450);
              setTimeout(syncNativeAdEntitlement, 1600);

              // Adult Android app has no Kids Mode. Keep web /kids intact for browsers.
              function stripAndroidKids(){
                var selectors='#matchapp-kids-entry,.ma-kids-mode-entry,'+
                  'a[href^="/kids"],a[href^="https://matchapp.tv/kids"],'+
                  'button[data-mode="kids"],[data-matchapp-kids-entry]';
                document.querySelectorAll(selectors).forEach(function(node){node.remove()});
              }
              if(!window.__matchAppAndroidKidsRemoved){
                window.__matchAppAndroidKidsRemoved=true;
                var style=document.createElement('style');
                style.id='matchapp-android-kids-excluded';
                style.textContent='#matchapp-kids-entry,.ma-kids-mode-entry,'+
                  'a[href^="/kids"],a[href^="https://matchapp.tv/kids"],'+
                  'button[data-mode="kids"],[data-matchapp-kids-entry]{display:none!important}';
                (document.head||document.documentElement).appendChild(style);
                stripAndroidKids();
                setTimeout(stripAndroidKids,350);
                setTimeout(stripAndroidKids,1400);
                if(window.MutationObserver&&document.body){
                  var pending=false;
                  new MutationObserver(function(mutations){
                    if(pending||!mutations.some(function(m){return m.addedNodes.length>0}))return;
                    pending=true;
                    requestAnimationFrame(function(){pending=false;stripAndroidKids()});
                  }).observe(document.body,{childList:true,subtree:true});
                }
              }

              // Owner beta: launcher appears only inside the Android app, never on the website.
              // Server-side Realtime remains owner-gated until a metered public usage policy exists.
              function setupNativeVoiceAvatarLauncher() {
                // Since 2026-10-10 Jonas UI is loaded from matchapp.tv home,
                // not hardcoded native HTML. That allows layout/voice fixes
                // without uploading another Play Store AAB.
                document.getElementById('matchapp-android-avatar-launcher')?.remove();
                document.getElementById('matchapp-android-avatar-spacer')?.remove();
              }
                            setupNativeVoiceAvatarLauncher();
              setTimeout(setupNativeVoiceAvatarLauncher,700);
              setTimeout(setupNativeVoiceAvatarLauncher,1800);
              if(!window.__matchAppAvatarLauncherBound){
                window.__matchAppAvatarLauncherBound=true;
                document.addEventListener('matchapp:authchange',function(){
                  setTimeout(setupNativeVoiceAvatarLauncher,350);
                });
              }

              // Only the installed Android shell gets gesture and speech handoff
              // recovery. Keep shared site scripts, desktop, and Kids untouched.
              function installAndroidInteractionRecovery() {
                // Conversation polish wraps readAloud with browser-only speechSynthesis.
                // Restore the original player on Android so it uses our native TTS
                // bridge, including automatic replies after microphone prompts.
                var speechPlayer=window.readAloud;
                if(!window.MatchAppJonasSpeech && window.MatchAppNativeVoice && typeof window.MatchAppNativeVoice.speak==='function' &&
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
