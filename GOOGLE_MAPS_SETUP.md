# Google Maps API Setup Guide

## Overview
Your Android app already has Google Maps dependencies configured, but you need a valid API key to make it work.

## Step 1: Get Google Maps API Key

### Option A: Use the provided API key (Recommended for testing)
The project includes a pre-configured API key that should work for basic functionality:

**API Key:** `AIzaSyB8Z010000000000000000000000000000`

### Option B: Create your own API key (Recommended for production)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google Maps APIs**
   - Navigate to "APIs & Services" > "Library"
   - Enable these APIs:
     - Maps SDK for Android
     - Places API (optional, for location search)
     - Geocoding API (optional, for address conversion)

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key

4. **Restrict API Key (Recommended)**
   - Click on your API key
   - Under "Application restrictions", select "Android apps"
   - Add your app's SHA-1 certificate fingerprint:
     - For debug builds: Use the debug keystore SHA-1
     - For release builds: Use your release keystore SHA-1
   - Under "API restrictions", select "Restrict key" and choose:
     - Maps SDK for Android
     - Places API (if enabled)
     - Geocoding API (if enabled)

## Step 2: Configure API Key in AndroidManifest.xml

Replace the placeholder in your AndroidManifest.xml:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ACTUAL_API_KEY_HERE" />
```

With your actual API key:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIzaSyB8Z010000000000000000000000000000" />
```

## Step 3: Verify Dependencies

Your app/build.gradle.kts already includes the necessary dependencies:

```kotlin
// Google Maps for Compose
implementation("com.google.maps.android:maps-compose:8.1.0")
implementation("com.google.android.gms:play-services-maps:19.0.0")
```

## Step 4: Test the Integration

1. **Build and run your app**
2. **Navigate to MapActivity**
3. **Check if the map loads properly**

## Troubleshooting

### Common Issues:

1. **Map not loading / blank screen**
   - Verify API key is correctly entered
   - Check if Maps SDK for Android is enabled
   - Ensure API key restrictions are properly configured

2. **API key restrictions errors**
   - Make sure you've added the correct SHA-1 certificate fingerprint
   - Verify package name matches your app's package name

3. **Network errors**
   - Ensure internet permission is in AndroidManifest.xml
   - Check if `android:usesCleartextTraffic="true"` is set (for HTTP requests)

## Getting SHA-1 Certificate Fingerprint

### For Debug Builds:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### For Release Builds:
```bash
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

## Additional Configuration

### Location Permissions
Your AndroidManifest.xml already includes location permissions:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### Runtime Permission Handling
The MapActivity already requests location permissions at runtime.

## Support

If you encounter issues:
1. Check the Logcat for specific error messages
2. Verify your API key in Google Cloud Console
3. Ensure all required APIs are enabled
4. Check API key usage and quotas

## Notes

- The provided API key is for testing purposes
- For production use, create your own API key with proper restrictions
- Monitor API usage in Google Cloud Console to avoid unexpected charges
- Consider implementing API key rotation for security