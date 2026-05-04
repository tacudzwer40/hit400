// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.

importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Default minimal config. In a real app this would contain your config.
const firebaseConfig = {
  apiKey: "AIzaSyCAtNrHwvvuzr9GazY307ayaPsIWEPIw1Y",
  authDomain: "deedguard-zimbabwe-1fd3a.firebaseapp.com",
  projectId: "deedguard-zimbabwe-1fd3a",
  storageBucket: "deedguard-zimbabwe-1fd3a.firebasestorage.app",
  messagingSenderId: "248997654810",
  appId: "1:248997654810:web:ecf64ac6d81984e2c3fca3"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/favicon.ico'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch(e) {
    console.warn("Service worker firebase init error", e);
}
