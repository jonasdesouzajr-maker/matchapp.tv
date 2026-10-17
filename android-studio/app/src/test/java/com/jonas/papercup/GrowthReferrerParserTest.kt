package com.jonas.papercup

import java.net.URLDecoder
import java.net.URLEncoder
import org.junit.Assert.*
import org.junit.Test

class GrowthReferrerParserTest {
    private val prefix = "utm_source=matchapp_tv&utm_medium=web_to_app&"

    @Test fun restoresOnlyAValidReadOnlyResumeCapability() {
        val token = "a".repeat(64)
        assertEquals("https://matchapp.tv/together.html?lang=pt-BR#resume=$token",
            GrowthReferrerParser.destination(prefix + "utm_campaign=together_after_aha&resume=$token&lang=pt-BR"))
        assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=together_after_aha&resume=invalid"))
    }

    @Test fun restoresThePublicTitleAndCountryWithoutAnExternalRedirect() {
        assertEquals("https://matchapp.tv/where-to-watch/paddington-2/?lang=en#availability-br",
            GrowthReferrerParser.destination(prefix + "utm_campaign=title_after_aha&path=%2Fwhere-to-watch%2Fpaddington-2%2F&country=BR&lang=en"))
        for (path in listOf("https://evil.test/", "//evil.test/", "/where-to-watch/../oauth/", "/kids/", "/where-to-watch/availability-methodology/")) {
            assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=title_after_aha&path=$path"))
        }
    }

    @Test fun rejectsDuplicatesUnknownCampaignsMalformedEncodingAndOversizedPayloads() {
        assertNull(GrowthReferrerParser.destination(prefix + "utm_source=other&utm_campaign=together_after_aha&resume=" + "a".repeat(64)))
        assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=unknown"))
        assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=title_after_aha&path=%xx"))
        assertNull(GrowthReferrerParser.destination("x".repeat(4097)))
        assertNull(GrowthReferrerParser.destination(null))
    }

    @Test fun preservesRegionalTitleIdentityAndRejectsUnsupportedTerritories() {
        assertEquals("https://matchapp.tv/pt/br/watch/series/bluey-82728/?lang=pt-BR#availability-br",
            GrowthReferrerParser.destination(prefix + "utm_campaign=title_after_aha&path=%2Fpt%2Fbr%2Fwatch%2Fseries%2Fbluey-82728%2F&country=BR&lang=pt-BR"))
        assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=title_after_aha&path=/pt/us/watch/movie/film-42/"))
    }

    @Test fun unsupportedLanguageDoesNotBecomeAQueryInjection() {
        val token = "b".repeat(64)
        assertEquals("https://matchapp.tv/together.html#resume=$token",
            GrowthReferrerParser.destination(prefix + "utm_campaign=together_after_aha&resume=$token&lang=en%26redirect%3Devil"))
    }

    private fun oneMatch(criteria: String, language: String = "pt-BR"): String =
        prefix + "utm_campaign=one_match_after_aha&criteria=" + URLEncoder.encode(criteria, "UTF-8") +
            "&lang=" + URLEncoder.encode(language, "UTF-8")

    @Test fun restoresOnlyBoundedChoicesToTheConfirmationFragment() {
        assertEquals(
            "https://matchapp.tv/?lang=pt-BR&app_resume=1#ma-continue=category%3Dmovie%26mood%3Dfunny%26platform%3DNetflix",
            GrowthReferrerParser.destination(oneMatch("category=movie&mood=funny&platform=Netflix"))
        )
        assertEquals(
            "https://matchapp.tv/?app_resume=1#ma-continue=category%3Dmovie",
            GrowthReferrerParser.destination(oneMatch("category=movie", "unsupported"))
        )
    }

    @Test fun encodedProviderAndGenreSeparatorsDoNotBecomeExtraKeys() {
        val criteria = "category=Cooking+%26+Recipes&mood=Excited%2FEnergetic&platform=Disney%2B&" +
            "genre=Hip-Hop%2FRap&vibe=Quick+%26+Fun&decade=2020s&rating=PG-13"
        val destination = GrowthReferrerParser.destination(oneMatch(criteria, "ar"))
        assertNotNull(destination)
        assertTrue(destination!!.startsWith("https://matchapp.tv/?lang=ar&app_resume=1#ma-continue="))
        val restored = URLDecoder.decode(destination.substringAfter("#ma-continue="), "UTF-8")
        assertEquals(criteria, restored)
        assertEquals("Disney+", URLDecoder.decode(restored.split('&')[2].substringAfter('='), "UTF-8"))
        assertFalse(destination.contains("&platform="))
    }

    @Test fun preservesMultipleChoicesAndExplicitAnyWithoutStartingAMatch() {
        val criteria = "category=Movie%7CTV+Series&mood=funny%7Ccalm&platform=Netflix%7CDisney%2B&" +
            "genre=&vibe=&decade=2020s&rating="
        val destination = GrowthReferrerParser.destination(oneMatch(criteria))
        assertNotNull(destination)
        val restored = URLDecoder.decode(destination!!.substringAfter("#ma-continue="), "UTF-8")
        assertEquals(criteria, restored)
        val choices = restored.split('&').associate { pair ->
            val parts = pair.split('=', limit = 2)
            parts[0] to URLDecoder.decode(parts[1], "UTF-8")
        }
        assertEquals("Movie|TV Series", choices["category"])
        assertEquals("Netflix|Disney+", choices["platform"])
        assertEquals("", choices["genre"])
        assertEquals("", choices["rating"])
        assertFalse(destination.substringBefore('#').contains("mood="))
        assertFalse(destination.contains("generate="))
    }

    @Test fun rejectsUnapprovedPrivateOrExecutableCriteriaAsAWhole() {
        for (criteria in listOf(
            "category=movie&access_token=secret",
            "category=movie&country=BR",
            "category=movie&query=my+private+search",
            "redirect=https%3A%2F%2Fevil.example",
            "mood=%3Cscript%3E",
            "mood=happy%0Aredirect",
            "platform=Netflix%3Dextra",
            "mood=%xx",
            "category=movie&",
            ""
        )) assertNull(criteria, GrowthReferrerParser.destination(oneMatch(criteria)))
    }

    @Test fun rejectsDuplicateMalformedAndOversizedChoicePayloads() {
        for (criteria in listOf(
            "mood=funny&mood=calm",
            "mood=funny&%6Dood=calm",
            "platform=Netflix%7CNetflix",
            "platform=Netflix%7C",
            "platform=" + (1..41).joinToString("%7C") { "Service$it" },
            "category=movie&mood=funny&platform=Netflix&genre=Drama&vibe=Quiet&decade=2020s&rating=PG&extra=1",
            "mood=" + "a".repeat(65),
            "mood=" + "%20".repeat(240)
        )) assertNull(criteria, GrowthReferrerParser.destination(oneMatch(criteria)))
        assertNull(GrowthReferrerParser.destination(prefix + "utm_campaign=one_match_after_aha"))
        assertNull(GrowthReferrerParser.destination(oneMatch("mood=funny") + "&criteria=mood%3Dcalm"))
    }

    @Test fun permitsFortyBoundedChoicesButRejectsTheWholeOversizedTransfer() {
        val allowed = "platform=" + (1..40).joinToString("%7C") { "Service$it".padEnd(56, 'a') }
        assertTrue(allowed.length <= 2400)
        assertNotNull(GrowthReferrerParser.destination(oneMatch(allowed)))

        val oversized = "platform=" + (1..40).joinToString("%7C") { "Service$it".padEnd(60, 'a') }
        assertTrue(oversized.length > 2400)
        assertTrue(oneMatch(oversized).length < 4096)
        assertNull(GrowthReferrerParser.destination(oneMatch(oversized)))
    }
}
