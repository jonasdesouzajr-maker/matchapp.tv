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
        versionCode = 34
        versionName = "1.1.32"
        // AdMob credentials staged; SDK disabled until real AdMob App ID is supplied.
        buildConfigField("String", "ADMOB_BANNER_ID", "\"ca-app-pub-9541435081010948/4843348278\"")
        buildConfigField("String", "ADMOB_REWARDED_ID", "\"\"")
        resourceConfigurations += listOf("en", "pt", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "in", "ja", "ko", "zh")
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
            buildConfigField("String", "ADMOB_BANNER_ID", "\"ca-app-pub-3940256099942544/6300978111\"")
            buildConfigField("String", "ADMOB_REWARDED_ID", "\"ca-app-pub-3940256099942544/5224354917\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
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
}
