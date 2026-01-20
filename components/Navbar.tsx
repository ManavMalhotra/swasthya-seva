"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { app, googleProvider } from "@/lib/firebase"; // Make sure this path is correct
import { useRouter } from "next/navigation";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const auth = getAuth(app);
    const router = useRouter();

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            router.push("/dashboard");
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    return (
        <nav className="fixed top-0 w-full z-50 glass-panel border-b border-gray-200/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-lg shadow-lg">
                            <Heart className="w-6 h-6 text-white fill-current" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-800">
                            Swasthya Seva
                        </span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/" className={cn("text-gray-600 hover:text-teal-600 transition", pathname === "/" && "text-teal-600 font-semibold")}>
                            Home
                        </Link>
                        <Link href="/dashboard" className={cn("text-gray-600 hover:text-teal-600 transition", pathname === "/dashboard" && "text-teal-600 font-semibold")}>
                            Dashboard
                        </Link>
                        <Link href="/onboarding" className={cn("text-gray-600 hover:text-teal-600 transition", pathname === "/onboarding" && "text-teal-600 font-semibold")}>
                            Onboarding
                        </Link>
                        <button onClick={handleLogin} className="btn-primary">
                            Get Started
                        </button>
                    </div>

                    <div className="md:hidden">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
                            {isOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden glass-panel">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600">Home</Link>
                        <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600">Dashboard</Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
