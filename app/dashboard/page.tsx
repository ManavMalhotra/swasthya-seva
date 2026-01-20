"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { getDatabase, onValue, ref } from "firebase/database";
import { useRouter } from "next/navigation";
import ChatBot from "@/components/ChatBot";
import { Bell, Calendar, LogOut, Pill } from "lucide-react";

export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const [remindersCount, setRemindersCount] = useState(0);
    const [nextReminder, setNextReminder] = useState<any>(null);
    const router = useRouter();
    const auth = getAuth(app);
    const db = getDatabase(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (!authUser) {
                router.push("/");
            } else {
                setUser(authUser);
            }
        });
        return () => unsubscribe();
    }, [auth, router]);

    useEffect(() => {
        if (user) {
            const remindersRef = ref(db, `reminders/${user.uid}`);
            onValue(remindersRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const list = Object.values(data);
                    setRemindersCount(list.length);
                    // Simple logic to just show the first active one for MVP
                    const active = list.find((r: any) => r.status === 'active');
                    setNextReminder(active);
                } else {
                    setRemindersCount(0);
                    setNextReminder(null);
                }
            });
        }
    }, [user, db]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.displayName}</h1>
                        <p className="text-gray-500">Here is your daily health overview.</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        onClick={() => router.push('/dashboard/reminders')}
                        className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white cursor-pointer hover:shadow-xl transition transform hover:scale-[1.02]"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg"><Bell className="w-6 h-6" /></div>
                            <h3 className="font-semibold text-lg">Next Reminder</h3>
                        </div>
                        {nextReminder ? (
                            <>
                                <p className="text-3xl font-bold">{Array.isArray(nextReminder.times) ? nextReminder.times[0] : nextReminder.times}</p>
                                <p className="text-teal-100 mt-1">{nextReminder.medicineName} ({nextReminder.dosage})</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xl font-bold">All caught up!</p>
                                <p className="text-teal-100 mt-1">No pending meds</p>
                            </>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar className="w-6 h-6" /></div>
                            <h3 className="font-semibold text-lg text-gray-900">Appointments</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">0</p>
                        <p className="text-gray-500 mt-1">No upcoming appointments</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Pill className="w-6 h-6" /></div>
                            <h3 className="font-semibold text-lg text-gray-900">Active Meds</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{remindersCount}</p>
                        <p className="text-gray-500 mt-1">Managed via ChatBot</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <p className="text-lg">Health Timeline Visualization</p>
                            <p className="text-sm">(Coming Soon)</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-gray-700">
                                + Add new vital reading
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-gray-700">
                                + Book Appointment
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-teal-50 hover:text-teal-700 transition font-medium text-gray-700">
                                Request Report Analysis
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ChatBot />
        </div>
    );
}
