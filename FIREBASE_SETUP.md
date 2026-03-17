# Firebase Setup Guide for DeedGuard Zimbabwe

## 🚀 Setting up Real Firebase Authentication

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `deedguard-zimbabwe`
4. Enable Google Analytics (optional)
5. Choose your Google account
6. Click "Create project"

### Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click on the **Sign-in method** tab
3. Enable the following sign-in providers:
   - **Email/Password**: Click enable
   - **Google**: Click enable, enter your project support email

### Step 3: Set up Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (you can change security rules later)
4. Select a location (choose one close to Zimbabwe, like `southamerica-east1`)

### Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter app nickname: `DeedGuard Zimbabwe`
5. **Important**: Check "Also set up Firebase Hosting" if you plan to deploy
6. Click "Register app"
7. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:XXXXXXXXXXXXXXXXXXXXX"
};
```

### Step 5: Update Your Code

1. Open `src/firebase.js`
2. Replace the placeholder config with your real Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Step 6: Create User Accounts

#### For Admin/Registrar Users:
1. Go to **Authentication > Users** in Firebase Console
2. Click "Add user"
3. Create accounts like:
   - Email: `admin@deedguard.zw` or `registrar@deedguard.zw`
   - Password: Choose a secure password

#### For Citizen Users:
- Users can register themselves through the app, or you can pre-create accounts

### Step 7: Set Up User Roles

#### Option 1: Email-based Roles (Simple)
The app automatically assigns roles based on email:
- Emails containing `admin` or `registrar` → Admin role
- All others → User role

#### Option 2: Firestore-based Roles (Advanced)
1. Go to **Firestore Database**
2. Create a collection called `userRoles`
3. Add documents with user UIDs as document IDs
4. Set role field: `{ role: "admin" }` or `{ role: "user" }`

### Step 8: Test Authentication

1. Start your development server: `npm run dev`
2. Try logging in with the accounts you created
3. Test both admin and user role access

## 🔐 Security Rules

### Firestore Security Rules (Basic)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /userRoles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Allow authenticated users to read deeds
    match /deeds/{deedId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (request.auth.token.role == 'admin' ||
         resource.data.userId == request.auth.uid);
    }
  }
}
```

### Authentication Security Rules
```javascript
rules_version = '2';
service firebase.auth {
  match /users/{userId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

## 🚀 Deployment (Optional)

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init` (select Hosting)
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## 🐛 Troubleshooting

### Common Issues:

1. **"auth/configuration-not-found"**
   - Check that your Firebase config is correct
   - Ensure the project exists and is not deleted

2. **"auth/invalid-api-key"**
   - Verify your API key in the config
   - Make sure you're using the correct project

3. **"auth/user-not-found"**
   - User account doesn't exist in Authentication > Users
   - Check email/password spelling

4. **Role not working**
   - Check Firestore `userRoles` collection
   - Verify email contains 'admin' or 'registrar' for auto-assignment

## 📞 Support

If you encounter issues:
1. Check Firebase Console logs
2. Verify all steps above are completed
3. Check browser console for detailed error messages

---

**Note**: This setup provides real Firebase authentication with role-based access control for both Registrar (Admin) and Citizen (User) roles.