"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onIdTokenChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { AuthUser } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "idle",
});

export const useAuth = () => useContext(AuthContext);

const AUTH_ROUTES = ["/login", "/register", "/complete-profile"];
const PROTECTED_ROUTES = ["/dashboard"];

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    Loading...
  </div>
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "succeeded" | "failed">("idle");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setStatus("loading");
    // Use onIdTokenChanged to capture token refreshes (e.g. after profile completion)
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snapshot = await get(ref(db, `users/${firebaseUser.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            // Accept minimal patient stub OR full doctor profile
            if (userData.role === "patient" || userData.role === "doctor") {
              setUser(userData);
            } else {
              setUser(null);
            }
          } else {
            // no /users entry yet
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("AuthProvider onIdTokenChanged error:", err);
        setUser(null);
      } finally {
        // mark the auth DB check complete
        setStatus("succeeded");
      }
    });

    return () => unsubscribe();
  }, []);

  // Redirect logic runs only AFTER status is not loading
  useEffect(() => {
    if (status === "loading" || status === "idle") return;

    const firebaseUser = auth.currentUser;
    const isProtectedRoute = PROTECTED_ROUTES.some((p) =>
      pathname.startsWith(p)
    );
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    // Not authenticated but trying to access protected
    if (!firebaseUser && isProtectedRoute) {
      router.push("/login");
      return;
    }

    // Authenticated but no user (profile) in our DB — send to complete-profile
    if (firebaseUser && !user && pathname !== "/complete-profile") {
      router.push("/complete-profile");
      return;
    }

    // Authenticated and user exists, don't allow visiting auth routes
    if (user && isAuthRoute) {
      router.push("/dashboard");
      return;
    }
  }, [user, status, pathname, router]);

  if (status === "loading" || status === "idle") return <LoadingSpinner />;

  // Prevent flicker: if user is authenticated but state user isn't yet available,
  // block until we have decided.
  const firebaseUser = auth.currentUser;
  if (firebaseUser && !user && pathname !== "/complete-profile")
    return <LoadingSpinner />;
  if (!firebaseUser && PROTECTED_ROUTES.some((p) => pathname.startsWith(p)))
    return <LoadingSpinner />;

  return (
    <AuthContext.Provider value={{ user, status }}>
      {children}
    </AuthContext.Provider>
  );
}
