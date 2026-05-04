import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { collection, onSnapshot, setDoc, deleteDoc, doc, query, orderBy, where, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { Network } from '@capacitor/network';
import { trainFraudModel, scoreFraudRisk } from '../utils/aiVerification';
import { clearPersonalStorage } from '../utils/privacy';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deeds, setDeeds] = useState([]);
  const [fraudModel, setFraudModel] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Robust Native Network Listeners (Android/iOS/Web)
    let networkListener = null;
    const initializeNetwork = async () => {
      // Skip network initialization in test environment
      if (process.env.NODE_ENV === 'test') return;

      const status = await Network.getStatus();
      setIsOffline(!status.connected);

      networkListener = await Network.addListener('networkStatusChange', status => {
        setIsOffline(!status.connected);
      });
    };
    initializeNetwork();

    // Listen to Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get custom claims from ID token
          const idTokenResult = await getIdTokenResult(user);
          let role = 'user'; // Default role

          // Check custom claims first
          if (idTokenResult.claims.role) {
            role = idTokenResult.claims.role;
          } else {
            // Fallback to email-based role determination
            role = user.email.includes('admin') || user.email.includes('registrar') ? 'admin' : 'user';

            // Check users collection in Firestore for role and profile data
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              let profileData = {};
              if (userDoc.exists()) {
                profileData = userDoc.data();
                if (profileData.role) role = profileData.role;
              }
              setUser({ ...user, role, ...profileData });
              setLoading(false);
              return;
            } catch (error) {
              if (error.code === 'permission-denied') {
                 // Suppress stack trace intentionally
                 // console.log("ℹ️ User profile uses local authentication state (Offline/Fallback mode).");
              } else {
                 // console.log(`Could not fetch user profile from Firestore: ${error.message}`);
              }
            }
          }

          setUser({ ...user, role });
        } catch (error) {
          console.error('Error determining user role:', error);
          // Fallback to basic email-based role
          const role = user.email.includes('admin') || user.email.includes('registrar') ? 'admin' : 'user';
          setUser({ ...user, role });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen to Firebase Firestore (Offline Persistence Enabled)
    const q = query(collection(db, 'deeds'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      // Map snapshot to local state. Set synced attribute logically
      const deedsData = snapshot.docs.map(doc => {
        const data = doc.data();
        // If the document has pending writes, it's not fully synced yet
        const isSynced = !doc.metadata.hasPendingWrites;
        return { id: doc.id, ...data, synced: isSynced };
      });
      setDeeds(deedsData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        // console.log("⚠️ Firebase Permissions Restricted: Operating deed registry in local-only / offline fallback mode.");
      } else {
        // console.log("Firebase listen error on deeds:", error.message);
      }
    });

    return () => {
      if (networkListener) networkListener.remove();
      unsubscribeAuth();
      unsubscribe();
    };
  }, []);

  // Train a lightweight fraud/anomaly model when the deed ledger updates
  useEffect(() => {
    let cancelled = false;
    const train = async () => {
      if (!deeds || deeds.length < 10) return;
      const model = await trainFraudModel(deeds);
      if (!cancelled) setFraudModel(model);
    };
    train();
    return () => { cancelled = true; };
  }, [deeds]);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error('Login failed: ' + error.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      throw new Error('Google login failed: ' + error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserHistory([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const completeProfile = async (username, nationalId) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { username, nationalId }, { merge: true });
      setUser(prev => ({ ...prev, username, nationalId }));
    } catch (error) {
      throw new Error('Failed to save profile: ' + error.message);
    }
  };

  // Sync Citizen History from Firebase
  useEffect(() => {
    if (!user || user.role === 'admin') {
      setUserHistory([]);
      return;
    }

    const identifier = user.email || user.uid;
    if (!identifier) return;

    const q = query(
      collection(db, 'scanHistory'),
      where('username', '==', identifier)
    );

    const unsubscribeHistory = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const historyData = snapshot.docs.map(doc => doc.data());
      // Sort descending in memory to avoid Firestore composite index requirement
      historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setUserHistory(historyData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        // console.log("⚠️ Firebase Permissions Restricted: Operating scan history in local-only / offline fallback mode.");
      } else {
        // console.log("Firebase history listen error:", error.message);
      }
    });

    return () => unsubscribeHistory();
  }, [user?.email, user?.uid, user?.role]);

  const addDeed = async (deedData) => {
    try {
      // Optimistically update local state so the UI reflects it immediately
      // This is especially useful if the real-time Firebase listener is facing network errors
      setDeeds(prev => {
        if (!prev.find(d => d.hash === deedData.hash)) {
          return [{ ...deedData, synced: false }, ...prev];
        }
        return prev;
      });
      
      // We use hash as the document ID for uniqueness and easy lookup
      await setDoc(doc(db, 'deeds', deedData.hash), deedData);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Offline mode: Deed queued. It will sync automatically to the cloud when restored.");
    }
  };

  const getDeedByHash = (hash) => {
    return deeds.find(d => d.hash === hash);
  };

  const getDeedById = (id) => {
    return deeds.find(d => d.deedNumber === id);
  }

  const deleteDeed = async (timestamp) => {
    try {
      const deedToDelete = deeds.find(d => d.timestamp === timestamp);
      if (deedToDelete) {
        await deleteDoc(doc(db, 'deeds', deedToDelete.hash));
      }
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const predictFraudScore = async (deed) => {
    if (!deed) return 0.5;
    if (!fraudModel) return 0.5;
    try {
      const score = await scoreFraudRisk(deed, fraudModel);
      return score;
    } catch (e) {
      console.warn('Failed to compute fraud score', e);
      return 0.5;
    }
  };

  const purgeUserHistory = async () => {
    if (!user?.email) return;

    try {
      const q = query(collection(db, 'scanHistory'), where('username', '==', user.email));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => batch.delete(doc(db, 'scanHistory', docSnap.id)));
      await batch.commit();
    } catch (e) {
      console.error('Failed to purge user history', e);
    }
  };

  const forgetUser = async () => {
    try {
      await purgeUserHistory();
      clearPersonalStorage();
      logout();
    } catch (e) {
      console.error('Failed to forget user', e);
    }
  };

  const addToHistory = async (record) => {
    if (!user) return;

    const identifier = user.email || user.uid || 'unknown';
    const historyDoc = { ...record, username: identifier };

    // Optimistic local update
    setUserHistory(prev => {
      const newHistory = [historyDoc, ...prev];
      newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return newHistory;
    });

    try {
      // Generate a unique ID for the history scan
      const docId = `${identifier}_${new Date(record.date).getTime()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'scanHistory', docId), historyDoc);
    } catch (e) {
      console.error("Failed to add history to Firebase", e);
      alert("Offline mode: Scan saved to secure offline queue. It will sync to your citizen account when connected.");
    }
  };

  return (
    <AppContext.Provider value={{ user, loading, login, loginWithGoogle, logout, completeProfile, forgetUser, deeds, addDeed, deleteDeed, getDeedByHash, getDeedById, predictFraudScore, isOffline, userHistory, addToHistory }}>
      {children}
    </AppContext.Provider>
  );
};
