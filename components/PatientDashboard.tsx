"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { ref, get, set, push, onValue } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { cleanForFirebase } from "@/lib/firebaseUtils";
import {
  PatientUser,
  PatientHealthData,
  Medication,
  VitalRecord,
  Report,
  Allergy,
  MedicationAdherenceLog
} from "@/types";
import { Heart, Activity, Stethoscope, Shield, FileText, User, Calendar, Pill, AlertCircle, Upload, X, Download, Eye, Check, XCircle, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { calculateHealthScore } from "@/lib/healthScore";

interface PatientDashboardProps {
  patientId: string;            // The 8-char patientDataId
  user: PatientUser;            // The auth-linked user data (profile info)
}

// Helper to safely get latest vital record from vitalsHistory
const getLatestVitalRecord = (
  vitalsHistory: Record<string, VitalRecord[]> | undefined,
  key: string
): VitalRecord | null => {
  if (!vitalsHistory || !vitalsHistory[key] || vitalsHistory[key].length === 0) {
    return null;
  }

  const records = vitalsHistory[key];
  // Sort by timestamp descending and get latest
  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
  return sorted[0];
};

// Helper to get just the value string
const getLatestVital = (
  vitalsHistory: Record<string, VitalRecord[]> | undefined,
  key: string
): string => {
  const record = getLatestVitalRecord(vitalsHistory, key);
  return record ? String(record.value) : "--";
};

export default function PatientDashboard({
  patientId,
  user,
}: PatientDashboardProps) {
  const [healthData, setHealthData] = useState<PatientHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload report state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState<"prescription_pdf" | "lab_result" | "imaging" | "discharge_summary" | "other">("lab_result");
  const [reportFile, setReportFile] = useState<File | null>(null);

  // Medication dose log state
  const [loggingMedId, setLoggingMedId] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<"taken" | "skipped">("taken");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch health data from /patients/{patientDataId} - REALTIME
  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const patientRef = ref(db, `patients/${patientId}`);

    const unsubscribe = onValue(patientRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as PatientHealthData;
        setHealthData({
          ...data,
          // Ensure arrays are initialized
          conditions: data.conditions || [],
          medications: data.medications || [],
          healthScoreHistory: data.healthScoreHistory || [],
          vitalsHistory: data.vitalsHistory || {},
          allergies: data.allergies || [],
          reports: data.reports || [],
        });
      } else {
        // Handle empty data case if needed
        setHealthData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching health data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patientId]);

  // Derived: Latest vitals with timestamps
  const latestVitals = useMemo(() => {
    if (!healthData?.vitalsHistory) return { values: {}, records: {} };

    return {
      values: {
        heartRate: getLatestVital(healthData.vitalsHistory, "heartRate"),
        systolic: getLatestVital(healthData.vitalsHistory, "systolic"),
        diastolic: getLatestVital(healthData.vitalsHistory, "diastolic"),
        spo2: getLatestVital(healthData.vitalsHistory, "spo2"),
        weight: healthData.weight_kg ? String(healthData.weight_kg) : "--",
      },
      records: {
        heartRate: getLatestVitalRecord(healthData.vitalsHistory, "heartRate"),
        systolic: getLatestVitalRecord(healthData.vitalsHistory, "systolic"),
        spo2: getLatestVitalRecord(healthData.vitalsHistory, "spo2"),
      }
    };
  }, [healthData]);

  // Derived: Health score - Use history if available, else calculate dynamically
  const healthScore = useMemo(() => {
    if (!healthData) return null;

    // 1. Try to get from history
    if (healthData.healthScoreHistory?.length > 0) {
      return healthData.healthScoreHistory[healthData.healthScoreHistory.length - 1];
    }

    // 2. Fallback: Calculate dynamically
    const calculated = calculateHealthScore(healthData);
    return {
      score: calculated.score,
      trend: calculated.trend,
      factors: calculated.factors,
      date: new Date().toISOString()
    };
  }, [healthData]);

  // Derived: Medication adherence (last 7 days)
  const adherenceData = useMemo(() => {
    if (!healthData?.medications?.length) {
      return Array(7).fill({ count: 0, total: 0, date: "" });
    }

    const days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));

    return days.map(day => {
      let takenCount = 0;
      let totalScheduled = 0;

      healthData.medications.forEach((med: Medication) => {
        if (!med.isActive) return;
        totalScheduled++;

        if (med.adherenceLog) {
          const log = med.adherenceLog.find(l =>
            isSameDay(parseISO(l.date), day)
          );
          if (log?.status === 'taken') takenCount++;
        }
      });

      return {
        date: format(day, "EEE"),
        count: takenCount,
        total: totalScheduled
      };
    });
  }, [healthData]);

  // Derived: Active medications count
  const activeMedsCount = useMemo(() => {
    return healthData?.medications?.filter(m => m.isActive).length || 0;
  }, [healthData]);

  // Derived: Active conditions
  const activeConditions = useMemo(() => {
    return healthData?.conditions?.filter(c => c.status === 'active') || [];
  }, [healthData]);

  // Upload report handler
  const handleUploadReport = async () => {
    if (!reportTitle || !reportFile || !patientId) return;
    setUploading(true);
    try {
      // Get auth token for API call
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('file', reportFile);
      formData.append('patientId', patientId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Upload failed");

      // Save report metadata to Firebase
      const report: Report = {
        id: push(ref(db, `p`)).key!,
        title: reportTitle,
        type: reportType,
        cloudinaryPublicId: data.publicId,
        resourceType: data.resourceType,
        version: data.version,
        format: data.format,
        uploadedBy: user.uid,
        uploadedByName: user.displayName || `${user.profile.firstName} ${user.profile.lastName}`,
        uploadedAt: Date.now()
      };
      const reports = [...(healthData?.reports || []), report];
      await set(ref(db, `patients/${patientId}/reports`), cleanForFirebase(reports));
      setHealthData(prev => prev ? { ...prev, reports } : prev);

      // Reset form
      setReportTitle("");
      setReportFile(null);
      setShowUploadModal(false);
      alert("Report uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // State for report preview
  const [previewData, setPreviewData] = useState<{ url: string; type: string; format?: string; title?: string } | null>(null);

  // View report - get signed URL and show in modal
  const viewReport = async (report: Report) => {
    // Legacy support for direct URLs (check fileUrl first, like patient detail page)
    if (report.fileUrl) {
      setPreviewData({ url: report.fileUrl, type: 'image', title: report.title });
      return;
    }

    if (!report.cloudinaryPublicId) {
      alert("No file identifier found.");
      return;
    }

    console.log('[ViewReport] Report data:', {
      publicId: report.cloudinaryPublicId,
      resourceType: report.resourceType,
      version: report.version,
      format: report.format
    });

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const payload = {
        publicId: report.cloudinaryPublicId,
        resourceType: report.resourceType,
        version: report.version,
        format: report.format,
        patientId
      };

      console.log('[ViewReport] Requesting signed URL with payload:', payload);

      const res = await fetch('/api/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('[ViewReport] Signed URL response:', data);

      if (data.success && data.url) {
        const isImage = report.resourceType === 'image' ||
          ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(report.format?.toLowerCase() || '');
        const isPdf = report.format?.toLowerCase() === 'pdf' ||
          report.cloudinaryPublicId?.toLowerCase().endsWith('.pdf');

        setPreviewData({
          url: data.url,
          type: isImage ? 'image' : 'raw',
          format: isPdf ? 'pdf' : report.format,
          title: report.title
        });
      } else {
        console.error('[ViewReport] Failed:', data.error);
        alert(data.error || "Failed to load file");
      }
    } catch (err: any) {
      console.error('[ViewReport] Error:', err);
      alert(err.message || "Failed to load report");
    }
  };

  // Download report
  const downloadReport = async (report: Report) => {
    // Legacy support for direct URLs
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
      return;
    }

    if (!report.cloudinaryPublicId) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch('/api/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          publicId: report.cloudinaryPublicId,
          resourceType: report.resourceType,
          version: report.version,
          patientId
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert("Could not generate download link");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download report");
    }
  };

  // Log medication dose for today
  const logMedicationDose = async (medId: string, status: "taken" | "skipped") => {
    if (!patientId || !healthData) return;

    try {
      const medication = healthData.medications?.find(m => m.id === medId);
      if (!medication) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const now = format(new Date(), "HH:mm");

      // Check if already logged today
      const existingLog = medication.adherenceLog?.find(l => l.date === today);
      if (existingLog) {
        alert("You've already logged this medication for today.");
        setLoggingMedId(null);
        return;
      }

      const newLog: MedicationAdherenceLog = {
        date: today,
        time: now,
        status: status
      };

      const updatedAdherenceLog = [...(medication.adherenceLog || []), newLog];
      const updatedMedications = healthData.medications.map(m =>
        m.id === medId ? { ...m, adherenceLog: updatedAdherenceLog } : m
      );

      await set(ref(db, `patients/${patientId}/medications`), cleanForFirebase(updatedMedications));
      setHealthData(prev => prev ? { ...prev, medications: updatedMedications } : prev);
      setLoggingMedId(null);

    } catch (err) {
      console.error("Failed to log medication:", err);
      alert("Failed to log medication");
    }
  };

  // Check if medication was logged today
  const isMedicationLoggedToday = (med: Medication) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return med.adherenceLog?.some(l => l.date === today);
  };

  // Get today's log status for a medication
  const getTodayLogStatus = (med: Medication): "taken" | "skipped" | "missed" | null => {
    const today = format(new Date(), "yyyy-MM-dd");
    const log = med.adherenceLog?.find(l => l.date === today);
    return log?.status || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="animate-pulse text-muted-foreground flex flex-col items-center gap-2">
          <Activity className="w-8 h-8 text-primary animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Calculate score display
  const currentScore = healthScore?.score ?? 0;
  const isScoreAvailable = !!healthScore;
  const healthLabel = currentScore > 80 ? "Excellent" : currentScore > 60 ? "Good" : "Action Needed";
  const healthColor = currentScore > 80 ? "var(--color-primary)" : currentScore > 60 ? "#f59e0b" : "#ef4444"; // Use CSS var for primary

  // Score ring calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (currentScore / 100));

  // Get first name from user profile
  const firstName = user.profile?.firstName || user.displayName?.split(' ')[0] || "Patient";

  return (
    <div className="min-h-screen w-full bg-gray-50/50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border-2 border-teal-200">
              {firstName.charAt(0)}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Good {getTimeOfDay()}, {firstName} 👋
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-13 hidden sm:block">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>

        <Link href="/profile">
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "#f0fdfa" }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-teal-100 text-teal-700 rounded-xl shadow-sm text-sm font-semibold hover:border-teal-200 transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Profile</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Health Score Circle */}
      <motion.div
        className="flex justify-center mt-6 mb-8"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative w-40 h-40 md:w-48 md:h-48 group">
          {isScoreAvailable ? (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />

              <svg
                className="w-full h-full -rotate-90 overflow-visible"
                viewBox="0 0 192 192"
              >
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  className="text-muted/30"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke={healthColor}
                  className={currentScore > 80 ? "text-primary" : ""}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-foreground">{currentScore}</span>
                <span className="text-muted-foreground text-xs md:text-sm mt-1 font-medium">{healthLabel}</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-full shadow-inner border-4 border-muted/30">
              <span className="text-muted-foreground text-sm text-center px-4 font-medium">Health Score<br />Not Available</span>
            </div>
          )}
        </div>
      </motion.div>
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <QuickStatCard
          icon={<Pill className="w-5 h-5" />}
          label="Active Meds"
          value={activeMedsCount}
          variant="default"
        />
        <QuickStatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Conditions"
          value={activeConditions.length}
          variant={activeConditions.length > 0 ? "warning" : "success"}
        />
        <QuickStatCard
          icon={<Heart className="w-5 h-5" />}
          label="Allergies"
          value={healthData?.allergies?.length || 0}
          variant="danger"
        />
        <QuickStatCard
          icon={<FileText className="w-5 h-5" />}
          label="Reports"
          value={healthData?.reports?.length || 0}
          variant="info"
        />
      </div>

      {/* Quick Actions */}
      <SectionTitle title="Quick Actions" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Link href="/dashboard/chat">
          <ActionCard icon={<Stethoscope className="w-6 h-6" />} label="AI Assistant" />
        </Link>
        <Link href="/dashboard/appointments">
          <ActionCard icon={<Calendar className="w-6 h-6" />} label="Appointments" />
        </Link>
        <div onClick={() => setShowUploadModal(true)}>
          <ActionCard icon={<Upload className="w-6 h-6" />} label="Upload Report" />
        </div>
        <Link href="/dashboard/reminders">
          <ActionCard icon={<Pill className="w-6 h-6" />} label="Reminders" />
        </Link>
      </div>

      {/* Vitals Snapshot */}
      <SectionTitle title="Vitals Snapshot" />
      {Object.values(latestVitals.values || {}).every(v => v === "--") ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center border border-dashed border-border mb-6">
          <Activity className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-muted-foreground font-medium">No Vitals Recorded</h3>
          <p className="text-muted-foreground/70 text-sm mt-1">Your vitals will appear here once recorded by your doctor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <VitalCard
            label="Heart Rate"
            value={latestVitals.values?.heartRate !== "--" ? `${latestVitals.values?.heartRate} BPM` : "--"}
            timestamp={latestVitals.records?.heartRate?.timestamp}
            icon={<Heart className="w-4 h-4 text-rose-500" />}
          />
          <VitalCard
            label="BP"
            value={latestVitals.values?.systolic !== "--" ? `${latestVitals.values?.systolic}/${latestVitals.values?.diastolic}` : "--"}
            timestamp={latestVitals.records?.systolic?.timestamp}
            icon={<Activity className="w-4 h-4 text-blue-500" />}
          />
          <VitalCard
            label="SpO2"
            value={latestVitals.values?.spo2 !== "--" ? `${latestVitals.values?.spo2}%` : "--"}
            timestamp={latestVitals.records?.spo2?.timestamp}
            icon={<Activity className="w-4 h-4 text-primary" />}
          />
          <VitalCard
            label="Weight"
            value={latestVitals.values?.weight !== "--" ? `${latestVitals.values?.weight} Kg` : "--"}
            icon={<User className="w-4 h-4 text-emerald-500" />}
          />
        </div>
      )}

      {/* Medication Adherence - Fixed Bar Rendering */}
      <SectionTitle title="Medication Adherence (Last 7 Days)" />
      {activeMedsCount > 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* Summary */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="text-sm">
              <span className="text-gray-500">Today: </span>
              <span className="font-semibold text-gray-900">
                {adherenceData[6]?.count || 0}/{adherenceData[6]?.total || 0} taken
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-teal-500"></span>
                <span className="text-gray-500">Taken</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200"></span>
                <span className="text-gray-500">Pending</span>
              </span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex justify-between items-end h-28 md:h-36 gap-1 md:gap-2">
            {adherenceData.map((day, i) => {
              const isToday = i === 6;
              const percentage = day.total > 0 ? (day.count / day.total) * 100 : 0;

              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  {/* Hover tooltip */}
                  <span className="text-[10px] md:text-xs text-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.count}/{day.total}
                  </span>

                  {/* Bar container */}
                  <div className={`w-full flex items-end justify-center h-full ${isToday ? 'px-0.5' : ''}`}>
                    <motion.div
                      initial={{ height: 8 }}
                      animate={{ height: day.total > 0 ? `${Math.max(percentage, 15)}%` : '8px' }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`w-full max-w-[20px] md:max-w-[32px] rounded-t-md transition-all duration-300 ${day.count > 0
                        ? isToday
                          ? 'bg-teal-500 shadow-lg shadow-teal-500/30'
                          : 'bg-teal-400 hover:bg-teal-500'
                        : 'bg-gray-200'
                        } ${isToday ? 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white' : ''}`}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[10px] md:text-xs uppercase tracking-wide ${isToday ? 'text-teal-600 font-bold' : 'text-gray-500'}`}>
                    {isToday ? 'Today' : day.date.slice(0, 1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-500 border border-gray-100">
          <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No medications being tracked</p>
          <p className="text-xs mt-1 opacity-70">Your doctor can add medications to your profile</p>
        </div>
      )}

      {/* Active Conditions */}
      {activeConditions.length > 0 && (
        <>
          <SectionTitle title="Active Medical Conditions" />
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
            {activeConditions.map((condition) => (
              <div
                key={condition.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 transition-colors ${condition.severity === 'severe' || condition.severity === 'critical'
                  ? 'border-destructive/20 bg-destructive/5'
                  : 'border-border bg-muted/20 hover:bg-muted/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${condition.severity === 'severe' || condition.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">{condition.condition}</span>
                    {condition.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{condition.notes}</p>
                    )}
                  </div>
                </div>

                {condition.severity && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap self-start md:self-center ${condition.severity === 'severe' || condition.severity === 'critical'
                    ? 'bg-destructive/10 text-destructive'
                    : condition.severity === 'moderate'
                      ? 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    }`}>
                    {condition.severity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* My Medications with Dose Logging */}
      {activeMedsCount > 0 && (
        <>
          <SectionTitle title="My Medications" />
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
            {healthData?.medications?.filter(m => m.isActive).map((med) => {
              const todayStatus = getTodayLogStatus(med);
              const isLogged = isMedicationLoggedToday(med);

              return (
                <div
                  key={med.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">{med.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {med.dosage} • {med.frequency}
                          {med.instructions && ` • ${med.instructions}`}
                        </p>
                        {med.prescribedByName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Prescribed by Dr. {med.prescribedByName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Today's Status / Log Button */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {isLogged ? (
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${todayStatus === 'taken'
                          ? 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}>
                          {todayStatus === 'taken' ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {todayStatus === 'taken' ? 'Taken Today' : 'Skipped Today'}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => logMedicationDose(med.id, "taken")}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Taken
                          </button>
                          <button
                            onClick={() => logMedicationDose(med.id, "skipped")}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Known Allergies */}
      {(healthData?.allergies?.length || 0) > 0 && (
        <>
          <SectionTitle title="Known Allergies" />
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
            {healthData?.allergies?.map((allergy) => (
              <div
                key={allergy.id}
                className="p-4 rounded-xl border border-orange-200/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-900/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-foreground block">{allergy.allergen}</span>
                    {allergy.reaction && (
                      <p className="text-sm text-muted-foreground mt-0.5">{allergy.reaction}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${allergy.severity === 'life-threatening' || allergy.severity === 'severe'
                    ? 'bg-destructive/10 text-destructive'
                    : allergy.severity === 'moderate'
                      ? 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                    {allergy.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Medical Reports */}
      {(healthData?.reports?.length || 0) > 0 && (
        <>
          <SectionTitle title="Medical Reports" />
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
            {healthData?.reports?.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground block">{report.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(report.uploadedAt), "MMM d, yyyy")}
                        {report.uploadedByName && ` • by ${report.uploadedByName}`}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted mr-2 hidden sm:inline">
                      {report.type?.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => viewReport(report)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => downloadReport(report)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* AI Assistant CTA */}
      <Link href="/dashboard/chat">
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01, boxShadow: "0 10px 30px -10px var(--color-primary)" }}
          className="w-full mt-8 py-4 cursor-pointer font-bold bg-primary text-primary-foreground rounded-2xl shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
        >
          <Stethoscope className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span>Ask your health assistant anything</span>
          <span className="opacity-70 group-hover:translate-x-1 transition-transform">→</span>
        </motion.button>
      </Link>

      {/* Upload Report Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-5 border-b border-border pb-4">
                <h3 className="text-lg font-bold text-foreground">Upload Medical Report</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground ml-1">Report Name</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={e => setReportTitle(e.target.value)}
                    placeholder="e.g. Blood Test Results - Jan 2024"
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground ml-1">Report Type</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="lab_result">Lab Result</option>
                    <option value="prescription_pdf">Prescription</option>
                    <option value="imaging">Imaging/Scan</option>
                    <option value="discharge_summary">Discharge Summary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <p className="text-sm text-foreground font-medium">{reportFile ? "File selected ✓" : "Click to upload file"}</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={e => setReportFile(e.target.files?.[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  onClick={handleUploadReport}
                  disabled={uploading || !reportFile || !reportTitle}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all mt-4"
                >
                  {uploading ? "Uploading Securely..." : "Upload Report"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Preview Modal */}
      <AnimatePresence>
        {previewData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm"
            onClick={() => setPreviewData(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-border overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">{previewData.title || "Report Preview"}</h3>
                <button
                  onClick={() => setPreviewData(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
                {previewData.type === 'image' ? (
                  <img
                    src={previewData.url}
                    alt={previewData.title || "Report"}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                ) : previewData.format === 'pdf' ? (
                  <iframe
                    src={previewData.url}
                    className="w-full h-[70vh] rounded-lg border border-border"
                    title={previewData.title || "PDF Preview"}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">This file format cannot be previewed directly.</p>
                    <a
                      href={previewData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download to View
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------
   HELPER FUNCTIONS
------------------------------------------- */
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

/* -------------------------------------------
   SUB-COMPONENTS
   ------------------------------------------- */
function QuickStatCard({
  icon,
  label,
  value,
  variant = 'default'
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    default: "bg-teal-50 text-teal-600 border-teal-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-orange-50 text-orange-600 border-orange-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    info: "bg-cyan-50 text-cyan-600 border-cyan-100",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-5 rounded-2xl border ${styles[variant]} transition-all`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
          {icon}
        </div>
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </div>
      <p className="text-sm font-medium opacity-80">{label}</p>
    </motion.div>
  );
}

function ActionCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02, borderColor: "#0d9488" }}
      whileTap={{ scale: 0.98 }}
      className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md cursor-pointer flex flex-col items-center justify-center gap-3 text-center min-h-[120px] group transition-all"
    >
      <div className="text-teal-600 p-3 rounded-full bg-teal-50 group-hover:bg-teal-100 transition-colors">{icon}</div>
      <span className="text-gray-900 font-semibold text-xs md:text-sm">{label}</span>
    </motion.div>
  );
}

function VitalCard({
  label,
  value,
  timestamp,
  icon,
}: {
  label: string;
  value: string;
  timestamp?: number;
  icon?: React.ReactNode;
}) {
  const hasData = value !== "--";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-teal-200 flex flex-col items-center justify-center text-center group"
    >
      {icon && <div className="mb-2 p-2.5 bg-gray-50 rounded-full group-hover:scale-110 transition-transform">{icon}</div>}
      <span className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-lg md:text-xl font-bold text-gray-900 mt-1.5">{value}</span>
      <span className={`text-[10px] md:text-xs mt-1.5 px-2 py-0.5 rounded-full font-medium ${!hasData ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-teal-700'}`}>
        {hasData && timestamp ? format(new Date(timestamp), "MMM d, h:mm a") : hasData ? "Recorded" : "No Data"}
      </span>
    </motion.div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-base md:text-lg font-bold text-gray-900 mt-6 mb-4 tracking-tight flex items-center gap-2 before:content-[''] before:w-1 before:h-5 before:bg-teal-500 before:rounded-full before:block">
      {title}
    </h2>
  );
}
