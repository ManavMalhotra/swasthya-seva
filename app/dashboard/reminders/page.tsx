"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, remove, update } from "firebase/database";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle, CheckCircle, BellRing } from "lucide-react";

interface Reminder {
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    times: string[]; // ["Morning", "Night"] or ["08:00", "20:00"]
    status: "active" | "completed";
}

export default function RemindersPage() {
    const [user, setUser] = useState<any>(null);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const auth = getAuth(app);
    const db = getDatabase(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (!authUser) {
                router.push("/");
            } else {
                setUser(authUser);
                const remindersRef = ref(db, `reminders/${authUser.uid}`);
                onValue(remindersRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const list: Reminder[] = Object.keys(data).map((key) => ({
                            id: key,
                            ...data[key],
                        }));
                        setReminders(list);
                    } else {
                        setReminders([]);
                    }
                    setLoading(false);
                });
            }
        });

        return () => unsubscribe();
    }, [auth, router, db]);

    const handleDelete = async (id: string) => {
        if (!user) return;
        await remove(ref(db, `reminders/${user.uid}/${id}`));
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        if (!user) return;
        const newStatus = currentStatus === "active" ? "completed" : "active";
        await update(ref(db, `reminders/${user.uid}/${id}`), {
            status: newStatus
        });
    }

    const triggerDemoNotification = () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            new Notification("Time for your meds!", {
                body: "Take Paracetamol (500mg) - After Food",
                icon: "/favicon.ico", // Using favicon as placeholder icon
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification("Notifications Enabled", {
                        body: "You will now receive medication reminders.",
                        icon: "/favicon.ico",
                    });
                }
            });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading reminders...</div>;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Medication Reminders</h1>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={triggerDemoNotification}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition"
                        >
                            <BellRing className="w-4 h-4" /> Test Notification
                        </button>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                            &larr; Back to Dashboard
                        </button>
                    </div>
                </div>

                {reminders.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No reminders set</h3>
                        <p className="text-gray-500 mt-2">Upload a prescription via the ChatBot to automatically set reminders.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {reminders.map((reminder) => (
                            <div
                                key={reminder.id}
                                className={`p-6 rounded-xl border flex justify-between items-center transition-all ${reminder.status === 'completed'
                                    ? 'bg-gray-50 border-gray-100 opacity-75'
                                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleStatus(reminder.id, reminder.status)}
                                        className={`p-2 rounded-full transition ${reminder.status === 'completed' ? 'text-teal-500 bg-teal-50' : 'text-gray-300 hover:bg-gray-100'
                                            }`}
                                    >
                                        <CheckCircle className="w-6 h-6" />
                                    </button>
                                    <div>
                                        <h3 className={`font-semibold text-lg ${reminder.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                            {reminder.medicineName}
                                        </h3>
                                        <div className="text-sm text-gray-500 mt-1 flex gap-3">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{reminder.dosage}</span>
                                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">{reminder.frequency}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right mr-4">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Scheduled Times</p>
                                        <p className="font-medium text-gray-700">{Array.isArray(reminder.times) ? reminder.times.join(", ") : reminder.times}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(reminder.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
