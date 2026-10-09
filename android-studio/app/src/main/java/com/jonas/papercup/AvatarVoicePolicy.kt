package com.jonas.papercup

import android.speech.tts.Voice
import java.util.Locale

/** Persona selection is independent of quality. Never silently use the opposite gender.
 * Google engine identifiers are from the provider's published RT-Voice Android voice inventory.
 * Other engines can advertise gender in their voice name or feature set.
 */
internal object AvatarVoicePolicy {
    private val male = setOf("en-us-x-iom", "en-us-x-iol", "en-us-x-tpd",
        "en-gb-x-gbb", "en-gb-x-gbd", "en-gb-x-rjs", "en-au-x-aub", "en-au-x-aud",
        "en-in-x-end", "en-in-x-ene", "pt-pt-x-jmn", "pt-pt-x-pmj")
    private val female = setOf("en-us-x-sfg", "en-us-x-sfc", "pt-br-x-afs", "pt-pt-x-jfb", "pt-pt-x-sfs")

    fun gender(name: String, features: Set<String> = emptySet()): String? {
        val key = name.lowercase(Locale.ROOT).removeSuffix("-local").removeSuffix("-network")
        if (key in male) return "male"
        if (key in female) return "female"
        val labels = (features + name).joinToString(" ").lowercase(Locale.ROOT)
        if (Regex("(^|[^a-z])female([^a-z]|$)").containsMatchIn(labels)) return "female"
        if (Regex("(^|[^a-z])male([^a-z]|$)").containsMatchIn(labels)) return "male"
        return null
    }

    fun choose(voices: List<Voice>, persona: String, locale: Locale): Voice? {
        val requested = "male"
        return voices.filter {
            it.locale.language == locale.language && gender(it.name, it.features.orEmpty()) == requested &&
                "notInstalled" !in it.features.orEmpty()
        }.sortedWith(compareByDescending<Voice> { it.locale.country == locale.country }
            .thenByDescending { !it.isNetworkConnectionRequired }
            .thenByDescending { it.quality }
            .thenBy { it.name }).firstOrNull()
    }
}
