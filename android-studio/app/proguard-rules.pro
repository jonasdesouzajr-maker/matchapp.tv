-keepclassmembers class tv.matchapp.app.** { *; }
-keepattributes *Annotation*
-dontwarn android.webkit.**

# Room locates generated database implementations by name during startup.
-keep class androidx.work.impl.WorkDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class androidx.work.impl.WorkDatabase_Impl$* { *; }
