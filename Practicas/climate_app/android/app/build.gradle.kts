plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.climate_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    signingConfigs {
        create("release") {
            keyAlias = "climate_key"
            keyPassword = "MiContrasenaSegura2025!"
            storeFile = file("climate_app.jks")
            storePassword = "MiContrasenaSegura2025!"
        }
    }

    defaultConfig {
        applicationId = "com.example.climate_app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        // CORRECCIÓN 1: Usamos la propiedad correcta del objeto defaultConfig
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            
            // CORRECCIÓN 2: Sintaxis correcta de Kotlin para minificación y optimización de recursos
            isMinifyEnabled = true
            isShrinkResources = true
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}