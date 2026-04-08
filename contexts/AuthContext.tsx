'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { User as AppUser } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFallbackProfile = (firebaseUser: FirebaseUser): AppUser => {
    const email = firebaseUser.email ?? '';
    const emailName = email.includes('@') ? email.split('@')[0] : '';
    const displayParts = (firebaseUser.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = displayParts[0] ?? emailName ?? 'User';
    const lastName = displayParts.length > 1 ? displayParts.slice(1).join(' ') : '';

    return {
      uid: firebaseUser.uid,
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' '),
      username: emailName || firebaseUser.uid.slice(0, 8),
      phone: firebaseUser.phoneNumber ?? '',
      email,
      role: 'student',
      deleted: false,
      profileCompleted: false,
      status: 'active',
      createdAt: new Date(),
    };
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = undefined;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        unsubscribeFirestore = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          async (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as AppUser);
            } else {
              try {
                // Self-heal missing profile docs for signed-in users.
                await setDoc(doc(db, 'users', firebaseUser.uid), buildFallbackProfile(firebaseUser));
              } catch (error) {
                console.error('Failed to create fallback user profile:', error);
                setUserData(null);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error('Failed to load user profile from Firestore:', error);
            setUserData(null);
            setLoading(false);
          }
        );
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};