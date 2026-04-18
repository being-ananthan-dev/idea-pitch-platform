'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';
import { createOrUpdateParticipant } from '@/lib/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only runs client-side — Firebase is safe to call here
    const auth = getFirebaseAuth();

    // If we have a cached auth flag, resolve loading instantly
    const cachedUid = sessionStorage.getItem('auth_uid');
    if (cachedUid) setLoading(false);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      // Cache so next navigation in the session is instant
      if (firebaseUser) {
        sessionStorage.setItem('auth_uid', firebaseUser.uid);
      } else {
        sessionStorage.removeItem('auth_uid');
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      
      // Background sync — do not block the UI waiting for Firestore to write
      createOrUpdateParticipant(u.uid, {
        uid: u.uid,
        name: u.displayName || '',
        email: u.email || '',
        phone: '',
      }).catch(err => console.error('Background sync failed:', err));
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, pass);
      // Let onAuthStateChanged handle the listener and sync checks
    } catch (error) {
      console.error('Email Sign-in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const auth = getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const u = result.user;
      
      // AWAIT the sync to ensure the DB record exists before useFlowGuard checks it
      await createOrUpdateParticipant(u.uid, {
        uid: u.uid,
        name: email.split('@')[0], // Base default name
        email: u.email || '',
        phone: '',
      });
    } catch (error) {
      console.error('Email Sign-up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
