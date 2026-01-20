
import { signInWithPopup } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, googleProvider } from "@/lib/firebase"; // Assuming googleProvider is exported from firebase.ts
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const handleGoogleSignIn = async (
    router: AppRouterInstance
): Promise<void> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            router.push("/complete-profile");
        } else {
            router.push("/dashboard");
        }
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        throw new Error("Failed to sign in with Google. Please try again.");
    }
};
