"use client";

import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import DoctorDashboard from "@/components/DoctorDashboard";
import PatientDashboard from "@/components/PatientDashboard";
import {
  PatientHealthData,
  PatientUser,
  DoctorUser,
  isPatientUser,
  isDoctorUser
} from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [patientsList, setPatientsList] = useState<PatientHealthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Doctor: Fetch only assigned patients
        if (isDoctorUser(user)) {
          const doctorUser = user as DoctorUser;
          const assignedPatientIds = Object.keys(doctorUser.assignedPatients || {});

          if (assignedPatientIds.length > 0) {
            // First, fetch all users to lookup patient names by patientDataId
            const usersSnap = await get(ref(db, "users"));
            const usersData: Record<string, {
              displayName?: string;
              patientDataId?: string;
              profile?: {
                firstName?: string;
                lastName?: string;
                dob?: string;
                gender?: string;
              }
            }> = usersSnap.exists() ? usersSnap.val() : {};

            // Create a lookup map: patientDataId -> user info
            const patientIdToUserInfo: Record<string, {
              name: string;
              dob?: string;
              gender?: string;
            }> = {};

            Object.values(usersData).forEach((u) => {
              if (u.patientDataId) {
                const firstName = u.profile?.firstName || "";
                const lastName = u.profile?.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim() || u.displayName || "Unknown";
                patientIdToUserInfo[u.patientDataId] = {
                  name: fullName,
                  dob: u.profile?.dob,
                  gender: u.profile?.gender,
                };
              }
            });

            // Fetch each assigned patient's health data and enrich with user info
            const patientPromises = assignedPatientIds.map(async (patientDataId) => {
              const snap = await get(ref(db, `patients/${patientDataId}`));
              if (snap.exists()) {
                const patientData = snap.val();
                const userInfo = patientIdToUserInfo[patientDataId];

                return {
                  ...patientData,
                  id: patientDataId,
                  // Enrich with user profile data
                  name: userInfo?.name || patientData.name || "Unknown",
                  dob: userInfo?.dob || patientData.dob,
                  gender: userInfo?.gender || patientData.gender,
                  conditions: patientData.conditions || [],
                  medications: patientData.medications || [],
                  vitalsHistory: patientData.vitalsHistory || {},
                  healthScoreHistory: patientData.healthScoreHistory || [],
                } as PatientHealthData;
              }
              return null;
            });

            const patients = (await Promise.all(patientPromises)).filter(Boolean) as PatientHealthData[];
            setPatientsList(patients);
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-muted-foreground">No user found. Please log in again.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  // Doctor Dashboard
  if (isDoctorUser(user)) {
    return <DoctorDashboard patients={patientsList} doctor={user as DoctorUser} />;
  }

  // Patient Dashboard
  if (isPatientUser(user)) {
    const patientUser = user as PatientUser;
    return (
      <PatientDashboard
        patientId={patientUser.patientDataId}
        user={patientUser}
      />
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-destructive">Unknown user role. Please contact support.</div>
    </div>
  );
}
