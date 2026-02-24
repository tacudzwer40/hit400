# Map Display Troubleshooting Guide

## Issue: Map Still Not Displaying After API Key Configuration

### 🔍 **Root Cause Analysis**

The most common reasons for blank maps even with API key configured:

1. **Wrong API Key Location**: Google Maps uses the API key from `AndroidManifest.xml`, not `google_maps_api.xml`
2. **API Key Restrictions**: Overly restrictive API key settings
3. **Missing Google Cloud Console Setup**: Required APIs not enabled
4. **Device/Emulator Issues**: Missing Google Play Services

### ✅ **Step-by-Step Fix**

#### Step 1: Update AndroidManifest.xml
**CRITICAL**: Replace the placeholder in AndroidManifest.xml:
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ACTUAL_API_KEY_HERE" />
```

**NOT** in google_maps_api.xml - the manifest takes precedence!

#### Step 2: Verify Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Library"
4. **Enable these APIs**:
   - ✅ Maps SDK for Android
   - ✅ (Optional) Places API
   - ✅ (Optional) Geocoding API

#### Step 3: Check API Key Configuration
1. Go to "APIs & Services" > "Credentials"
2. Click your API key
3. **Application restrictions**: Try "None" first for testing
4. **API restrictions**: Select "Don't restrict key" first for testing
5. Save changes

#### Step 4: Test on Correct Device
- **Physical Android device** with Google Play Services ✅
- **Emulator with Google Play Services** ✅
- **Emulator without Google Play Services** ❌

#### Step 5: Rebuild and Test
```bash
gradlew.bat clean
gradlew.bat assembleDebug
```

### 🚨 **Common Issues & Solutions**

#### Issue: Gray Grid Pattern
- **Cause**: API key not working or restrictions too tight
- **Fix**: Remove all restrictions temporarily, verify API key format

#### Issue: Completely Blank Screen
- **Cause**: No internet connection or Google Play Services missing
- **Fix**: Check internet, update Google Play Services

#### Issue: "Google Play Services Not Available"
- **Cause**: Outdated Google Play Services
- **Fix**: Update Google Play Services on device/emulator

#### Issue: "API Key Not Valid"
- **Cause**: Wrong API key or restrictions blocking access
- **Fix**: Verify API key format, remove restrictions temporarily

### 🔧 **Advanced Troubleshooting**

#### Check Logcat for Errors
Look for these error messages:
- `Google Play services not available`
- `API key not found`
- `Network error`
- `Authentication failed`

#### Verify SHA-1 Certificate
For restricted API keys, you need the correct SHA-1:
```bash
# Debug keystore
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Release keystore
keytool -list -v -keystore your_release_keystore.jks -alias your_alias
```

#### Test API Key Validity
Use this URL to test your API key:
```
https://maps.googleapis.com/maps/api/staticmap?center=Harare&zoom=10&size=400x400&key=YOUR_API_KEY
```

### 📋 **Final Checklist**
- [ ] API key updated in AndroidManifest.xml (NOT google_maps_api.xml)
- [ ] "Maps SDK for Android" enabled in Google Cloud Console
- [ ] API key restrictions temporarily removed for testing
- [ ] Testing on device with Google Play Services
- [ ] Internet connection available
- [ ] App rebuilt after changes
- [ ] Logcat checked for specific errors

### 🎯 **Quick Fix for Immediate Testing**
1. Remove all API key restrictions temporarily
2. Update AndroidManifest.xml with your actual API key
3. Rebuild and test
4. Once working, add restrictions back gradually

### 📞 **If Still Not Working**
1. Share Logcat errors
2. Confirm device/emulator type
3. Verify Google Cloud Console project setup
4. Check API key format (should start with "AIza...")

## Document Location Implementation

Once the map is working, see IMPLEMENT_DOCUMENT_LOCATIONS.md for adding scanned document locations to the map.