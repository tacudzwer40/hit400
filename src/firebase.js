import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import {
    getFirestore,
    enableIndexedDbPersistence,
    doc,
    getDoc
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Replace with your actual Firebase project config
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyCAtNrHwvvuzr9GazY307ayaPsIWEPIw1Y",
  authDomain: "deedguard-zimbabwe-1fd3a.firebaseapp.com",
  projectId: "deedguard-zimbabwe-1fd3a",
  storageBucket: "deedguard-zimbabwe-1fd3a.firebasestorage.app",
  messagingSenderId: "248997654810",
  appId: "1:248997654810:web:ecf64ac6d81984e2c3fca3"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Configure Google OAuth
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Real OAuth sign-in functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw new Error('Google sign-in failed: ' + error.message);
  }
};

// Enable offline persistence out-of-the-box
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});

// Initialize Firebase Cloud Messaging (only in supported browsers)
const canUseMessaging = typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
const messaging = canUseMessaging ? getMessaging(app) : null;

// Request permission and get token
export const requestNotificationPermission = async () => {
    if (!messaging) return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY_HERE' }); // Replace with actual VAPID key
            console.log('FCM Token:', token);
            return token;
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
    }
    return null;
};

// Listen for messages
export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return resolve(null);
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });

export { db, app, messaging };
