"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { BookedAppointmentsTable } from "@/components/appointments/BookedAppointmentsTable";

export default function AppointmentsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-red-500">
        Error: User not found. Please log in again.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-8">
      {/* Only patients can book appointments */}
      {user.role === "patient" && <AppointmentForm />}

      {/* Both doctor and patient can view appointments */}
      <BookedAppointmentsTable />
    </div>
  );
}
