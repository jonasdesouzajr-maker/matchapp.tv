package com.jonas.papercup

import android.app.Activity
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.material.button.MaterialButton
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Native Android monetization only. Website AdSense remains blocked inside the WebView.
 *
 * Release builds use the real MatchApp Ai App ID/banner unit, but requests are
 * gated by both account entitlement and UMP consent. Debug builds use Google's
 * sample App ID and demo ad units only.
 */
class AdMobController(
    private val activity: Activity,
    private val shell: LinearLayout,
    private val bannerContainer: FrameLayout,
    private val privacyButton: MaterialButton
) {
    private val consentInformation = UserMessagingPlatform.getConsentInformation(activity)
    private var adView: AdView? = null
    private var adsInitialized = false
    private var adsInitializationCompleted = false
    private var consentFlowStarted = false
    private var entitlementAdFree = true
    private var bannerRequestStarted = false
    private var bannerLoaded = false
    private var destroyed = false
    private var adInitFailed = false
    private var bannerGeneration = 0

    // UMP callbacks, native ad surfaces and visibility belong to the UI thread.
    // A dismissed consent sheet must never update a destroyed Activity.
    private fun withLiveActivity(action: () -> Unit) {
        val safe = {
            if (!destroyed && !activity.isFinishing && !activity.isDestroyed) action()
        }
        if (Looper.myLooper() == Looper.getMainLooper()) safe()
        else activity.runOnUiThread { safe() }
    }

    private fun suppressAds(error: Throwable) {
        Log.e("MatchAppAdConsent", "Native advertising was suspended; app remains usable", error)
        withLiveActivity {
            adInitFailed = true
            clearBanner()
            privacyButton.visibility = View.GONE
            updateShellVisibility()
        }
    }

    fun start() {
        shell.visibility = View.GONE
        privacyButton.visibility = View.GONE
        if (!BuildConfig.ADMOB_ENABLED || BuildConfig.ADMOB_BANNER_ID.isBlank()) return

        privacyButton.setOnClickListener {
            if (entitlementAdFree || !isConsentUiAvailable()) return@setOnClickListener
            try {
                UserMessagingPlatform.showPrivacyOptionsForm(activity) {
                    withLiveActivity {
                        updatePrivacyUi()
                        if (consentInformation.canRequestAds()) {
                            bannerContainer.postDelayed({
                                withLiveActivity { reloadBannerAfterPrivacyChange() }
                            }, 350L)
                        } else clearBanner()
                    }
                }
            } catch (error: RuntimeException) {
                suppressAds(error)
            }
        }
    }

    /**
     * Paid/ad-free accounts fail closed: native ads stay off until the web runtime
     * resolves the authenticated profile. Guests/free accounts explicitly open
     * the UMP flow, so a slow login can never flash an ad to a paying member.
     */
    private fun isConsentUiAvailable(): Boolean =
        !destroyed && !activity.isFinishing && !activity.isDestroyed

    fun setAdFree(adFree: Boolean) {
        if (!BuildConfig.ADMOB_ENABLED || BuildConfig.ADMOB_BANNER_ID.isBlank() || destroyed) return
        // NativeExperience bridge normally dispatches on the UI thread; reject
        // asynchronous re-entry without racing the consent sheet's lifecycle.
        if (Looper.myLooper() != Looper.getMainLooper()) {
            withLiveActivity { setAdFree(adFree) }
            return
        }
        entitlementAdFree = adFree
        if (adFree) {
            privacyButton.visibility = View.GONE
            clearBanner()
            return
        }

        if (!consentFlowStarted) {
            startConsentFlow()
        } else {
            updatePrivacyUi()
            if (adsInitialized && consentInformation.canRequestAds()) loadBanner()
            else maybeRequestAds()
        }
    }

    private fun startConsentFlow() {
        if (consentFlowStarted || entitlementAdFree || !isConsentUiAvailable()) return
        consentFlowStarted = true
        try {
            val requestParameters = ConsentRequestParameters.Builder().build()
            consentInformation.requestConsentInfoUpdate(
                activity,
                requestParameters,
                {
                    withLiveActivity {
                        updatePrivacyUi()
                        // Previously saved consent can permit ads before a form appears.
                        maybeRequestAds()
                        try {
                            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                                // Do not construct AdView in the same frame as
                                // the consent dialog's dismissal on Samsung WebView.
                                withLiveActivity {
                                    updatePrivacyUi()
                                    bannerContainer.postDelayed({
                                        withLiveActivity { maybeRequestAds() }
                                    }, 350L)
                                }
                            }
                        } catch (error: RuntimeException) {
                            suppressAds(error)
                        }
                    }
                },
                {
                    withLiveActivity {
                        // A failed refresh never silently grants permission.
                        updatePrivacyUi()
                        maybeRequestAds()
                    }
                }
            )
        } catch (error: RuntimeException) {
            suppressAds(error)
        }
    }

    private fun maybeRequestAds() {
        if (!isConsentUiAvailable() || !BuildConfig.ADMOB_ENABLED ||
            entitlementAdFree || adsInitialized || adInitFailed ||
            !consentInformation.canRequestAds()
        ) return
        adsInitialized = true // Claim single init before launching the worker.
        Thread {
            try {
                // Google recommends background initialization to avoid ANRs.
                MobileAds.initialize(activity.applicationContext) {
                    withLiveActivity {
                        adsInitializationCompleted = true
                        if (!entitlementAdFree && consentInformation.canRequestAds()) loadBanner()
                    }
                }
            } catch (error: RuntimeException) {
                suppressAds(error)
            } catch (error: LinkageError) {
                suppressAds(error)
            }
        }.start()
    }

    private fun loadBanner() {
        if (!isConsentUiAvailable() || entitlementAdFree || bannerRequestStarted ||
            adInitFailed || !consentInformation.canRequestAds()
        ) return
        bannerRequestStarted = true
        val generation = ++bannerGeneration
        bannerContainer.post {
            if (!isConsentUiAvailable() || entitlementAdFree ||
                adInitFailed || !consentInformation.canRequestAds() ||
                generation != bannerGeneration
            ) {
                if (generation == bannerGeneration) bannerRequestStarted = false
                return@post
            }
            try {
                val density = activity.resources.displayMetrics.density
                val widthPixels = bannerContainer.width.takeIf { it > 0 }
                    ?: activity.resources.displayMetrics.widthPixels
                val widthDp = (widthPixels / density).toInt().coerceAtLeast(1)
                // Retain the established reserved banner geometry across supported devices.
                @Suppress("DEPRECATION")
                val adaptiveSize =
                    AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp)

                val nextAdView = AdView(activity).apply {
                    adUnitId = BuildConfig.ADMOB_BANNER_ID
                    setAdSize(adaptiveSize)
                    adListener = object : AdListener() {
                        override fun onAdLoaded() {
                            if (generation != bannerGeneration || destroyed) return
                            bannerLoaded = true
                            updateShellVisibility()
                        }
                        override fun onAdFailedToLoad(error: LoadAdError) {
                            if (generation != bannerGeneration || destroyed) return
                            bannerLoaded = false
                            bannerRequestStarted = false
                            // Avoid destroying the view while its callback is executing.
                            bannerContainer.post { if (generation == bannerGeneration && !destroyed) clearBanner() }
                        }
                    }
                }
                adView?.destroy()
                adView = nextAdView
                bannerContainer.removeAllViews()
                bannerContainer.addView(nextAdView)
                nextAdView.loadAd(AdRequest.Builder().build())
            } catch (error: RuntimeException) {
                bannerRequestStarted = false
                suppressAds(error)
            } catch (error: LinkageError) {
                bannerRequestStarted = false
                suppressAds(error)
            }
        }
    }

    private fun reloadBannerAfterPrivacyChange() {
        clearBanner()
        if (!adsInitialized) {
            maybeRequestAds()
        } else if (consentInformation.canRequestAds()) {
            loadBanner()
        }
    }

    private fun clearBanner() {
        bannerGeneration++ // Invalidate delayed callbacks after privacy changes.
        bannerLoaded = false
        bannerRequestStarted = false
        runCatching { adView?.destroy() }
        adView = null
        bannerContainer.removeAllViews()
        updateShellVisibility()
    }

    private fun updatePrivacyUi() {
        val required =
            !entitlementAdFree &&
                consentInformation.privacyOptionsRequirementStatus ==
                    ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        privacyButton.visibility = if (required) View.VISIBLE else View.GONE
        updateShellVisibility()
    }

    private fun updateShellVisibility() {
        shell.visibility =
            if (bannerLoaded || privacyButton.visibility == View.VISIBLE) View.VISIBLE else View.GONE
    }

    /** Read-only access for separately requested rewarded ads; never starts or changes banner work. */
    fun canRequestRewarded(): Boolean =
        Looper.myLooper() == Looper.getMainLooper() && isConsentUiAvailable() &&
            BuildConfig.ADMOB_ENABLED && adsInitializationCompleted && !adInitFailed &&
            !entitlementAdFree && runCatching { consentInformation.canRequestAds() }.getOrDefault(false)

    fun pause() {
        if (!destroyed) runCatching { adView?.pause() }.onFailure { suppressAds(it) }
    }

    fun resume() {
        if (!destroyed) runCatching { adView?.resume() }.onFailure { suppressAds(it) }
    }

    fun destroy() {
        if (destroyed) return
        destroyed = true
        clearBanner()
        privacyButton.setOnClickListener(null)
    }
}
