import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously as signInAnonymouslyModular,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateProfileModular,
} from "@react-native-firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

const LOCAL_PROFILE_KEY = "@data_capture_profile";

interface LocalProfile {
  name: string;
  email?: string;
}

export interface AuthUser {
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
  refreshToken?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  retryInit: () => void;
  signIn: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential> | Promise<any>;
  signUp: (name: string, email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential> | Promise<any>;
  signInAnonymously: (name: string) => Promise<AuthUser>;
  updateProfile: (profile: { name: string; email?: string }) => Promise<void>;
  logOut: () => Promise<void>;
}

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

function createAuthInstance() {
  try {
    return getAuth();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Firebase Auth kunne ikke startes. Mangler native module i build? ${message}`);
  }
}

function FatalError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.fatalContainer}>
      <Text style={styles.fatalTitle}>Appen kunne ikke starte</Text>
      <Text style={styles.fatalMessage}>{message}</Text>
      <Text style={styles.fatalHint}>
        Denne fejl betyder som regel, at den installerede udviklings-build er for gammel og ikke
        indeholder de seneste native moduler. Løsning: byg en ny EAS iOS development build og
        installér den.
      </Text>
      <Button title="Prøv igen" onPress={onRetry} />
    </View>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const init = () => {
    setInitError(null);
    setAuth(null);
    setLoading(true);
    try {
      const instance = createAuthInstance();
      setAuth(instance);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[AuthProvider] init failed", message);
      setInitError(message);
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (cancelled) return;
        const displayName = await getDisplayName();
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName || displayName,
            email: currentUser.email,
            name: currentUser.displayName || displayName,
            storedEmail: currentUser.email || undefined,
            emailVerified: currentUser.emailVerified,
            isAnonymous: currentUser.isAnonymous,
            photoURL: currentUser.photoURL,
            phoneNumber: currentUser.phoneNumber,
            providerId: currentUser.providerId,
            tenantId: currentUser.tenantId,
            metadata: currentUser.metadata,
            providerData: currentUser.providerData,
            refreshToken: undefined,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("[AuthProvider] onAuthStateChanged error", error);
        setInitError(`Firebase Auth observer fejlede: ${error.message}`);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error: initError,
      retryInit: init,
      signIn: async (email: string, password: string) => {
        if (!auth) throw new Error("Auth ikke initialiseret");
        return signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async (name: string, email: string, password: string) => {
        if (!auth) throw new Error("Auth ikke initialiseret");
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          await updateProfileModular(credential.user, { displayName: name });
        }
        await saveLocalProfile({ name, email });
        return credential;
      },
      signInAnonymously: async (name: string): Promise<AuthUser> => {
        if (!auth) throw new Error("Auth ikke initialiseret");
        const credential = await signInAnonymouslyModular(auth);
        if (credential.user) {
          await updateProfileModular(credential.user, { displayName: name });
        }
        await saveLocalProfile({ name });
        return {
          uid: credential.user.uid,
          displayName: name,
          email: credential.user.email,
          name,
          storedEmail: credential.user.email || undefined,
          emailVerified: credential.user.emailVerified,
          isAnonymous: credential.user.isAnonymous,
          photoURL: credential.user.photoURL,
          phoneNumber: credential.user.phoneNumber,
          providerId: credential.user.providerId,
          tenantId: credential.user.tenantId,
          metadata: credential.user.metadata,
          providerData: credential.user.providerData,
          refreshToken: undefined,
        };
      },
      updateProfile: async (profile: { name: string; email?: string }) => {
        if (!auth) throw new Error("Auth ikke initialiseret");
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("Ingen bruger logget ind");
        }
        await updateProfileModular(currentUser, { displayName: profile.name });
        const existing = await loadLocalProfile();
        await saveLocalProfile({
          name: profile.name,
          email: profile.email || existing?.email,
        });
      },
      logOut: async () => {
        if (!auth) throw new Error("Auth ikke initialiseret");
        return signOut(auth);
      },
    }),
    [user, loading, initError, auth]
  );

  if (initError) {
    return <FatalError message={initError} onRetry={init} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  fatalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0f172a",
  },
  fatalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 16,
  },
  fatalMessage: {
    fontSize: 14,
    color: "#fca5a5",
    marginBottom: 16,
    textAlign: "center",
  },
  fatalHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 24,
    textAlign: "center",
  },
});
