package com.jonas.papercup

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.graphics.Color
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * Local Android voice-avatar experience with no external avatar vendor.
 * The public web experience and Kids build are unchanged.
 * Server-side Realtime voice access remains owner-gated during beta.
 */
class VoiceAvatarActivity : AppCompatActivity() {
    private lateinit var player: WebView
    private var pendingAudioRequest: PermissionRequest? = null
    private val assets by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }
    private val micPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        val pending = pendingAudioRequest
        pendingAudioRequest = null
        if (pending != null) {
            if (allowed) pending.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
            else pending.deny()
        }
    }
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val token = intent.getStringExtra(EXTRA_TOKEN).orEmpty().takeIf {
            it.length in 100..6000 && it.none { char -> char.isWhitespace() }
        }.orEmpty()
        val persona = "jonas"
        val question = intent.getStringExtra(EXTRA_PROMPT).orEmpty().take(1000)
        // Bearer token exists only in process memory: never persisted in a URL or file.
        player = WebView(this).apply {
            setBackgroundColor(Color.rgb(9,7,18))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            // The incoming Home microphone gesture explicitly starts a voice call.
            settings.mediaPlaybackRequiresUserGesture = question.isBlank()
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.scheme == "matchapp-avatar" && request.url.host == "close") {
                        runOnUiThread { finish() }
                        return true
                    }
                    return request.url.host != "appassets.androidplatform.net" ||
                        request.url.scheme != "https"
                }
                override fun onPageFinished(view: WebView, url: String?) {
                    if (url?.startsWith(ASSET_ORIGIN) == true) {
                        view.evaluateJavascript(
                            "window.MatchAppAvatar && window.MatchAppAvatar.init(" + JSONObject.quote(token) + "," + JSONObject.quote(persona) + "," + JSONObject.quote(question) + ");",
                            null
                        )
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        if (request.origin.scheme != "https" ||
                            request.origin.host != "appassets.androidplatform.net" ||
                            !request.resources.contentEquals(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        ) { request.deny(); return@runOnUiThread }
                        if (ContextCompat.checkSelfPermission(this@VoiceAvatarActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                        } else {
                            pendingAudioRequest?.deny()
                            pendingAudioRequest = request
                            micPermission.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    }
                }
                override fun onPermissionRequestCanceled(request: PermissionRequest) {
                    if (pendingAudioRequest == request) pendingAudioRequest = null
                }
            }
            loadUrl(ASSET_ORIGIN)
        }
        setContentView(FrameLayout(this).apply {
            addView(player, FrameLayout.LayoutParams(-1, -1))
        })
    }
    override fun onStop() {
        if (::player.isInitialized) player.evaluateJavascript(
            "if(typeof stop === 'function')stop();", null
        )
        super.onStop()
    }
    override fun onDestroy() {
        pendingAudioRequest?.deny()
        pendingAudioRequest = null
        if (::player.isInitialized) {
            player.loadUrl("about:blank")
            player.removeAllViews()
            player.destroy()
        }
        super.onDestroy()
    }
    companion object {
        const val EXTRA_TOKEN = "matchapp_avatar_access_token"
        const val EXTRA_PERSONA = "matchapp_avatar_persona"
        const val EXTRA_PROMPT = "matchapp_avatar_initial_prompt"
        private const val ASSET_ORIGIN = "https://appassets.androidplatform.net/assets/avatar-ai/index.html"
    }
}
