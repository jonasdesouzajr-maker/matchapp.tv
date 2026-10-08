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
        versionCode = 43
        versionName = "1.1.39"
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
