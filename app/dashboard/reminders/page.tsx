// @ts-nocheck

"use client";

import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get,
} from "firebase/database";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported,
} from "firebase/messaging";
import { Plus, Bell, Clock, XCircle, Edit2, Trash2, Loader2, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { logMedicationIntake, calculateStreak, ensureMedicationExists } from "@/lib/adherenceService";
import { PatientUser } from "@/types";
import { Zap } from "lucide-react";

/**
 * FIREBASE INIT (reads from .env.local)
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  // messagingSenderId: "...",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Types
 */
type Reminder = {
  id: string;
  medicineName: string;
  dosage?: string;
  days?: number | null; // total days to take
  everyDay?: boolean; // true = every day
  weekdays?: string[]; // e.g. ["Mon", "Wed"]
  times: string[]; // array of "HH:MM" in 24-hour format
  status: "upcoming" | "missed" | "completed";
  enabled: boolean;
  createdAt: number;
  userId?: string;
};

/**
 * Helpers
 */
const nowLocal = () => new Date();

function hhmmToDateToday(hhmm: string, baseDate = new Date()) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function weekdayNameFromIndex(i: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i];
}

/**
 * Notification helpers
 */
async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

/**
 * Main Component
 */
export default function RemindersPage() {
  const { user, loading } = useAuth();
  const userId = user?.uid;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then(() => console.log("SW registered"))
        .catch((err) => console.error("SW failed:", err));
    }
  }, []);

  // Form states for add/edit:
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [days, setDays] = useState<number | "">("");
  const [everyDay, setEveryDay] = useState(true);
  const weekdaysList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [weekdays, setWeekdays] = useState<string[]>([]); // ["Mon","Tue"]
  const [times, setTimes] = useState<string[]>(["09:00"]); // default single time
  const [preset, setPreset] = useState<
    "once" | "twice" | "thrice" | "custom" | null
  >(null);

  const messagingTokenRef = useRef<string | null>(null);

  // ------------------------------------------------------------------
  // Realtime listener for reminders
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const node = ref(db, `reminders/${user.uid}`);
    const unsub = onValue(node, (snap) => {
      const val = snap.val() || {};
      const list: Reminder[] = Object.entries(val)
        .map(([key, x]: [string, any]) => ({
          ...x,
          id: key, // Ensure ID comes from the node key
          // safety defaults
          times: x.times || [],
          everyDay: x.everyDay ?? true,
          weekdays: x.weekdays || [],
          dosage: x.dosage || "",
          days: x.days ?? null,
        }))
        .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
      setReminders(list);
    });

    // Also fetch patient health data to calculate streak
    if (user.role === 'patient') {
      const patientUser = user as PatientUser;
      const patientRef = ref(db, `patients/${patientUser.patientDataId}`);
      get(patientRef).then(snap => {
        if (snap.exists()) {
          const s = calculateStreak(snap.val());
          setStreak(s);
        }
      });
    }

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" />
      </div>
    )
  }

  if (!user) return null;

  // ------------------------------------------------------------------
  // Auto-mark missed reminders logic & local scheduling
  // Runs every 30 seconds in the browser while the page is open.
  // This is a client-side convenience — for more robust behavior, run a
  // server-side job or use Cloud Functions to update statuses.
  // ------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function runner() {
      if (!mounted) return;
      const now = nowLocal();

      // Ensure Notification permission and register token (for FCM)
      await ensureNotificationPermission();
      attemptRegisterFCM();

      // For each reminder: if enabled and upcoming, check today's times:
      reminders.forEach(async (r) => {
        if (!r.enabled || r.status !== "upcoming") return;

        // If the schedule is not for today (weekdays) and not everyDay, skip
        const todayIndex = now.getDay(); // 0-6 Sun-Sat
        const todayName = weekdayNameFromIndex(todayIndex);
        // if not everyday AND today is NOT one of the selected weekdays → skip
        if (!r.everyDay && !(r.weekdays ?? []).includes(todayName)) {
          return;
        }

        // Check for each time if missed
        for (const t of r.times) {
          const scheduled = hhmmToDateToday(t, now);
          // If scheduled time is older than now by > 1 minute, and status still upcoming => mark missed
          if (scheduled.getTime() + 60_000 < now.getTime()) {
            // Only mark missed if not already marked/completed
            // Update database: set status to missed
            try {
              await update(ref(db, `reminders/${userId}/${r.id}`), {
                status: "missed",
              });
              // show local Notification
              if (Notification.permission === "granted") {
                new Notification(`${r.medicineName} — Missed`, {
                  body: `${r.medicineName} scheduled at ${t} was missed.`,
                });
              }
            } catch (e) {
              // ignore update errors
            }
            break; // once marked missed, skip other times
          }
        }
      });
    }

    runner();
    const id = setInterval(runner, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [reminders]);

  // ------------------------------------------------------------------
  // FCM: Request token and show onMessage (foreground)
  // ------------------------------------------------------------------
  async function attemptRegisterFCM() {
    try {
      if (!(await isMessagingSupported())) return;
      const messaging = getMessaging(app);
      const permission = await ensureNotificationPermission();
      if (!permission) return;
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        messagingTokenRef.current = token;
        // store token under user in DB for server to send push if needed
        await set(ref(db, `fcmTokens/${userId}/${token}`), {
          token,
          createdAt: Date.now(),
        });
      }

      // foreground message handling
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "Reminder";
        const body = payload.notification?.body || "";
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else {
          alert(`${title}\n\n${body}`);
        }
      });
    } catch (e) {
      // console.warn("FCM not available:", e);
    }
  }

  // ------------------------------------------------------------------
  // CRUD actions
  // ------------------------------------------------------------------
  const resetForm = () => {
    setMedicineName("");
    setDosage("");
    setDays("");
    setEveryDay(true);
    setWeekdays([]);
    setTimes(["09:00"]);
    setPreset(null);
    setEditing(null);
  };

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(r: Reminder) {
    setEditing(r);
    setMedicineName(r.medicineName || "");
    setDosage(r.dosage || "");
    setDays(r.days ?? "");
    setEveryDay(r.everyDay ?? true);
    setWeekdays(r.weekdays ?? []);
    setTimes(Array.isArray(r.times) && r.times.length ? r.times : ["09:00"]);
    setPreset(null);
    setShowModal(true);
  }

  const saveReminder = async () => {
    if (!medicineName || times.length === 0)
      return alert("Add medicine name and at least one time.");

    const payload: Partial<Reminder> = {
      medicineName,
      dosage,
      days: days === "" ? null : Number(days),
      everyDay,
      weekdays: everyDay ? [] : weekdays,
      times,
      status: "upcoming",
      enabled: true,
      createdAt: Date.now(),
      userId,
    };

    if (editing) {
      await update(ref(db, `reminders/${userId}/${editing.id}`), payload);
    } else {
      const newRef = push(ref(db, `reminders/${userId}`));
      await set(newRef, {
        id: newRef.key,
        ...payload,
      });
    }

    // SYNC: Ensure this medication is in the patient's health profile
    if (user.role === 'patient') {
      const pUser = user as PatientUser;
      // Fire and forget - don't block UI
      ensureMedicationExists(
        pUser.patientDataId,
        medicineName,
        dosage,
        "As per reminder" // Frequency inference could be improved if needed
      ).catch(e => console.error("Failed to sync manual reminder to health record:", e));
    }

    setShowModal(false);
    resetForm();
  };

  const deleteReminder = async (r: Reminder) => {
    if (!userId) {
      toast.error("User not verified");
      return;
    }
    if (!confirm(`Delete reminder for ${r.medicineName}?`)) return;
    try {
      await remove(ref(db, `reminders/${userId}/${r.id}`));
      toast.success("Reminder deleted");
    } catch (e) {
      toast.error("Failed to delete reminder");
    }
  };

  const markCompleted = async (r: Reminder) => {
    if (!userId) return;
    try {
      await update(ref(db, `reminders/${userId}/${r.id}`), {
        status: "completed",
      });

      // SYNC: Log adherence to medical record
      if (user.role === 'patient') {
        const pUser = user as PatientUser;
        // We catch adherence log errors so they don't block the main completion flow
        try {
          await logMedicationIntake(pUser.patientDataId, r.medicineName, "taken");
          // Update streak locally for immediate feedback (simplified)
          setStreak(prev => prev + (prev === 0 ? 1 : 0));
        } catch (err) {
          console.error("Adherence logging failed", err);
        }
      }

      toast.success("Marked as done!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  };

  // Toggle enable/disable
  const toggleEnabled = async (r: Reminder) => {
    if (!userId) return;
    try {
      await update(ref(db, `reminders/${userId}/${r.id}`), {
        enabled: !r.enabled,
      });
      toast.success(r.enabled ? "Reminder paused" : "Reminder activated");
    } catch (e) {
      toast.error("Failed to toggle reminder");
    }
  };

  // ------------------------------------------------------------------
  // UI helpers for presets and times
  // ------------------------------------------------------------------
  const applyPreset = (p: typeof preset) => {
    setPreset(p);
    if (p === "once") setTimes(["09:00"]);
    if (p === "twice") setTimes(["09:00", "20:00"]);
    if (p === "thrice") setTimes(["08:00", "14:00", "20:00"]);
    if (p === "custom") setTimes(["09:00"]);
  };

  const addTimeSlot = () => setTimes((s) => [...s, "09:00"]);
  const removeTimeSlot = (idx: number) =>
    setTimes((s) => s.filter((_, i) => i !== idx));
  const updateTimeSlot = (idx: number, val: string) =>
    setTimes((s) => s.map((t, i) => (i === idx ? val : t)));

  const toggleWeekday = (day: string) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleTestNotification = async () => {
    const granted = await ensureNotificationPermission();
    if (granted) {
      new Notification("Swasthya Seva Test", {
        body: "This is a test notification from Swasthya Seva!",
      });
      toast.success("Test notification sent!");
    } else {
      toast.error("Notification permission denied. Please check any popups.");
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          <Bell className="text-purple-600" />
          Medication Reminders

          {streak > 0 && (
            <div className="ml-4 flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full border border-amber-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
              {streak} Day Streak!
            </div>
          )}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 border border-gray-300"
          >
            Test Notif
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            <Plus size={16} /> Add Reminder
          </button>
        </div>
      </div>

      {/* reminders list */}
      <div className="space-y-6">
        {/* Upcoming */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Upcoming</h2>
          <div className="space-y-3">
            {reminders.filter((r) => r.status === "upcoming").length === 0 ? (
              <p className="text-gray-500">No upcoming reminders.</p>
            ) : (
              reminders
                .filter((r) => r.status === "upcoming")
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white rounded-lg shadow flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <Clock className="text-purple-600" />
                        <div>
                          <h3 className="font-semibold">{r.medicineName}</h3>
                          <p className="text-sm text-gray-500">
                            {r.dosage ? `${r.dosage} · ` : ""}
                            {r.everyDay
                              ? "Every day"
                              : (r.weekdays ?? []).join(", ")}{" "}
                            · {r.times.join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        title="Edit"
                        onClick={() => openEditModal(r)}
                        className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        title="Delete"
                        onClick={() => deleteReminder(r)}
                        className="p-2 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        title={r.enabled ? "Pause Reminder" : "Activate Reminder"}
                        onClick={() => toggleEnabled(r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${r.enabled
                          ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                          : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                          }`}
                      >
                        {r.enabled ? "Active" : "Paused"}
                      </button>

                      <button
                        onClick={() => markCompleted(r)}
                        className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Check size={14} /> Done
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Missed */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Missed</h2>
          <div className="space-y-3">
            {reminders.filter((r) => r.status === "missed").length === 0 ? (
              <p className="text-gray-500">No missed reminders.</p>
            ) : (
              reminders
                .filter((r) => r.status === "missed")
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="text-red-500" />
                      <div>
                        <h3 className="font-semibold">{r.medicineName}</h3>
                        <p className="text-sm text-gray-500">
                          Missed at {r.times.join(", ")} · {r.dosage || ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        title="Delete"
                        onClick={() => deleteReminder(r)}
                        className="p-2 rounded-md hover:bg-gray-100"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() =>
                          update(ref(db, `reminders/${userId}/${r.id}`), {
                            status: "upcoming",
                          })
                        }
                        className="px-3 py-1 rounded-full bg-yellow-500 text-white text-sm"
                      >
                        Mark Upcoming
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {reminders.filter((r) => r.status === "completed").length === 0 ? (
              <p className="text-gray-500">No completed reminders.</p>
            ) : (
              reminders
                .filter((r) => r.status === "completed")
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="text-green-600" />
                      <div>
                        <h3 className="font-semibold">{r.medicineName}</h3>
                        <p className="text-sm text-gray-500">
                          {r.times.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        title="Delete"
                        onClick={() => deleteReminder(r)}
                        className="p-2 rounded-md hover:bg-gray-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editing ? "Edit Reminder" : "Add Reminder"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700">Medicine name</label>
                <input
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  className="w-full border rounded-md p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">
                  Dosage (optional)
                </label>
                <input
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full border rounded-md p-2 mt-1"
                  placeholder="e.g. 500 mg"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">
                  Number of days (optional)
                </label>
                <input
                  value={days}
                  onChange={(e) =>
                    setDays(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  type="number"
                  min={1}
                  className="w-full border rounded-md p-2 mt-1"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">Schedule</label>
                <div className="mt-1 space-y-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={everyDay}
                      onChange={() => setEveryDay(true)}
                    />
                    Every day
                  </label>

                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!everyDay}
                      onChange={() => {
                        setEveryDay(false);
                        // Keep already selected weekdays
                      }}
                    />
                    Specific weekdays
                  </label>

                  <div
                    className={everyDay ? "pointer-events-none opacity-50" : ""}
                  >
                    {!everyDay && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {weekdaysList.map((d) => (
                          <label
                            key={d}
                            className={`p-2 border rounded-md text-center cursor-pointer ${weekdays.includes(d)
                              ? "bg-purple-600 text-white"
                              : ""
                              }`}
                            onClick={() => toggleWeekday(d)}
                          >
                            <input
                              type="checkbox"
                              checked={weekdays.includes(d)}
                              readOnly
                              className="hidden"
                            />
                            <div className="text-sm">{d}</div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Presets & times */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-700">
                  Dose frequency / Times
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    className={`px-3 py-1 rounded-md border ${preset === "once" ? "bg-purple-600 text-white" : ""
                      }`}
                    onClick={() => applyPreset("once")}
                  >
                    Once
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md border ${preset === "twice" ? "bg-purple-600 text-white" : ""
                      }`}
                    onClick={() => applyPreset("twice")}
                  >
                    Twice
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md border ${preset === "thrice" ? "bg-purple-600 text-white" : ""
                      }`}
                    onClick={() => applyPreset("thrice")}
                  >
                    Thrice
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md border ${preset === "custom" ? "bg-purple-600 text-white" : ""
                      }`}
                    onClick={() => applyPreset("custom")}
                  >
                    Custom
                  </button>

                  <div className="ml-auto text-sm text-gray-500">
                    Times per day: {times.length}
                  </div>
                </div>

                {/* times list */}
                <div className="mt-3 space-y-2">
                  {times.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => updateTimeSlot(idx, e.target.value)}
                        className="border rounded-md p-2"
                      />
                      <button
                        className="px-3 py-1 bg-gray-200 rounded-md"
                        onClick={() => removeTimeSlot(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="mt-2">
                    <button
                      onClick={addTimeSlot}
                      className="px-3 py-1 bg-gray-100 rounded-md"
                    >
                      + Add time
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveReminder}
                className="px-4 py-2 bg-purple-600 text-white rounded-md"
              >
                {editing ? "Save changes" : "Add reminder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
