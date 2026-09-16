package tv.matchapp.app

import android.app.Application
import android.webkit.WebView

class MatchAppApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }
}
