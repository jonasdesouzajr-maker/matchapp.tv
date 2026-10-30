package com.jonas.papercup

/** Both independent startup events must arrive before the original soundtrack can start. */
internal class NativeIntroSequence {
    private var studioFinished = false
    private var videoPrepared = false
    private var playbackStarted = false
    private var finished = false

    fun onStudioFinished(): Boolean {
        studioFinished = true
        return takePlaybackStart()
    }

    fun onVideoPrepared(): Boolean {
        videoPrepared = true
        return takePlaybackStart()
    }

    fun finish() {
        finished = true
    }

    private fun takePlaybackStart(): Boolean {
        if (finished || playbackStarted || !studioFinished || !videoPrepared) return false
        playbackStarted = true
        return true
    }
}
