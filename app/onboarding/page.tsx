"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, update } from "firebase/database";
import { app } from "@/lib/firebase";
import { motion } from "framer-motion";

export default function Onboarding() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const auth = getAuth(app);
    const db = getDatabase(app);

    const [formData, setFormData] = useState({
        fullName: "",
        age: "",
        gender: "select",
        bloodType: "select",
        allergies: "",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                setUser(authUser);
                setFormData(prev => ({ ...prev, fullName: authUser.displayName || "" }));
                setLoading(false);
            } else {
                router.push("/");
            }
        });
        return () => unsubscribe();
    }, [auth, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await update(ref(db, `users/${user.uid}/profile`), {
                ...formData,
                onboardingCompleted: true,
            });
            // Set role as patient by default for MVP
            await update(ref(db, `users/${user.uid}`), {
                role: "patient",
                email: user.email,
                displayName: formData.fullName,
            });
            router.push("/dashboard");
        } catch (error) {
            console.error("Error saving profile:", error);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-gray-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full glass-panel p-8 rounded-2xl shadow-xl"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">Patient Onboarding</h2>
                    <p className="mt-2 text-sm text-gray-600">Tell us a bit about yourself to get started.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Age</label>
                            <input
                                type="number"
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="select" disabled>Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Allergies (Optional)</label>
                        <textarea
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            value={formData.allergies}
                            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all transform hover:scale-[1.02]"
                    >
                        Complete Profile
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
