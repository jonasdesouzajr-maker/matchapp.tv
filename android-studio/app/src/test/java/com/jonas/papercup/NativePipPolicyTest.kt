package com.jonas.papercup

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativePipPolicyTest {
    @Test fun fullscreenMediaOnSupportedDevicesCanEnter() {
        for (sdk in listOf(26, 30, 35, 36)) {
            assertTrue(NativePipPolicy.mayEnter(sdk, true, true, false, false, false, false))
        }
    }

    @Test fun ordinaryPagesUnsupportedDevicesAndOverlaysNeverEnter() {
        assertFalse(NativePipPolicy.mayEnter(25, true, true, false, false, false, false))
        assertFalse(NativePipPolicy.mayEnter(36, false, true, false, false, false, false))
        assertFalse(NativePipPolicy.mayEnter(36, true, false, false, false, false, false))
        assertFalse(NativePipPolicy.mayEnter(36, true, true, true, false, false, false))
        assertFalse(NativePipPolicy.mayEnter(36, true, true, false, true, false, false))
        assertFalse(NativePipPolicy.mayEnter(36, true, true, false, false, true, false))
        assertFalse(NativePipPolicy.mayEnter(36, true, true, false, false, false, true))
    }
}
