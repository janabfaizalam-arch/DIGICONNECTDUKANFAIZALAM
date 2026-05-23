# DigiConnect Dukan Android Release

This repository includes a Trusted Web Activity Android wrapper for:

- App name: DigiConnect Dukan
- Package name: `com.digiconnectdukan.app`
- Launch URL: `https://rnos.in`
- Theme color: `#0B1F3A`

## Why TWA

The site is already PWA-ready, uses HTTPS, and should run inside a standalone Android shell without storing private customer/admin data in native storage. The wrapper delegates website auth, dashboard freshness, service-worker exclusions, payments, and external links to the live website and browser engine.

## Required Local Tools

Install these before building:

1. Android Studio
2. JDK 17
3. Android SDK Platform 35
4. Android SDK Build Tools

Open the repository root in Android Studio, let Gradle sync, then build the `app` module.

## Debug APK

From Android Studio:

1. Select `app`.
2. Build > Build Bundle(s) / APK(s) > Build APK(s).
3. Copy the generated APK to `public/download/digiconnect-dukan.apk`.

Expected CLI command when Gradle is available:

```bash
./gradlew :app:assembleDebug
```

Windows:

```powershell
.\gradlew.bat :app:assembleDebug
```

## Release Signing

Create a release keystore once and keep it private:

```bash
keytool -genkeypair -v -keystore digiconnect-dukan-release.jks -alias digiconnect-dukan -keyalg RSA -keysize 2048 -validity 10000
```

Set environment variables before release builds:

```powershell
$env:DIGICONNECT_KEYSTORE_PATH="C:\secure\digiconnect-dukan-release.jks"
$env:DIGICONNECT_KEYSTORE_PASSWORD="your-keystore-password"
$env:DIGICONNECT_KEY_ALIAS="digiconnect-dukan"
$env:DIGICONNECT_KEY_PASSWORD="your-key-password"
```

## Release APK

```powershell
.\gradlew.bat :app:assembleRelease
```

Copy:

```text
android/app/build/outputs/apk/release/app-release.apk
```

to:

```text
public/download/digiconnect-dukan.apk
```

## Play Store AAB

```powershell
.\gradlew.bat :app:bundleRelease
```

Upload:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

to Play Console.

## Digital Asset Links

For a fully verified TWA and Play Store-ready standalone behavior, publish an asset links file at:

```text
https://rnos.in/.well-known/assetlinks.json
```

Use the final Play signing certificate SHA-256 fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.digiconnectdukan.app",
      "sha256_cert_fingerprints": ["YOUR_RELEASE_OR_PLAY_APP_SIGNING_SHA256"]
    }
  }
]
```

In Play Console with Play App Signing enabled, use the Play app signing certificate fingerprint, not only the upload key fingerprint.

## Download QR

Generate the QR code to:

```text
https://rnos.in/download/digiconnect-dukan.apk
```
