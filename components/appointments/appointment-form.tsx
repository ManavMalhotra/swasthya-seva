"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DoctorInfo = {
  uid: string;
  displayName: string;
  email: string | null;
  role: string;
};

export function AppointmentForm({ defaultDoctorId, onSuccess }: { defaultDoctorId?: string, onSuccess?: (date: string) => void }) {
  const { user } = useAuth();

  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [specialist, setSpecialist] = useState(defaultDoctorId || "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [mode, setMode] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const slots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];

  const today = new Date().toISOString().split("T")[0];

  // Load doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snap = await get(ref(db, "users"));
        if (!snap.exists()) {
          setDoctors([]);
          return;
        }

        const usersObj = snap.val();

        const docs = Object.values(usersObj)
          .filter((u: any) => u.role === "doctor")
          .map((u: any) => ({
            uid: u.uid,
            displayName: u.displayName ?? "Unnamed Doctor",
            email: u.email ?? "",
            role: u.role,
          }));

        setDoctors(docs);
      } catch (err) {
        console.error("Error loading doctors:", err);
        toast.error("Failed to load doctors. Try again later.");
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login first.");
      return;
    }

    if (!specialist || !slot || !mode || !date) {
      toast.error("Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const appointmentId = push(ref(db, "appointments")).key!;

      // Handle union type access safetly
      const patientDataId = user.role === 'patient' ? (user as any).patientDataId : null;
      // Use profile.firstName/lastName for fallback name if needed, or Auth 'displayName'
      const patientName = user.role === 'patient'
        ? (user as any).displayName || "Unknown Patient"
        : (user as any).displayName || "Unknown";

      const appointmentData = {
        id: appointmentId,
        doctorId: specialist,
        patientId: user.uid,
        patientDataId: patientDataId,
        patientName: patientName,
        patientEmail: user.email ?? "N/A",

        date,
        time: slot,
        mode,
        status: "pending",
        createdAt: Date.now(),
      };

      await set(ref(db, `appointments/${appointmentId}`), appointmentData);

      toast.success(`Appointment booked for ${date} at ${slot}`);

      setSpecialist("");
      setDate("");
      setSlot("");
      setMode("");

      // Trigger success callback if provided
      if (onSuccess) onSuccess(date);
    } catch (err) {
      console.error("Error booking appointment:", err);
      toast.error("Failed to book appointment.");
    }

    setLoading(false);
  };

  return (
    <Card className="w-full border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl font-semibold">
          Book Appointment
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SELECT DOCTOR */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Doctor *</label>
            <Select
              value={specialist}
              onValueChange={setSpecialist}
              disabled={loadingDoctors}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingDoctors ? "Loading doctors..." : "Choose doctor"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {doctors.length === 0 && (
                  <SelectItem disabled value="none">
                    No doctors found
                  </SelectItem>
                )}

                {doctors.map((doc) => (
                  <SelectItem key={doc.uid} value={doc.uid}>
                    {doc.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DATE PICKER */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date *</label>
            <Input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* TIME SLOT */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Time Slot *</label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map((t) => (
                <Button
                  key={t}
                  type="button"
                  onClick={() => setSlot(t)}
                  variant={slot === t ? "default" : "outline"}
                  className={cn(
                    "py-2 transition-all duration-200",
                    slot === t && "scale-[1.05]"
                  )}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* MODE BUTTONS */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode of Appointment *</label>

            <div className="flex flex-wrap gap-2">
              {["online", "in-person", "phone"].map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={mode === m ? "default" : "outline"}
                  onClick={() => setMode(m)}
                  className={cn(
                    "capitalize transition-all duration-200",
                    mode === m && "scale-[1.05]"
                  )}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            disabled={!specialist || !slot || !mode || !date || loading}
            className="w-full md:w-auto mt-4 transition-all"
          >
            {loading ? "Booking..." : "Book Appointment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
