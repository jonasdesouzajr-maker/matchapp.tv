package com.jonas.papercup

import org.junit.Assert.*
import org.junit.Test

class NativeLaunchPolicyTest {
    private fun play(current: Int = 55, consumed: Int = 0, seen: Boolean = false,
                     registered: Boolean = false, store: Boolean = true, updated: Boolean = false) =
        NativeLaunchPolicy.shouldPlayIntro(current, consumed, seen, registered, store, updated)

    @Test fun aCompletedUpfrontChoiceNeverRepromptsOnVoiceEntryOrRevocation() {
        assertEquals(NativeLaunchPolicy.VoicePermissionAction.DENY,
            NativeLaunchPolicy.voicePermissionAction(granted = false, setupComplete = true))
        assertEquals(NativeLaunchPolicy.VoicePermissionAction.START,
            NativeLaunchPolicy.voicePermissionAction(granted = true, setupComplete = true))
        // The OS can revoke an earlier grant; the persistent setup choice stays complete.
        val sequence = listOf(true, false, true).map {
            NativeLaunchPolicy.voicePermissionAction(granted = it, setupComplete = true)
        }
        assertEquals(listOf(NativeLaunchPolicy.VoicePermissionAction.START,
            NativeLaunchPolicy.VoicePermissionAction.DENY, NativeLaunchPolicy.VoicePermissionAction.START), sequence)
    }

    @Test fun microphoneEntryBeforeCompletedSetupStillChecksTheCurrentOsGrant() {
        assertEquals(NativeLaunchPolicy.VoicePermissionAction.REQUEST,
            NativeLaunchPolicy.voicePermissionAction(granted = false, setupComplete = false))
        assertEquals(NativeLaunchPolicy.VoicePermissionAction.START,
            NativeLaunchPolicy.voicePermissionAction(granted = true, setupComplete = false))
    }

    @Test fun anOriginalConsumedLinkRestoresButANewLinkTakesPrecedence() {
        val original = NativeLaunchPolicy.launchIntentFingerprint("android.intent.action.VIEW", "https://matchapp.tv/?code=first-callback")
        val newCallback = NativeLaunchPolicy.launchIntentFingerprint("android.intent.action.VIEW", "https://matchapp.tv/?code=new-callback")
        assertTrue(NativeLaunchPolicy.shouldRestoreSavedScreen(original, original))
        assertTrue(NativeLaunchPolicy.shouldRestoreSavedScreen(original, null))
        assertTrue(NativeLaunchPolicy.shouldRestoreSavedScreen(null, null))
        assertFalse(NativeLaunchPolicy.shouldRestoreSavedScreen(original, newCallback))
        assertFalse(NativeLaunchPolicy.shouldRestoreSavedScreen(null, newCallback))
        assertNull(NativeLaunchPolicy.launchIntentFingerprint("android.intent.action.MAIN", null))
        assertEquals(64, original!!.length)
        assertFalse(original.contains("first-callback"))
        assertNotEquals(original, NativeLaunchPolicy.launchIntentFingerprint("android.intent.action.SEND", "https://matchapp.tv/?code=first-callback"))
    }

    @Test fun aFreshLauncherRecoversTheGuideEvenWhenAndroidSuppliesNoSavedBundle() {
        val checkpoint = "https://matchapp.tv/how-it-works.html#chapter-9"
        assertEquals(checkpoint, NativeLaunchPolicy.checkpointFallbackUrl(null, null, checkpoint))
        assertEquals(checkpoint, NativeLaunchPolicy.checkpointFallbackUrl("invalid", null, checkpoint))
        // A supplied safe Bundle is newer and must retain precedence.
        assertNull(NativeLaunchPolicy.checkpointFallbackUrl("https://matchapp.tv/explore.html", null, checkpoint))
    }

    @Test fun explicitLinksAndCallbacksNeverConsumeADurableCheckpoint() {
        val checkpoint = "https://matchapp.tv/how-it-works.html#chapter-9"
        for (destination in listOf("https://matchapp.tv/explore.html", "https://matchapp.tv/?code=fixture-callback", checkpoint)) {
            val launch = NativeLaunchPolicy.launchIntentFingerprint("android.intent.action.VIEW", destination)
            assertNull(NativeLaunchPolicy.checkpointFallbackUrl(null, launch, checkpoint))
        }
    }

    @Test fun durableUrlsKeepOnlyPresentationParametersAndKnownAnchors() {
        val original = "https://matchapp.tv/profile/profile.html?lang=pt-BR&tab=history&email=person%40example.test&question=private+draft#tab-history"
        val safe = "https://matchapp.tv/profile/profile.html?lang=pt-BR&tab=history#tab-history"
        assertEquals(safe, NativeLaunchPolicy.checkpointUrl(original))
        assertEquals(safe, NativeLaunchPolicy.checkpointUrl(safe))
        assertEquals("https://matchapp.tv/", NativeLaunchPolicy.checkpointUrl("https://matchapp.tv/?lang=private-text&tab=unknown#private-free-text"))
        val home = "https://matchapp.tv/?utm_source=android_app&appBuild=55"
        assertEquals(home, NativeLaunchPolicy.checkpointUrl(home))
        assertEquals("https://matchapp.tv/", NativeLaunchPolicy.checkpointUrl("https://matchapp.tv/?client_secret=fixture&state=fixture&id_token=fixture"))
        for (tab in listOf("history", "watchlater", "seenit", "audio", "notforme")) {
            val profile = "https://matchapp.tv/profile/profile.html?tab=$tab#tab-$tab"
            assertEquals(profile, NativeLaunchPolicy.checkpointUrl(profile))
        }
    }

    @Test fun unsafeCurrentDestinationsCannotCreateOrRestoreADurableCheckpoint() {
        for (url in listOf(null, "", "https://accounts.google.com/", "https://matchapp.tv/callback.html",
            "https://matchapp.tv/?code=fixture", "https://matchapp.tv/#access_token=fixture", "https://matchapp.tv/purchase.html",
            "https://matchapp.tv/private-voice/", "https://matchapp.tv/kids/", "https://matchapp.tv/api/account",
            "https://matchapp.tv/logout", "https://matchapp.tv/reset-password.html", "https://matchapp.tv/%2570rivate/")) {
            assertNull(url, NativeLaunchPolicy.checkpointUrl(url))
            assertNull(url, NativeLaunchPolicy.checkpointFallbackUrl(null, null, url))
        }
    }

    @Test fun aSafeCurrentPageDoesNotSerializeEarlierAuthenticationHistory() {
        val guide = "https://matchapp.tv/how-it-works.html"
        val history = "https://matchapp.tv/profile/profile.html?tab=history"
        assertTrue(NativeLaunchPolicy.canSaveHistory(listOf(guide, history)))
        for (unsafe in listOf(null, "https://matchapp.tv/?code=private-auth-code", "https://matchapp.tv/#access_token=private-token",
            "https://accounts.google.com/o/oauth2/auth", "https://matchapp.tv/purchase.html")) {
            assertFalse(NativeLaunchPolicy.canSaveHistory(listOf(unsafe, history)))
            assertFalse(NativeLaunchPolicy.canSaveHistory(listOf(guide, unsafe, history)))
        }
        assertFalse(NativeLaunchPolicy.canSaveHistory(emptyList()))
    }

    @Test fun approximateLocationRequiresCurrentPermissionAndAnExactTrustedOrigin() {
        val home = "https://matchapp.tv/?lang=pt-BR"
        for (origin in listOf("https://matchapp.tv", "https://www.matchapp.tv", "https://matchapp.tv:443/")) {
            assertTrue(NativeLaunchPolicy.canUseApproximateLocation(origin, home, true))
            assertFalse(NativeLaunchPolicy.canUseApproximateLocation(origin, home, false))
        }
        for (origin in listOf(null, "", "http://matchapp.tv", "https://matchapp.tv.evil.test",
            "https://evil.matchapp.tv", "https://user@matchapp.tv", "https://matchapp.tv:444",
            "https://matchapp.tv/path", "https://matchapp.tv/?code=x", "https://matchapp.tv/#x")) {
            assertFalse(origin, NativeLaunchPolicy.canUseApproximateLocation(origin, home, true))
        }
        for (page in listOf(null, "https://evil.test/", "https://matchapp.tv/kids/",
            "https://matchapp.tv/callback.html", "https://matchapp.tv/purchase.html")) {
            assertFalse(page, NativeLaunchPolicy.canUseApproximateLocation("https://matchapp.tv", page, true))
        }
    }

    @Test fun initialLaunchPlaysOnceAndSameVersionNeverReplays() {
        assertTrue(play())
        assertTrue(play(store = false))
        assertFalse(play(consumed = 55))
        assertFalse(play(consumed = 56))
        assertFalse(play(current = 0))
    }

    @Test fun onlyANewerPlayPackageRearmsIntroForAnExistingInstall() {
        assertTrue(play(current = 56, consumed = 55, registered = true))
        assertFalse(play(current = 56, consumed = 55, store = false))
        assertFalse(play(seen = true))
        assertFalse(play(registered = true))
        assertTrue(play(seen = true, updated = true))
        assertFalse(play(seen = true, store = false, updated = true))
    }

    @Test fun unverifiableUpdateSourceDoesNotPreventFirstInstallButNeverRearms() {
        assertTrue(play(store = false))
        assertFalse(play(current = 56, consumed = 55, store = false, updated = true))
        assertFalse(play(seen = true, store = false, updated = true))
        assertFalse(play(registered = true, store = false, updated = true))
    }

    @Test fun retainsGuideHistoryAndLanguageWithinTheActualAppOrigin() {
        for (url in listOf("https://matchapp.tv/how-it-works.html?lang=pt-BR#chapter-2",
            "https://matchapp.tv/profile/profile.html?tab=history", "https://www.matchapp.tv/explore.html")) {
            assertEquals(url, NativeLaunchPolicy.restorableUrl(url))
        }
    }

    @Test fun neverRestoresForeignKidsAuthenticationOrPaymentCallbacks() {
        for (url in listOf("javascript:alert(1)", "https://matchapp.tv.evil.test/", "https://evil.test/",
            "https://evil.matchapp.tv/", "https://user@matchapp.tv/", "http://matchapp.tv/",
            "https://matchapp.tv:444/", "https://matchapp.tv/kids/", "https://matchapp.tv/a/../kids/",
            "https://matchapp.tv/%6bids/", "https://matchapp.tv/oauth/", "https://matchapp.tv/callback.html",
            "https://matchapp.tv/purchase.html?session_id=x", "https://matchapp.tv/?code=x",
            "https://matchapp.tv/?%63ode=x",
            "https://matchapp.tv/#access_token=x", "https://matchapp.tv/private-voice/")) {
            assertNull(url, NativeLaunchPolicy.restorableUrl(url))
        }
    }
}
