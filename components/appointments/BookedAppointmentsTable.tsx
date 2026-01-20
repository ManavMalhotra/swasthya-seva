"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, update, remove } from "firebase/database";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Appointment = {
  id: string;
  doctorId: string;
  patientId: string;
  patientName?: string;
  date: string;
  time: string;
  mode: string;
  status: string;
};

export function BookedAppointmentsTable() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-red-300 text-red-600">
        Error: No user found.
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const q = ref(db, "appointments");

    const unsub = onValue(
      q,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAppointments([]);
          setLoading(false);
          return;
        }

        const data = snapshot.val();
        const arr: Appointment[] = Object.values(data);

        // filter based on role
        const filteredRaw =
          user.role === "doctor"
            ? arr.filter((a) => a.doctorId === user.uid)
            : arr.filter((a) => a.patientId === user.uid);

        // show only future and active
        const filtered = filteredRaw.filter((a) => {
          const isFutureOrToday = a.date >= today;
          const isActive = a.status === "pending" || a.status === "confirmed";
          return isFutureOrToday && isActive;
        });

        setAppointments(filtered);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load appointments.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user.uid, user.role]);

  const statusColor = (status: string) =>
    cn(
      "px-3 py-1 text-xs rounded-full font-medium",
      status === "pending" && "bg-yellow-100 text-yellow-700",
      status === "confirmed" && "bg-blue-100 text-blue-700",
      status === "completed" && "bg-green-100 text-green-700",
      status === "cancelled" && "bg-red-100 text-red-700"
    );

  // 🔥 NEW: remove from Firebase
  const removeFromFirebase = async (id: string) => {
    try {
      await remove(ref(db, `appointments/${id}`));
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove appointment.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (newStatus === "completed" || newStatus === "cancelled") {
        // DELETE from DB
        await removeFromFirebase(id);

        toast.success(
          `Appointment ${newStatus === "completed" ? "completed" : "cancelled"
          }.`
        );

        return;
      }

      // CONFIRM only updates
      await update(ref(db, `appointments/${id}`), { status: newStatus });
      toast.success("Appointment confirmed");

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 text-gray-800">
        {user.role === "doctor"
          ? "Upcoming Appointments"
          : "Your Upcoming Appointments"}
      </h2>

      {/* Loading */}
      {loading && (
        <div className="py-6 text-center text-gray-500 animate-pulse">
          Loading appointments...
        </div>
      )}

      {/* Empty */}
      {!loading && appointments.length === 0 && (
        <div className="py-8 text-center text-gray-400">
          <p className="text-sm">No upcoming appointments.</p>
        </div>
      )}

      {/* TABLE DATA */}
      {!loading && appointments.length > 0 && (
        <>
          {/* Desktop View (Table) */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border text-left">
                  {user.role === "doctor" && (
                    <th className="p-4 font-semibold text-muted-foreground">Patient</th>
                  )}
                  <th className="p-4 font-semibold text-muted-foreground">Date</th>
                  <th className="p-4 font-semibold text-muted-foreground">Time</th>
                  <th className="p-4 font-semibold text-muted-foreground">Mode</th>
                  <th className="p-4 font-semibold text-muted-foreground">Status</th>
                  {user.role === "doctor" && (
                    <th className="p-4 font-semibold text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    {user.role === "doctor" && (
                      <td className="p-4 font-medium">{a.patientName ?? "Unknown"}</td>
                    )}
                    <td className="p-4">{a.date}</td>
                    <td className="p-4">{a.time}</td>
                    <td className="p-4 capitalize">
                      <span className="inline-flex items-center gap-1.5">
                        {a.mode === "online" ? "🌐" : "🏥"} {a.mode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={statusColor(a.status)}>{a.status}</span>
                    </td>
                    {user.role === "doctor" && (
                      <td className="p-4 space-x-2">
                        <button
                          onClick={() => handleStatusChange(a.id, "confirmed")}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleStatusChange(a.id, "completed")}
                          className="text-green-600 hover:underline text-xs font-medium"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(a.id, "cancelled")}
                          className="text-destructive hover:underline text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View (Cards) */}
          <div className="md:hidden space-y-4">
            {appointments.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user.role === "doctor" ? a.patientName ?? "Unknown Patient" : "Appointment"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{a.date} at {a.time}</p>
                  </div>
                  <span className={statusColor(a.status)}>{a.status}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-2 rounded-md">
                  {a.mode === "online" ? "🌐 Online Consultation" : "🏥 In-Person Visit"}
                </div>

                {user.role === "doctor" && (
                  <div className="flex gap-2 pt-2 border-t border-border mt-1">
                    <button
                      onClick={() => handleStatusChange(a.id, "confirmed")}
                      className="flex-1 py-2 text-xs font-medium text-primary bg-primary/10 rounded-md"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleStatusChange(a.id, "completed")}
                      className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-100 rounded-md"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleStatusChange(a.id, "cancelled")}
                      className="flex-1 py-2 text-xs font-medium text-destructive bg-destructive/10 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
