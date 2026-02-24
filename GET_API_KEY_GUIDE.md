# Google Maps API Key Setup Guide

## Step 1: Get Your Google Maps API Key

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown and select "New Project"
4. Name your project (e.g., "TittleDeed Verifier")
5. Click "Create"

### 1.2 Enable Google Maps SDK
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Maps SDK for Android"
3. Click on "Maps SDK for Android"
4. Click "Enable"

### 1.3 Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Your API key will be generated and displayed
4. Copy this key (it starts with "AIza...")

## Step 2: Configure API Key in Your App

### 2.1 Update the XML File
1. Open `app/src/main/res/values/google_maps_api.xml`
2. Replace `YOUR_API_KEY_HERE` with your actual API key
3. Save the file

```xml
<string name="google_maps_key" templateMergeStrategy="preserve" translatable="false">
    AIza_your_actual_api_key_here
</string>
```

### 2.2 Get Your App's SHA-1 Certificate Fingerprint
Open a terminal/command prompt and run:

**For Windows:**
```cmd
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**For Mac/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the "SHA1" fingerprint in the output.

## Step 3: Secure Your API Key (Recommended)

### 3.1 Restrict API Key
1. Go back to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "Application restrictions", select "Android apps"
4. Click "Add package name and fingerprint"
5. Enter:
   - Package name: `zw.co.tittledeedverifier`
   - SHA-1 certificate: [paste your SHA-1 fingerprint from step 2.2]
6. Click "Save"

### 3.2 Restrict APIs
1. Under "API restrictions", select "Restrict key"
2. Click "Add APIs"
3. Select "Maps SDK for Android"
4. Click "Save"

## Step 4: Test Your Configuration

1. Rebuild your app: `gradlew.bat assembleDebug`
2. Install and run the app
3. Navigate to the MapActivity
4. The map should now display properly!

## Troubleshooting

### Map Still Not Loading?
- **Check Internet**: Ensure device has internet access
- **Check API Key**: Verify no typos in the API key
- **Check Restrictions**: Ensure package name and SHA-1 are correct
- **Check Console**: Look for error messages in Logcat

### Common Error Messages:
- **"Google Play Services not available"**: Update Google Play Services on device
- **"API key not valid"**: Check API key restrictions and format
- **"Network error"**: Check internet connection

### Getting SHA-1 for Release Keystore
For production apps, you'll need your release keystore SHA-1:
```bash
keytool -list -v -keystore your_release_keystore.jks -alias your_alias_name
```

## API Key Costs
- First $200/month is free
- After that: $5 USD per 1000 map loads
- Monitor usage in Google Cloud Console

For more details, visit: https://developers.google.com/maps/documentation/android-sdk/get-api-key