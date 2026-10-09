# Keep the Android WebView JavaScript bridge entrypoints in optimized AABs.
# The old tv.matchapp.app namespace no longer matches the production application.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.jonas.papercup.VoiceAvatarActivity { *; }
-keepattributes *Annotation*
-dontwarn android.webkit.**
