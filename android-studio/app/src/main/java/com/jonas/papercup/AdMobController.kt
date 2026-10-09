package com.jonas.papercup

import android.app.Activity
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
    private var consentFlowStarted = false
    private var entitlementAdFree = true
    private var bannerRequestStarted = false
    private var bannerLoaded = false

    fun start() {
        shell.visibility = View.GONE
        privacyButton.visibility = View.GONE
        if (!BuildConfig.ADMOB_ENABLED || BuildConfig.ADMOB_BANNER_ID.isBlank()) return

        privacyButton.setOnClickListener {
            if (entitlementAdFree) return@setOnClickListener
            UserMessagingPlatform.showPrivacyOptionsForm(activity) {
                updatePrivacyUi()
                if (consentInformation.canRequestAds()) {
                    reloadBannerAfterPrivacyChange()
                } else {
                    clearBanner()
                }
            }
        }
    }

    /**
     * Paid/ad-free accounts fail closed: native ads stay off until the web runtime
     * resolves the authenticated profile. Guests/free accounts explicitly open
     * the UMP flow, so a slow login can never flash an ad to a paying member.
     */
    fun setAdFree(adFree: Boolean) {
        if (!BuildConfig.ADMOB_ENABLED || BuildConfig.ADMOB_BANNER_ID.isBlank()) return
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
        if (consentFlowStarted || entitlementAdFree) return
        consentFlowStarted = true
        val requestParameters = ConsentRequestParameters.Builder().build()

        consentInformation.requestConsentInfoUpdate(
            activity,
            requestParameters,
            {
                updatePrivacyUi()
                // A previous-session decision may already permit an ad request.
                maybeRequestAds()
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                    updatePrivacyUi()
                    maybeRequestAds()
                }
            },
            {
                // A transient consent-info refresh failure must not discard a still-valid
                // consent state from an earlier session.
                updatePrivacyUi()
                maybeRequestAds()
            }
        )
    }

    private fun maybeRequestAds() {
        if (!BuildConfig.ADMOB_ENABLED || entitlementAdFree || adsInitialized || !consentInformation.canRequestAds()) return
        adsInitialized = true
        Thread {
            MobileAds.initialize(activity) {
                activity.runOnUiThread { loadBanner() }
            }
        }.start()
    }

    private fun loadBanner() {
        if (entitlementAdFree || bannerRequestStarted || !consentInformation.canRequestAds()) return
        bannerRequestStarted = true
        bannerContainer.post {
            val density = activity.resources.displayMetrics.density
            val widthPixels = bannerContainer.width.takeIf { it > 0 }
                ?: activity.resources.displayMetrics.widthPixels
            val widthDp = (widthPixels / density).toInt().coerceAtLeast(1)
            val adaptiveSize =
                AdSize.getLargeAnchoredAdaptiveBannerAdSize(activity, widthDp)

            val nextAdView = AdView(activity).apply {
                adUnitId = BuildConfig.ADMOB_BANNER_ID
                setAdSize(adaptiveSize)
                adListener = object : AdListener() {
                    override fun onAdLoaded() {
                        bannerLoaded = true
                        updateShellVisibility()
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        bannerRequestStarted = false
                        bannerLoaded = false
                        bannerContainer.removeAllViews()
                        updateShellVisibility()
                    }
                }
            }

            adView?.destroy()
            adView = nextAdView
            bannerContainer.removeAllViews()
            bannerContainer.addView(nextAdView)
            nextAdView.loadAd(AdRequest.Builder().build())
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
        bannerLoaded = false
        bannerRequestStarted = false
        adView?.destroy()
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

    fun pause() {
        adView?.pause()
    }

    fun resume() {
        adView?.resume()
    }

    fun destroy() {
        clearBanner()
        privacyButton.setOnClickListener(null)
    }
}
