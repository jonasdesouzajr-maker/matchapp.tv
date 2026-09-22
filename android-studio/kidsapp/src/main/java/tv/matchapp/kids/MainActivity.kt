package tv.matchapp.kids

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
import android.speech.RecognizerIntent
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
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var offline: View
    private lateinit var fullscreenHost: FrameLayout

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var splashKeep = true
    private var lastUrl = HOME

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
        installSplashScreen().setKeepOnScreenCondition { splashKeep }
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = ContextCompat.getColor(this, R.color.ink)
        window.navigationBarColor = ContextCompat.getColor(this, R.color.ink)

        web = findViewById(R.id.web)
        refresh = findViewById(R.id.refresh)
        offline = findViewById(R.id.offline)
        fullscreenHost = findViewById(R.id.fullscreen)
        findViewById<MaterialButton>(R.id.retry).setOnClickListener { retry() }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            // Cold-load the current Kids production surface at app start,
            // then return to normal caching after the page has rendered.
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            val chromeUa = userAgentString
                .replace("; wv)", ")")
                .replace("; wv ", " ")
                .replace(" Version/4.0 ", " ")
            userAgentString = "$chromeUa $APP_UA"
        }

        web.setBackgroundColor(Color.parseColor("#21113E"))
        web.webViewClient = KidsClient()
        web.webChromeClient = KidsChrome()
        web.addJavascriptInterface(NativeVoiceBridge(), "MatchAppNativeVoice")
        web.addJavascriptInterface(NativeGuardianBridge(), "MatchAppNativeGuardian")

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
                    customView != null -> hideCustomView()
                    web.canGoBack() -> web.goBack()
                    else -> finish()
                }
            }
        })

        val launch = resolveLaunchUrl(intent)
        lastUrl = launch
        if (isOnline()) {
            web.loadUrl(launch)
        } else {
            splashKeep = false
            showOffline(true)
        }
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
        super.onPause()
        web.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        fullscreenHost.removeAllViews()
        web.destroy()
        super.onDestroy()
    }

    private fun retry() {
        if (!isOnline()) {
            Toast.makeText(this, getString(R.string.offline_title), Toast.LENGTH_SHORT).show()
            return
        }
        showOffline(false)
        web.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        web.loadUrl(lastUrl.takeIf { isAllowedKidsUrl(it) } ?: HOME)
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

    private fun isMatchAppHost(host: String): Boolean {
        val normalized = host.lowercase()
        return normalized == "matchapp.tv" ||
            normalized == "www.matchapp.tv" ||
            normalized.endsWith(".matchapp.tv")
    }

    private fun isKidsUri(uri: Uri): Boolean {
        if (!isMatchAppHost(uri.host.orEmpty())) return false
        val path = uri.path.orEmpty().lowercase().trimEnd('/')
        return path == "/kids" || path.startsWith("/kids/")
    }

    private fun isAllowedKidsUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return runCatching { isKidsUri(Uri.parse(url)) }.getOrDefault(false)
    }

    private fun isLegalMatchAppUri(uri: Uri): Boolean {
        if (!isMatchAppHost(uri.host.orEmpty())) return false
        val path = uri.path.orEmpty().lowercase()
        return path == "/privacy.html" ||
            path == "/terms.html" ||
            path == "/privacy" ||
            path == "/terms"
    }

    private fun resolveLaunchUrl(intent: Intent?): String {
        val data = intent?.data
        if (data != null && (data.scheme == "https" || data.scheme == "http") && isKidsUri(data)) {
            return data.buildUpon().scheme("https").build().toString()
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

    private fun injectKidsShell(view: WebView) {
        view.evaluateJavascript(KIDS_APP_JS, null)
    }

    private inner class KidsClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            return handleUrl(request.url)
        }

        @Deprecated("Deprecated in Java")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
            return handleUrl(Uri.parse(url))
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
            if (uri != null && isMatchAppHost(uri.host.orEmpty()) && !isKidsUri(uri)) {
                view.stopLoading()
                lastUrl = HOME
                view.loadUrl(HOME)
                return
            }
            lastUrl = url ?: lastUrl
            injectKidsShell(view)
        }

        override fun onPageFinished(view: WebView, url: String?) {
            if (url != null && !isAllowedKidsUrl(url)) return
            splashKeep = false
            refresh.isRefreshing = false
            view.settings.cacheMode = WebSettings.LOAD_DEFAULT
            injectKidsShell(view)
            CookieManager.getInstance().flush()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                splashKeep = false
                refresh.isRefreshing = false
                if (!isOnline()) showOffline(true)
            }
        }
    }

    private fun handleUrl(uri: Uri): Boolean {
        val scheme = uri.scheme.orEmpty().lowercase()
        val host = uri.host.orEmpty().lowercase()

        if (scheme == "mailto" || scheme == "tel" || scheme == "sms" ||
            scheme == "intent" || scheme == "market"
        ) {
            return openExternal(uri)
        }

        if (isKidsUri(uri)) return false

        if (isLegalMatchAppUri(uri)) {
            return openExternal(uri.buildUpon().scheme("https").build())
        }

        if (isMatchAppHost(host)) {
            web.loadUrl(HOME)
            return true
        }

        if (host.endsWith("supabase.co") || host.endsWith("google.com") ||
            host.endsWith("gstatic.com") || host.endsWith("googleapis.com") ||
            host.endsWith("googleusercontent.com")
        ) {
            return false
        }

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

    private fun sendGuardianResult(ok: Boolean, code: String) {
        val safeCode = JSONObject.quote(code)
        web.evaluateJavascript(
            "window.matchAppNativeGuardianResult&&window.matchAppNativeGuardianResult($ok,$safeCode);",
            null
        )
    }

    private fun authenticateGuardian() {
        if (!isAllowedKidsUrl(web.url)) {
            sendGuardianResult(false, "not-allowed")
            return
        }
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK
        if (BiometricManager.from(this).canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            sendGuardianResult(false, "unavailable")
            return
        }
        val prompt = BiometricPrompt(
            this,
            ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    sendGuardianResult(false, "cancelled")
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    sendGuardianResult(true, "ok")
                }
            }
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Grown-ups only")
            .setSubtitle("Use fingerprint or face unlock to leave Kids Mode")
            .setAllowedAuthenticators(authenticators)
            .setNegativeButtonText("Cancel")
            .build()
        prompt.authenticate(info)
    }

    private inner class NativeGuardianBridge {
        @JavascriptInterface
        fun authenticate() {
            runOnUiThread { authenticateGuardian() }
        }

        @JavascriptInterface
        fun openGrownUp() {
            runOnUiThread {
                if (!isAllowedKidsUrl(web.url)) {
                    sendGuardianResult(false, "not-allowed")
                    return@runOnUiThread
                }
                openExternal(Uri.parse("https://matchapp.tv/?utm_source=android_kids_exit"))
            }
        }
    }

    private inner class NativeVoiceBridge {
        @JavascriptInterface
        fun start(languageTag: String?) {
            runOnUiThread {
                if (!isAllowedKidsUrl(web.url)) {
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

    private inner class KidsChrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            if (newProgress >= 100) refresh.isRefreshing = false
        }

        override fun onCreateWindow(
            view: WebView?,
            isDialog: Boolean,
            isUserGesture: Boolean,
            resultMsg: Message?
        ): Boolean {
            val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
            val child = WebView(this@MainActivity)
            child.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    return if (isKidsUri(uri)) {
                        web.loadUrl(uri.toString())
                        true
                    } else {
                        handleUrl(uri)
                    }
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
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
        }

        override fun onHideCustomView() {
            hideCustomView()
        }
    }

    companion object {
        const val HOME = "https://matchapp.tv/kids/?utm_source=android_kids_app&appBuild=24"
        const val APP_UA = "MatchAppTVAndroid/1.1.22 MatchAppAiKidsAndroid/1.1.22"

        private const val KIDS_APP_JS = """
            (function(){
              window.MATCHAPP_IS_AD_FREE = true;
              window.MATCHAPP_ANDROID_KIDS_ONLY = true;
              try { localStorage.setItem('match_ad_free','true'); } catch (e) {}

              var root = document.documentElement;
              root.classList.add('ads-empty','matchapp-android','matchapp-ai-kids-android','is-chrome');

              if (!document.getElementById('matchapp-kids-android-shell')) {
                var s = document.createElement('style');
                s.id = 'matchapp-kids-android-shell';
                s.textContent =
                  '.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,' +
                  '.premium-ad-frame,ins.adsbygoogle,.ma-ad-label,#chrome-notice,.chrome-notice,' +
                  '.install-btn,.kids-install' +
                  '{display:none!important;height:0!important;min-height:0!important;overflow:hidden!important;' +
                  'padding:0!important;margin:0!important;border:0!important}';
                (document.head || root).appendChild(s);
              }

              function classify(el) {
                if (!el || !el.getAttribute) return 'none';
                var href = el.getAttribute('href');
                if (!href) return 'none';
                try {
                  var u = new URL(href, location.href);
                  var host = u.hostname.toLowerCase();
                  var path = u.pathname.toLowerCase().replace(/\/+$/,'');
                  var own = host === 'matchapp.tv' || host === 'www.matchapp.tv' || host.endsWith('.matchapp.tv');
                  if (!own) return 'external';
                  if (path === '/kids' || path.indexOf('/kids/') === 0) return 'kids';
                  if (path === '/privacy.html' || path === '/privacy' ||
                      path === '/terms.html' || path === '/terms') return 'legal';
                  return 'blocked';
                } catch (e) {
                  return 'none';
                }
              }

              function scrub() {
                document.querySelectorAll('.kids-install,.install-btn').forEach(function(el){
                  el.style.setProperty('display','none','important');
                });
              }

              scrub();
              document.addEventListener('click', function(ev){
                var target = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
                if (target && target.id === 'kids-exit') return;
                var kind = classify(target);
                if (kind === 'blocked') {
                  ev.preventDefault();
                  ev.stopImmediatePropagation();
                }
              }, true);

              if (!window.__matchAppKidsAndroidObserver) {
                window.__matchAppKidsAndroidObserver = new MutationObserver(scrub);
                window.__matchAppKidsAndroidObserver.observe(document.documentElement, {childList:true,subtree:true});
              }

              document.querySelectorAll('ins.adsbygoogle,.ad-banner-container').forEach(function(el){ el.remove(); });
            })();
        """
    }
}
