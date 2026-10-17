package com.jonas.papercup

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
}
