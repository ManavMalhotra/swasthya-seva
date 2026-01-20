"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { handleGoogleSignIn } from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const router = useRouter();

  // Email/password signup — NO DB writes here
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name from form
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`.trim()
      });
      // move to complete-profile where we will write DB entries
      router.push("/complete-profile");
    } catch (err: any) {
      setError(err.message || "Failed to register");
      setIsLoading(false);
    }
  };

  // Google sign in — do not write DB here; complete-profile will handle DB writes
  const handleGoogleRegister = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setError(null);

    try {
      await handleGoogleSignIn(router); // should only sign-in
      router.push("/complete-profile");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Register</h1>
        <p className="text-muted-foreground">Start your health journey today</p>
      </div>

      {/* Role selector */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <label
          className={cn(
            "p-3 border rounded-xl cursor-pointer text-center transition-all",
            role === "patient"
              ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
              : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <input
            type="radio"
            name="role"
            value="patient"
            checked={role === "patient"}
            onChange={() => setRole("patient")}
            className="sr-only"
          />
          Individual
        </label>
        <label
          className={cn(
            "p-3 border rounded-xl cursor-pointer text-center transition-all",
            role === "doctor"
              ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
              : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <input
            type="radio"
            name="role"
            value="doctor"
            checked={role === "doctor"}
            onChange={() => setRole("doctor")}
            className="sr-only"
          />
          Specialist
        </label>
      </div>

      <form onSubmit={handleRegister} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="First Name"
          />
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Last Name"
          />
        </div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email address"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Password"
        />

        <p className="text-sm text-muted-foreground pt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Login
          </Link>
        </p>

        <Button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      {error && <p className="mt-4 text-center text-sm font-medium text-destructive">{error}</p>}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleRegister}
        disabled={isLoading || isGoogleLoading}
        className="w-full gap-2"
      >
        <svg className="h-5 w-5" viewBox="0 0 48 48">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
        {isGoogleLoading ? "Signing up..." : "Continue with Google"}
      </Button>
    </div>
  );
}
