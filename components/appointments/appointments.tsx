"use client";

import { useState } from "react";
import { AppointmentForm } from "./appointment-form";
import { BookedAppointmentsTable } from "./BookedAppointmentsTable";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export function Appointments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Wrapper for Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Page */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-10">
              {/* Title */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {user?.role === "doctor"
                    ? "Your Appointments"
                    : "Book an Appointment"}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                  {user?.role === "doctor"
                    ? "Manage and review upcoming appointments."
                    : "Schedule an appointment with a specialist."}
                </p>
              </div>

              {/* Patient-only: Appointment Form */}
              {user?.role === "patient" && (
                <div className="animate-fade-in">
                  <AppointmentForm />
                </div>
              )}

              {/* Appointments List */}
              <div className="animate-fade-in">
                <BookedAppointmentsTable />
              </div>
            </div>
          </div>

          {/* Future Chat Panel Placeholder */}
          {/* <ChatPanel /> */}
        </div>
      </div>

      {/* Sonner Toaster */}
      <Toaster richColors closeButton expand />
    </div>
  );
}
