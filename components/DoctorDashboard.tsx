"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ref, get, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  PatientHealthData,
  Medication,
  DoctorUser,
  MedicalCondition
} from "@/types";
import {
  Users,
  AlertTriangle,
  FileText,
  Calendar,
  Search,
  Plus,
  Activity,
  Pill,
  Heart,
  ChevronRight,
  Scan,
  Radio,
  X,
  Stethoscope
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------
   TypeScript Definitions for Web NFC
   -------------------------*/
interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      mediaType?: string;
      data?: DataView;
      encoding?: string;
      toRecords?: () => any[];
    }>;
  };
}

interface NDEFReader {
  scan: () => Promise<void>;
  onreading: (event: NDEFReadingEvent) => void;
  onreadingerror: (error: Event) => void;
}

declare global {
  interface Window {
    NDEFReader: {
      new(): NDEFReader;
    };
  }
}

interface DoctorDashboardProps {
  patients: PatientHealthData[];
  doctor: DoctorUser;
}

interface PatientWithId extends PatientHealthData {
  id: string;
}

/* -------------------------
   Helpers
   -------------------------*/
const calculateAgeFromDob = (dob?: string) => {
  if (!dob) return null;
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    return Math.floor(diff / (1000 * 3600 * 24 * 365.25));
  } catch {
    return null;
  }
};

const computeAdherence = (medications: Medication[] | undefined) => {
  if (!medications || medications.length === 0) return null;

  let total = 0;
  let taken = 0;
  const now = new Date();
  const days7Ago = new Date();
  days7Ago.setDate(days7Ago.getDate() - 7);

  medications.forEach(m => {
    (m.adherenceLog || []).forEach(log => {
      const d = new Date(log.date);
      if (d >= days7Ago && d <= now) {
        total++;
        if (log.status === 'taken') taken++;
      }
    });
  });

  if (total === 0) return null;
  return Math.round((taken / total) * 100);
};

const getCriticalPatients = (patients: PatientWithId[]) => {
  return patients.filter(p => {
    const hasCriticalCondition = p.conditions?.some(
      c => c.severity === 'severe' || c.severity === 'critical'
    );
    const adherence = computeAdherence(p.medications);
    const hasLowAdherence = adherence !== null && adherence < 50;
    return hasCriticalCondition || hasLowAdherence;
  });
};

/* -------------------------
   RFID Scanner Modal (Updated with Web NFC)
   -------------------------*/
function RFIDModal({
  open,
  onClose,
  onFound,
  rfidStatus,
  assignPatientToDoctor,
}: {
  open: boolean;
  onClose: () => void;
  onFound: (patientId: string) => void;
  rfidStatus: string;
  assignPatientToDoctor: (patientId: string) => Promise<void>;
}) {
  const [manualId, setManualId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [isNfcSupported, setIsNfcSupported] = useState(false);

  // Initialize Modal State & Web NFC
  useEffect(() => {
    if (open) {
      setManualId("");
      setMode("scan");
      setNfcError(null);

      // Check for Web NFC support (Chrome Android)
      if ("NDEFReader" in window) {
        setIsNfcSupported(true);
        startNfcScan();
      } else {
        setIsNfcSupported(false);
      }
    }
  }, [open]);

  // Unified logic to process an ID (from Manual Input, Ext Reader, or Phone NFC)
  const processScannedId = async (scannedId: string) => {
    // Normalization: Web NFC returns "04:A3:..." while DBs often store "04A3..."
    // We strip colons just in case to match DB formats generally used.
    const normalizedId = scannedId.replace(/:/g, "").trim();

    // Also keep the original just in case your DB uses colons
    const rawId = scannedId.trim();

    console.log("Processing ID:", normalizedId);
    setLoading(true);

    try {
      // 1. Try direct patient lookup (using normalized ID)
      let snap = await get(ref(db, `patients/${normalizedId}`));
      // If not found, try raw ID
      if (!snap.exists()) {
        snap = await get(ref(db, `patients/${rawId}`));
      }

      if (snap.exists()) {
        const patientId = snap.key || normalizedId;
        await assignPatientToDoctor(patientId);
        onFound(patientId);
        return;
      }

      // 2. Try searching users by UID/RFID/Email
      const usersSnap = await get(ref(db, "users"));
      if (usersSnap.exists()) {
        const users: Record<string, any> = usersSnap.val();

        const foundUser = Object.values(users).find(
          (u: any) =>
            u.uid === normalizedId ||
            u.uid === rawId ||
            u.email === rawId ||
            u.rfid === normalizedId || // Check sanitized hex
            u.rfid === rawId ||        // Check raw hex
            u.patientDataId === normalizedId
        );

        if (foundUser?.patientDataId) {
          await assignPatientToDoctor(foundUser.patientDataId);
          onFound(foundUser.patientDataId);
          return;
        }
      }

      // If we are in manual mode, show alert. If scanning, maybe just log it?
      // For now we show alert for feedback.
      Swal.fire({
        icon: "error",
        title: "Not found",
        text: "No patient found with this ID/Tag.",
        confirmButtonColor: "#0d9488",
        timer: 2000
      });

    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Database lookup failed.",
        confirmButtonColor: "#0d9488",
      });
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------------------------
     UPDATED: Mobile NFC Listener
     Now prioritizes written TEXT (NDEF) before falling back to Serial Number
     ----------------------------------------------------------- */
  const startNfcScan = async () => {
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: NDEFReadingEvent) => {
        // 1. Try to read WRITTEN TEXT first (e.g. "patient_123")
        const decoder = new TextDecoder();
        if (event.message && event.message.records.length > 0) {
          for (const record of event.message.records) {
            if (record.recordType === "text" && record.data) {
              const textContent = decoder.decode(record.data);
              console.log("Found Written ID:", textContent);
              processScannedId(textContent); // Use the written ID
              return; // Stop processing, we found the ID
            }
          }
        }

        // 2. Fallback: Use Serial Number if no text found
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          console.log("Found Serial Number:", serialNumber);
          processScannedId(serialNumber);
        }
      };

      ndef.onreadingerror = () => {
        setNfcError("Read failed. Please tap again.");
      };

    } catch (error) {
      console.log("NFC Permission denied or error: ", error);
      // Usually means user didn't grant permission or hardware unavailable
    }
  };

  // Listen for EXTERNAL RFID Reader (Firebase)
  useEffect(() => {
    if (!open || mode !== 'scan') return;

    // Clear last UID
    set(ref(db, "rfid/last_uid"), "").catch(console.error);

    const uidRef = ref(db, "rfid/last_uid");
    const unsubscribe = onValue(uidRef, (snap) => {
      const uidVal = snap.val();
      if (uidVal) {
        processScannedId(String(uidVal));
      }
    });

    return () => unsubscribe();
  }, [open, mode]);

  const tryManualSearch = async () => {
    if (!manualId.trim()) return;
    await processScannedId(manualId);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl border border-teal-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute right-4 top-4 p-1 text-gray-400 hover:text-teal-600 rounded-full hover:bg-teal-50 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-teal-50 rounded-xl">
              <Scan className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Add Patient</h3>
              <p className="text-sm text-gray-500">Scan Card or enter ID</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setMode("scan")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${mode === "scan"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Radio className="w-4 h-4 inline mr-2" />
              Scan
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${mode === "manual"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Manual
            </button>
          </div>

          {mode === "scan" ? (
            <div className="text-center py-8">
              <div className={`inline-flex p-8 rounded-full mb-6 transition-colors duration-500 ${rfidStatus === "on" || isNfcSupported ? "bg-teal-50" : "bg-red-50"
                }`}>
                <Radio className={`w-16 h-16 ${rfidStatus === "on" || isNfcSupported ? "text-teal-600 animate-pulse" : "text-red-400"
                  }`} />
              </div>
              <p className="font-semibold text-gray-900 mb-2">
                Status: {" "}
                <span className={rfidStatus === "on" || isNfcSupported ? "text-teal-600" : "text-red-500"}>
                  {rfidStatus === "on" || isNfcSupported ? "READY TO SCAN" : "OFFLINE"}
                </span>
              </p>

              <div className="text-sm text-gray-500 max-w-[280px] mx-auto space-y-2">
                {isNfcSupported && (
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold mb-2">
                    Mobile NFC Active
                  </span>
                )}
                <p>
                  {isNfcSupported
                    ? "Tap card against back of phone OR use external reader."
                    : "Please ensure the External RFID reader is connected"
                  }
                </p>
                {nfcError && <p className="text-red-500 text-xs font-medium">{nfcError}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Patient Identifier
                </label>
                <input
                  placeholder="ID, Email, or Phone"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-gray-400"
                  disabled={loading}
                  onKeyDown={(e) => e.key === "Enter" && tryManualSearch()}
                  autoFocus
                />
              </div>
              <button
                onClick={tryManualSearch}
                disabled={loading || !manualId.trim()}
                className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98]"
              >
                {loading ? "Searching Database..." : "Find Patient"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* -------------------------
   Main Dashboard Component
   -------------------------*/
export default function DoctorDashboard({ patients, doctor }: DoctorDashboardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [rfidStatus, setRfidStatus] = useState<string>("off");

  // Listen for External RFID status
  useEffect(() => {
    const statusRef = ref(db, "rfid/status");
    const unsubscribe = onValue(statusRef, (snap) => {
      const v = snap.val();
      setRfidStatus(v ? String(v) : "off");
    });
    return () => unsubscribe();
  }, []);

  // Assign patient to this doctor
  const assignPatientToDoctor = async (patientDataId: string) => {
    try {
      // Add to doctor's assignedPatients
      await set(
        ref(db, `users/${doctor.uid}/assignedPatients/${patientDataId}`),
        true
      );
      // Add doctor to patient's assignedDoctors
      await set(
        ref(db, `patients/${patientDataId}/assignedDoctors/${doctor.uid}`),
        true
      );
    } catch (err) {
      console.error("Failed to assign patient:", err);
    }
  };

  // Add IDs to patients
  const patientsArr: PatientWithId[] = useMemo(() => {
    return patients.map(p => ({
      ...p,
      id: p.id || "",
      conditions: p.conditions || [],
      medications: p.medications || [],
      reports: p.reports || [],
      vitalsHistory: p.vitalsHistory || {},
    }));
  }, [patients]);

  // Filter by search
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patientsArr;
    const q = searchQuery.toLowerCase();
    return patientsArr.filter(p => {
      const conditionsStr = p.conditions.map(c => c.condition).join(" ").toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        conditionsStr.includes(q)
      );
    });
  }, [patientsArr, searchQuery]);

  // Critical patients
  const criticalPatients = useMemo(() => getCriticalPatients(patientsArr), [patientsArr]);

  // Stats
  const totalReports = useMemo(() => {
    return patientsArr.reduce((sum, p) => sum + (p.reports?.length || 0), 0);
  }, [patientsArr]);

  const doctorName = doctor.profile?.firstName || doctor.displayName?.split(' ')[0] || "Doctor";

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border-2 border-teal-200">
              {doctorName.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, Dr. {doctorName}
            </h1>
          </div>
          <p className="text-gray-500 ml-1">
            You have <span className="font-semibold text-teal-600">{criticalPatients.length} critical</span> alerts today.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowScannerModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-600/20 text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Patient</span>
          </motion.button>

          <Link href="/dashboard/appointments" className="flex-1 sm:flex-none">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#f0fdfa" }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-teal-100 text-teal-700 rounded-xl shadow-sm text-sm font-semibold hover:border-teal-200 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>Schedule</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Patients"
          value={patientsArr.length}
          variant="teal"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Critical Cases"
          value={criticalPatients.length}
          variant={criticalPatients.length > 0 ? "red" : "green"}
        />
        {/* <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Medical Reports"
          value={totalReports}
          variant="blue"
        /> */}
        <StatCard
          icon={<Stethoscope className="w-6 h-6" />}
          label="Consultations"
          value={0}
          variant="indigo"
        />
      </div>

      {/* Critical Alerts */}
      <AnimatePresence>
        {criticalPatients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-red-100 bg-red-50/50 p-6"
          >
            <h3 className="text-red-800 font-bold flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" />
              Immediate Attention Required
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {criticalPatients.map(p => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between group"
                >
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">{p.name || "Unknown Patient"}</span>
                    <div className="flex flex-wrap gap-2">
                      {p.conditions
                        ?.filter(c => c.severity === 'severe' || c.severity === 'critical')
                        .map((c, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
                            {c.condition}
                          </span>
                        ))
                      }
                      {computeAdherence(p.medications)! < 50 && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                          Low Adherence
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/patient/${p.id}`}>
                    <button className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors">
                      Review
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Patient Registry</h3>
            <p className="text-sm text-gray-500">Manage records and statuses</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-1">No patients found</h4>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first patient using their Smart Health Card."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowScannerModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Patient
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-50">
              {filteredPatients.map(p => (
                <PatientCard key={p.id} patient={p} />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Patient Info</th>
                    <th className="px-6 py-4">Diagnosis</th>
                    <th className="px-6 py-4">Treatment</th>
                    <th className="px-6 py-4">Adherence</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPatients.map((p, idx) => {
                    const chronic = p.conditions.map(c => c.condition).join(", ") || "No conditions";
                    const adherence = computeAdherence(p.medications);
                    const activeMeds = p.medications.filter(m => m.isActive).length;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold">
                              {(p.name || "?").charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 block">{p.name || "Unknown"}</span>
                              <span className="text-xs text-gray-400 font-mono">{p.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium">{chronic}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${activeMeds > 0 ? "bg-teal-500" : "bg-gray-300"}`} />
                            <span className="text-sm text-gray-600">{activeMeds} Active Meds</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {adherence !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${adherence >= 80 ? 'bg-teal-500' : 'bg-red-500'}`}
                                  style={{ width: `${adherence}%` }}
                                />
                              </div>
                              <span className={`text-sm font-semibold ${adherence >= 80 ? 'text-teal-600' : 'text-red-500'}`}>
                                {adherence}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/patient/${p.id}`}>
                            <button className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline">
                              View Profile
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RFID Scanner Modal */}
      <RFIDModal
        open={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onFound={(pid) => {
          setShowScannerModal(false);
          Swal.fire({
            title: "Patient Found!",
            text: "Opening profile...",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
            confirmButtonColor: "#0d9488",
          });
          router.push(`/patient/${pid}`);
        }}
        rfidStatus={rfidStatus}
        assignPatientToDoctor={assignPatientToDoctor}
      />
    </div>
  );
}

/* -------------------------------------------
   SUB-COMPONENTS
------------------------------------------- */
function StatCard({
  icon,
  label,
  value,
  variant
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: "teal" | "red" | "green" | "blue" | "indigo";
}) {
  const styles = {
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-cyan-50 text-cyan-600 border-cyan-100",
    indigo: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-5 rounded-2xl border ${styles[variant]} transition-all`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm`}>
          {icon}
        </div>
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </div>
      <p className="text-sm font-medium opacity-80">{label}</p>
    </motion.div>
  );
}

function PatientCard({ patient }: { patient: PatientWithId }) {
  const adherence = computeAdherence(patient.medications);
  const activeMeds = patient.medications.filter(m => m.isActive).length;
  const hasCritical = patient.conditions?.some(
    c => c.severity === 'severe' || c.severity === 'critical'
  );

  return (
    <Link href={`/patient/${patient.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
            {(patient.name || "?").charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-gray-900 block">{patient.name || "Unknown"}</span>
            <span className="text-xs text-gray-500">ID: {patient.id}</span>
          </div>
        </div>
        {hasCritical && (
          <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Critical
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
          <span className="block text-xs text-gray-500 mb-1">Active Meds</span>
          <span className="font-semibold text-gray-900">{activeMeds}</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
          <span className="block text-xs text-gray-500 mb-1">Adherence</span>
          <span className={`font-semibold ${adherence && adherence >= 80 ? 'text-teal-600' : adherence ? 'text-red-500' : 'text-gray-400'}`}>
            {adherence ? `${adherence}%` : '-'}
          </span>
        </div>
      </div>
    </Link>
  );
}