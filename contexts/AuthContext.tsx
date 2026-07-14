import AsyncStorage from "@react-native-async-storage/async-storage";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInAnonymously as signInAnonymouslyModular, signInWithEmailAndPassword, signOut, updateProfile as updateProfileModular } from "@react-native-firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

const LOCAL_PROFILE_KEY = "@data_capture_profile";

interface LocalProfile {
  name: string;
  email?: string;
}

interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  name?: string | null;
  storedEmail?: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL: string | null;
  phoneNumber: string | null;
  providerId: string;
  tenantId: string | null;
  metadata: FirebaseAuthTypes.UserMetadata;
  providerData: FirebaseAuthTypes.UserInfo[];
  refreshToken: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential> | Promise<any>;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential> | Promise<any>;
  signInAnonymously: (name: string) => Promise<AuthUser>;
  updateProfile: (profile: { name: string; email?: string }) => Promise<void>;
  logOut: () => Promise<void>;
}

const auth = getAuth();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadLocalProfile(): Promise<LocalProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveLocalProfile(profile: LocalProfile) {
  try {
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.log("Save profile error", error);
  }
}

async function getDisplayName(): Promise<string | null> {
  const profile = await loadLocalProfile();
  return profile?.name || null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const displayName = await getDisplayName();
      if (currentUser) {
        setUser({
          ...currentUser,
          name: currentUser.displayName || displayName,
          storedEmail: currentUser.email || undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      await updateProfileModular(credential.user, { displayName: name });
    }
    await saveLocalProfile({ name, email });
    return credential;
  };

  const signInAnonymously = async (name: string): Promise<AuthUser> => {
    const credential = await signInAnonymouslyModular(auth);
    if (credential.user) {
      await updateProfileModular(credential.user, { displayName: name });
    }
    await saveLocalProfile({ name });
    return { ...credential.user, name };
  };

  const updateProfile = async (profile: { name: string; email?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }
    await updateProfileModular(currentUser, { displayName: profile.name });
    const existing = await loadLocalProfile();
    await saveLocalProfile({
      name: profile.name,
      email: profile.email || existing?.email,
    });
  };

  const logOut = async () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInAnonymously,
        updateProfile,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
