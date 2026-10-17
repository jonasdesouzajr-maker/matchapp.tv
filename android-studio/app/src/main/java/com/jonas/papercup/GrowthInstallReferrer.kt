package com.jonas.papercup

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener

/** A short, one-time Play handoff. This does not initialize analytics or authenticate a user. */
internal class GrowthInstallReferrer(context: Context, private var onDestination: ((String) -> Unit)?) {
    private val appContext = context.applicationContext
    private val preferences = appContext.getSharedPreferences("matchapp_growth_referrer", Context.MODE_PRIVATE)
    private val handler = Handler(Looper.getMainLooper())
    private var client: InstallReferrerClient? = null
    @Volatile private var closed = false
    private val timeout = Runnable { finish(null, false) }

    fun start() {
        if (closed || preferences.getBoolean("handled_v1", false)) return
        val attempts = preferences.getInt("attempts_v1", 0)
        if (attempts >= 3) return
        preferences.edit().putInt("attempts_v1", attempts + 1).apply()
        try {
            val connection = InstallReferrerClient.newBuilder(appContext).build()
            client = connection
            handler.postDelayed(timeout, 2500)
            connection.startConnection(object : InstallReferrerStateListener {
                override fun onInstallReferrerSetupFinished(responseCode: Int) {
                    when (responseCode) {
                        InstallReferrerClient.InstallReferrerResponse.OK -> Thread({
                            try {
                                val details = connection.installReferrer
                                val now = System.currentTimeMillis() / 1000
                                val clicked = details.referrerClickTimestampSeconds
                                val timely = clicked > 0 && clicked <= now + 300 && now - clicked <= 24 * 60 * 60
                                val destination = if (timely) GrowthReferrerParser.destination(details.installReferrer) else null
                                finish(destination, true)
                            } catch (_: Exception) { finish(null, false) }
                        }, "matchapp-install-context").start()
                        InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED,
                        InstallReferrerClient.InstallReferrerResponse.DEVELOPER_ERROR -> finish(null, true)
                        else -> finish(null, false)
                    }
                }
                override fun onInstallReferrerServiceDisconnected() { finish(null, false) }
            })
        } catch (_: Exception) { finish(null, false) }
    }

    private fun finish(destination: String?, terminal: Boolean) {
        handler.post {
            if (closed) return@post
            if (terminal) preferences.edit().putBoolean("handled_v1", true).apply()
            val callback = onDestination
            close()
            if (destination != null) callback?.invoke(destination)
        }
    }

    fun close() {
        if (closed) return
        closed = true
        handler.removeCallbacks(timeout)
        onDestination = null
        try { client?.endConnection() } catch (_: Exception) { }
        client = null
    }
}
