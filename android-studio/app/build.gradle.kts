import java.util.Properties

val localSettings = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.isFile) file.inputStream().use { load(it) }
}
val previewAnonKey = localSettings.getProperty("matchappAnonKey")
    ?: System.getenv("MATCHAPP_SUPABASE_ANON_KEY")
    ?: ""
val quotedPreviewAnonKey = "\"" + previewAnonKey.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.jonas.papercup"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jonas.papercup"
        minSdk = 24
        targetSdk = 36
        versionCode = 45
        versionName = "1.1.41"
        buildConfigField("String", "MATCHAPP_ANON_KEY", "\"\"")
        // Production banner is enabled only after the native entitlement + UMP consent gates allow it.
        buildConfigField("Boolean", "ADMOB_ENABLED", "true")
        buildConfigField("String", "ADMOB_BANNER_ID", "\"ca-app-pub-9541435081010948/4843348278\"")
        buildConfigField("String", "ADMOB_REWARDED_ID", "\"\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        create("preview") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-preview"
            isDebuggable = true
            // QA builds never serve real ads or interfere with production placements.
            buildConfigField("Boolean", "ADMOB_ENABLED", "false")
            buildConfigField("String", "ADMOB_BANNER_ID", "\"\"")
            buildConfigField("String", "ADMOB_REWARDED_ID", "\"\"")
            buildConfigField("String", "MATCHAPP_ANON_KEY", quotedPreviewAnonKey)
        }
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            // Official Google TEST ads for DEBUG only.
            buildConfigField("Boolean", "ADMOB_ENABLED", "true")
            buildConfigField("String", "ADMOB_BANNER_ID", "\"ca-app-pub-3940256099942544/9214589741\"")
            buildConfigField("String", "ADMOB_REWARDED_ID", "\"ca-app-pub-3940256099942544/5224354917\"")
        }
    }

    androidResources {
        localeFilters += listOf("en", "pt", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "in", "ja", "ko", "zh")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.android.billingclient:billing:9.1.0")
    implementation("com.google.android.gms:play-services-ads:25.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
}
