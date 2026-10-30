package com.jonas.papercup

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeIntroSequenceTest {
    @Test fun fastVideoPreparationCannotPlayUnderTheStudioCard() {
        val sequence = NativeIntroSequence()
        assertFalse(sequence.onVideoPrepared())
        assertFalse(sequence.onVideoPrepared())
        assertTrue(sequence.onStudioFinished())
        assertFalse(sequence.onStudioFinished())
        assertFalse(sequence.onVideoPrepared())
    }

    @Test fun slowVideoPreparationWaitsAfterTheCardAndStartsExactlyOnce() {
        val sequence = NativeIntroSequence()
        assertFalse(sequence.onStudioFinished())
        assertFalse(sequence.onStudioFinished())
        assertTrue(sequence.onVideoPrepared())
        assertFalse(sequence.onVideoPrepared())
        assertFalse(sequence.onStudioFinished())
    }

    @Test fun skipOrBackgroundingCannotRestartFromLateCallbacks() {
        for (preparedFirst in listOf(true, false)) {
            val sequence = NativeIntroSequence()
            if (preparedFirst) assertFalse(sequence.onVideoPrepared())
            else assertFalse(sequence.onStudioFinished())
            sequence.finish()
            assertFalse(sequence.onVideoPrepared())
            assertFalse(sequence.onStudioFinished())
            sequence.finish()
            assertFalse(sequence.onVideoPrepared())
        }
    }

    @Test fun completionCannotBeRearmedByAnotherCallback() {
        val sequence = NativeIntroSequence()
        assertFalse(sequence.onStudioFinished())
        assertTrue(sequence.onVideoPrepared())
        sequence.finish()
        assertFalse(sequence.onStudioFinished())
        assertFalse(sequence.onVideoPrepared())
    }
}
