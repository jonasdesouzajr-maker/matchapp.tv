package com.jonas.papercup

/** PiP belongs only to user-opened fullscreen media in the adult Activity. */
internal object NativePipPolicy {
    fun mayEnter(
        sdkInt: Int,
        deviceSupportsPip: Boolean,
        hasFullscreenMedia: Boolean,
        hasStartupOverlay: Boolean,
        hasPermissionPrompt: Boolean,
        isFinishing: Boolean,
        alreadyInPip: Boolean
    ): Boolean = sdkInt >= 26 && deviceSupportsPip && hasFullscreenMedia &&
        !hasStartupOverlay && !hasPermissionPrompt && !isFinishing && !alreadyInPip
}
