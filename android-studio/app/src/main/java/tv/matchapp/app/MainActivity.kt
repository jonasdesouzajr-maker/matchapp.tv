package tv.matchapp.app

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
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
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

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var splashKeep = true
    private var lastUrl = HOME

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
                    customView != null -> hideCustomView()
                    web.canGoBack() -> web.goBack()
                    else -> finish()
                }
            }
        })

        val launch = resolveLaunchUrl(intent)
        lastUrl = launch
        if (isOnline()) web.loadUrl(launch) else {
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

    private fun isKidsUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return runCatching { isKidsUri(Uri.parse(url)) }.getOrDefault(false)
    }

    private fun resolveLaunchUrl(intent: Intent?): String {
        val data = intent?.data
        if (data != null && (data.scheme == "https" || data.scheme == "http")) {
            if (isMatchAppHost(data.host.orEmpty())) {
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
            lastUrl = url ?: lastUrl
            injectAppMode(view)
        }

        override fun onPageFinished(view: WebView, url: String?) {
            splashKeep = false
            refresh.isRefreshing = false
            view.settings.cacheMode = WebSettings.LOAD_DEFAULT
            injectAppMode(view)
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
        if (scheme == "mailto" || scheme == "tel" || scheme == "sms" || scheme == "whatsapp" || scheme == "intent" || scheme == "market") {
            return openExternal(uri)
        }
        if (host.endsWith("wa.me") || host.contains("whatsapp.com") || host.contains("play.google.com") || host.contains("t.me")) {
            return openExternal(uri)
        }
        if (isMatchAppHost(host)) {
            return false
        }
        if (host.endsWith("supabase.co") || host.endsWith("google.com") || host.endsWith("gstatic.com") ||
            host.endsWith("googleapis.com") || host.endsWith("googleusercontent.com")
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
                    val url = request.url.toString()
                    web.loadUrl(url)
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
        const val HOME = "https://matchapp.tv/?utm_source=android_app&appBuild=25"
        const val APP_UA = "MatchAppTVAndroid/1.1.23 MatchAppAiAndroid/1.1.23"
        private const val APP_MODE_JS = """
            (function(){
              window.MATCHAPP_IS_AD_FREE = true;
              window.MATCHAPP_ANDROID_KIDS_AVAILABLE = true;
              try { localStorage.setItem('match_ad_free','true'); } catch (e) {}
              var root = document.documentElement;
              root.classList.add('ads-empty','matchapp-android','matchapp-ai-android','is-chrome');

              if (!document.getElementById('matchapp-android-shell')) {
                var s = document.createElement('style');
                s.id = 'matchapp-android-shell';
                s.textContent =
                  '.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,' +
                  '.premium-ad-frame,ins.adsbygoogle,.ma-ad-label,#chrome-notice,.chrome-notice,.install-btn' +
                  '{display:none!important;height:0!important;min-height:0!important;overflow:hidden!important;' +
                  'padding:0!important;margin:0!important;border:0!important}' +
                  '@media(max-width:640px){body.ai-chat-page .newsearch-row{display:grid!important;' +
                  'grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important;' +
                  'gap:10px!important;overflow:visible!important}body.ai-chat-page .composer{display:flex!important;' +
                  'width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;' +
                  'overflow:visible!important}body.ai-chat-page .composer textarea{display:block!important;' +
                  'flex:1 1 auto!important;width:auto!important;min-width:0!important;visibility:visible!important;' +
                  'opacity:1!important}body.ai-chat-page .composer .mic-btn{display:inline-flex!important;' +
                  'flex:0 0 50px!important;width:50px!important;min-width:50px!important}' +
                  'body.ai-chat-page .composer-send{width:100%!important}}';
                (document.head || root).appendChild(s);
              }

              document.querySelectorAll('ins.adsbygoogle,.ad-banner-container').forEach(function(el){ el.remove(); });
            })();
        """
    }
}
