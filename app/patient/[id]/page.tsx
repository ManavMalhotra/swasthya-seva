"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ref, get, set, push } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { cleanForFirebase } from "@/lib/firebaseUtils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Loader2, Trash2, Edit2, Plus, ArrowLeft, Heart, Activity,
  Pill, AlertTriangle, FileText, X, Thermometer, Upload, Download, Eye
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  PatientHealthData,
  Medication,
  MedicalCondition,
  Allergy,
  VitalRecord,
  HealthScoreRecord,
  Report
} from "@/types";

import { calculateHealthScore } from "@/lib/healthScore";

type Patient = PatientHealthData & { id: string };

// Helper to save new score
const updateHealthScore = async (id: string, currentData: PatientHealthData) => {
  const result = calculateHealthScore(currentData);
  const record: HealthScoreRecord = {
    score: result.score,
    trend: result.trend,
    factors: result.factors,
    date: new Date().toISOString()
  };

  // Get existing history to append
  const history = currentData.healthScoreHistory || [];
  const updatedHistory = [...history, record];

  await set(ref(db, `patients/${id}/healthScoreHistory`), cleanForFirebase(updatedHistory));
  return updatedHistory;
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id; // Fix ID type
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Patient info edit modal state
  const [showPatientInfoModal, setShowPatientInfoModal] = useState(false);
  const [patientInfoForm, setPatientInfoForm] = useState({
    dob: "",
    gender: "",
    bloodType: "",
    height_cm: "",
    weight_kg: ""
  });

  // Modal state
  const [activeModal, setActiveModal] = useState<"vital" | "medication" | "condition" | "allergy" | "report" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  /* State for file preview */
  const [previewData, setPreviewData] = useState<{ url: string; type: string; format?: string } | null>(null);

  // Quick Add Forms (all in one object for cleaner state)
  const [quickVital, setQuickVital] = useState({ type: "heartRate", value: "", unit: "BPM" });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "Once Daily", instructions: "", isActive: true });
  const [condForm, setCondForm] = useState<{ condition: string; status: "active" | "cured" | "managed"; severity: "mild" | "moderate" | "severe" | "critical"; notes: string }>({ condition: "", status: "active", severity: "moderate", notes: "" });
  const [allergyForm, setAllergyForm] = useState<{ allergen: string; reaction: string; severity: "mild" | "moderate" | "severe" | "life-threatening" }>({ allergen: "", reaction: "", severity: "moderate" });
  const [reportForm, setReportForm] = useState({ title: "", type: "prescription_pdf" as const, file: null as File | null });

  const isDoctor = user?.role === "doctor";
  const isPatient = user?.role === "patient";

  // Fetch patient and enrich with user profile data
  useEffect(() => {
    if (!patientId) { setLoading(false); return; }

    (async () => {
      try {
        const snap = await get(ref(db, `patients/${patientId}`));
        if (snap.exists()) {
          const data = snap.val();

          // Fetch user profile data to enrich patient info
          let enrichedData = {
            name: data.name,
            dob: data.dob,
            gender: data.gender,
            bloodType: data.bloodType,
          };

          const usersSnap = await get(ref(db, "users"));
          if (usersSnap.exists()) {
            const users = Object.values(usersSnap.val()) as any[];
            const foundUser = users.find(u => u.patientDataId === patientId);
            if (foundUser) {
              // Get name from user profile
              if (!enrichedData.name) {
                const firstName = foundUser.profile?.firstName || "";
                const lastName = foundUser.profile?.lastName || "";
                enrichedData.name = `${firstName} ${lastName}`.trim() || foundUser.displayName || "Unknown";
              }
              // Get DOB, Gender, Blood Type from user profile if not in patient data
              if (!enrichedData.dob && foundUser.profile?.dob) {
                enrichedData.dob = foundUser.profile.dob;
              }
              if (!enrichedData.gender && foundUser.profile?.gender) {
                enrichedData.gender = foundUser.profile.gender;
              }
              if (!enrichedData.bloodType && foundUser.profile?.bloodType) {
                enrichedData.bloodType = foundUser.profile.bloodType;
              }
            }
          }

          setPatient({
            id: patientId,
            ...data,
            name: enrichedData.name,
            dob: enrichedData.dob,
            gender: enrichedData.gender,
            bloodType: enrichedData.bloodType,
            conditions: data.conditions || [],
            medications: data.medications || [],
            allergies: data.allergies || [],
            vitalsHistory: data.vitalsHistory || {},
            healthScoreHistory: data.healthScoreHistory || [],
            reports: data.reports || [],
          });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [patientId]);

  const healthScore = useMemo(() => patient ? calculateHealthScore(patient) : null, [patient]);

  // Redirect patients to dashboard - this page is doctor-only
  useEffect(() => {
    if (!loading && isPatient) {
      router.push('/dashboard');
    }
  }, [loading, isPatient, router]);

  // ============ DOCTOR ACTIONS ============

  const addVital = async () => {
    if (!patientId || !quickVital.value || !isDoctor) return;
    const numVal = parseFloat(quickVital.value);
    if (isNaN(numVal)) return alert("Enter a valid number");

    // Validation Ranges (Standard Medical Ranges)
    const ranges: Record<string, { min: number; max: number; label: string }> = {
      heartRate: { min: 30, max: 220, label: "Heart Rate (30-220 BPM)" },
      systolic: { min: 60, max: 250, label: "Systolic BP (60-250 mmHg)" },
      diastolic: { min: 30, max: 150, label: "Diastolic BP (30-150 mmHg)" },
      spo2: { min: 50, max: 100, label: "SpO2 (50-100%)" },
      temperature: { min: 90, max: 110, label: "Temperature (90-110°F)" },
      respiratoryRate: { min: 8, max: 60, label: "Respiratory Rate (8-60 bpm)" },
      weight: { min: 1, max: 500, label: "Weight (1-500 kg)" }
    };

    const range = ranges[quickVital.type];
    if (range) {
      if (numVal < range.min || numVal > range.max) {
        alert(`Invalid value for ${range.label}. Please enter a value between ${range.min} and ${range.max}.`);
        return;
      }
    }

    const record: VitalRecord = { type: quickVital.type, value: numVal, unit: quickVital.unit, timestamp: Date.now(), recordedBy: user?.uid };
    const history = [...(patient?.vitalsHistory[quickVital.type] || []), record];
    await set(ref(db, `patients/${patientId}/vitalsHistory/${quickVital.type}`), cleanForFirebase(history));

    // Update local state first to calculate new score
    const updatedPatient = patient ? { ...patient, vitalsHistory: { ...patient.vitalsHistory, [quickVital.type]: history } } : null;
    if (updatedPatient) {
      const newHistory = await updateHealthScore(patientId, updatedPatient);
      setPatient({ ...updatedPatient, healthScoreHistory: newHistory });
    } else {
      setPatient(updatedPatient);
    }

    setQuickVital({ type: "heartRate", value: "", unit: "BPM" });
    setActiveModal(null);
  };

  const saveMedication = async () => {
    if (!patientId || !medForm.name || !isDoctor) return;
    const newMed: Medication = {
      id: editingId || push(ref(db, `p`)).key!,
      name: medForm.name, dosage: medForm.dosage, frequency: medForm.frequency,
      instructions: medForm.instructions, startDate: new Date().toISOString().slice(0, 10),
      isActive: medForm.isActive, prescribedBy: user?.uid, prescribedByName: user?.displayName || "Doctor", adherenceLog: []
    };
    const meds = editingId
      ? (patient?.medications || []).map(m => m.id === editingId ? newMed : m)
      : [...(patient?.medications || []), newMed];
    await set(ref(db, `patients/${patientId}/medications`), cleanForFirebase(meds));

    const updatedPatient = patient ? { ...patient, medications: meds } : null;
    if (updatedPatient) {
      const newHistory = await updateHealthScore(patientId, updatedPatient);
      setPatient({ ...updatedPatient, healthScoreHistory: newHistory });
    } else {
      setPatient(updatedPatient);
    }
    setMedForm({ name: "", dosage: "", frequency: "Once Daily", instructions: "", isActive: true });
    setEditingId(null); setActiveModal(null);
  };

  const saveCondition = async () => {
    if (!patientId || !condForm.condition || !isDoctor) return;
    const newCond: MedicalCondition = {
      id: editingId || push(ref(db, `p`)).key!,
      condition: condForm.condition, status: condForm.status, severity: condForm.severity,
      notes: condForm.notes, addedBy: user?.uid
    };
    const conds = editingId
      ? (patient?.conditions || []).map(c => c.id === editingId ? newCond : c)
      : [...(patient?.conditions || []), newCond];
    await set(ref(db, `patients/${patientId}/conditions`), cleanForFirebase(conds));

    const updatedPatient = patient ? { ...patient, conditions: conds } : null;
    if (updatedPatient) {
      const newHistory = await updateHealthScore(patientId, updatedPatient);
      setPatient({ ...updatedPatient, healthScoreHistory: newHistory });
    } else {
      setPatient(updatedPatient);
    }
    setCondForm({ condition: "", status: "active", severity: "moderate", notes: "" });
    setEditingId(null); setActiveModal(null);
  };

  const saveAllergy = async () => {
    if (!patientId || !allergyForm.allergen || !isDoctor) return;
    const newAllergy: Allergy = {
      id: editingId || push(ref(db, `p`)).key!,
      allergen: allergyForm.allergen, reaction: allergyForm.reaction, severity: allergyForm.severity, addedBy: user?.uid
    };
    const allergies = editingId
      ? (patient?.allergies || []).map(a => a.id === editingId ? newAllergy : a)
      : [...(patient?.allergies || []), newAllergy];
    await set(ref(db, `patients/${patientId}/allergies`), cleanForFirebase(allergies));

    const updatedPatient = patient ? { ...patient, allergies: allergies } : null;
    if (updatedPatient) {
      const newHistory = await updateHealthScore(patientId, updatedPatient);
      setPatient({ ...updatedPatient, healthScoreHistory: newHistory });
    } else {
      setPatient(updatedPatient);
    }
    setAllergyForm({ allergen: "", reaction: "", severity: "moderate" });
    setEditingId(null); setActiveModal(null);
  };

  const deleteItem = async (type: "medications" | "conditions" | "allergies", itemId: string) => {
    if (!patientId || !isDoctor || !confirm("Delete this item?")) return;
    const updated = (patient?.[type] || []).filter((item: any) => item.id !== itemId);
    await set(ref(db, `patients/${patientId}/${type}`), cleanForFirebase(updated));
    const updatedPatient = patient ? { ...patient, [type]: updated } : null;
    if (updatedPatient) {
      const newHistory = await updateHealthScore(patientId, updatedPatient);
      setPatient({ ...updatedPatient, healthScoreHistory: newHistory });
    } else {
      setPatient(updatedPatient);
    }
  };

  // ============ SAVE PATIENT INFO (Doctor only) ============
  const openPatientInfoModal = () => {
    if (!patient) return;
    setPatientInfoForm({
      dob: patient.dob || "",
      gender: patient.gender || "",
      bloodType: patient.bloodType || "",
      height_cm: String(patient.height_cm || ""),
      weight_kg: String(patient.weight_kg || "")
    });
    setShowPatientInfoModal(true);
  };

  const savePatientInfo = async () => {
    if (!patientId || !isDoctor) return;

    try {
      // Update patient data in Firebase
      const updates: Record<string, any> = {};
      if (patientInfoForm.dob) updates.dob = patientInfoForm.dob;
      if (patientInfoForm.gender) updates.gender = patientInfoForm.gender;
      if (patientInfoForm.bloodType) updates.bloodType = patientInfoForm.bloodType;
      if (patientInfoForm.height_cm) updates.height_cm = patientInfoForm.height_cm;
      if (patientInfoForm.weight_kg) updates.weight_kg = patientInfoForm.weight_kg;

      // Save each field to the patient node
      for (const [key, value] of Object.entries(updates)) {
        await set(ref(db, `patients/${patientId}/${key}`), value);
      }

      // Update local state
      setPatient(p => p ? {
        ...p,
        dob: patientInfoForm.dob || p.dob,
        gender: patientInfoForm.gender || p.gender,
        bloodType: patientInfoForm.bloodType || p.bloodType,
        height_cm: patientInfoForm.height_cm || p.height_cm,
        weight_kg: patientInfoForm.weight_kg || p.weight_kg
      } : p);

      setShowPatientInfoModal(false);
    } catch (err) {
      console.error("Failed to save patient info:", err);
      alert("Failed to save patient information");
    }
  };

  // ============ REPORT UPLOAD (Both patient & doctor) ============

  const uploadReport = async () => {
    if (!patientId || !reportForm.title || !reportForm.file) return;
    setUploading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('file', reportForm.file);
      formData.append('patientId', patientId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const responseJson = await res.json();

      if (!responseJson.success) throw new Error(responseJson.error);

      // CRITICAL FIX: The backend returns details inside a 'data' object
      // We must save resourceType and version to Firebase to retrieve the file later.
      const uploadData = responseJson.data;

      const report: Report = {
        id: push(ref(db, `p`)).key!,
        title: reportForm.title,
        type: reportForm.type,
        // Save all Cloudinary metadata needed for retrieval
        cloudinaryPublicId: uploadData.publicId,
        resourceType: uploadData.resourceType, // e.g., 'raw' or 'image'
        version: uploadData.version,           // e.g., 1234567890
        format: uploadData.format,             // e.g., 'pdf' or 'jpg'
        uploadedBy: user?.uid || "",
        uploadedByName: user?.displayName || "User",
        uploadedAt: Date.now()
      };

      const reports = [...(patient?.reports || []), report];
      await set(ref(db, `patients/${patientId}/reports`), cleanForFirebase(reports));

      setPatient(p => p ? { ...p, reports } : p);
      setReportForm({ title: "", type: "prescription_pdf", file: null });
      setActiveModal(null);
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  // Helper to get auth token for API calls
  const getAuthToken = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  };

  // Fetch signed URL and open for viewing
  // Update the viewReport function with better error handling and debugging
  const viewReport = async (report: Report) => {
    // Legacy support for direct URLs
    if (report.fileUrl) {
      setPreviewData({ url: report.fileUrl, type: 'image' });
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
      const token = await getAuthToken();

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
        // Determine the correct type for preview
        const isImage = report.resourceType === 'image' ||
          ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(report.format?.toLowerCase() || '');

        const isPdf = report.format?.toLowerCase() === 'pdf' ||
          report.cloudinaryPublicId?.toLowerCase().endsWith('.pdf');

        setPreviewData({
          url: data.url,
          type: isImage ? 'image' : 'raw',
          format: isPdf ? 'pdf' : report.format
        });
      } else {
        console.error('[ViewReport] Failed:', data.error);
        alert(data.error || "Failed to load file");
      }
    } catch (err: any) {
      console.error('[ViewReport] Error:', err);
      alert(err.message || "Failed to load file");
    }
  };

  // Fetch signed URL and trigger download
  const downloadReport = async (report: Report) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
      return;
    }

    if (!report.cloudinaryPublicId) return;

    try {
      const token = await getAuthToken();

      const payload = {
        publicId: report.cloudinaryPublicId,
        resourceType: report.resourceType,
        version: report.version,
        patientId
      };

      const res = await fetch('/api/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        window.open(data.url, '_blank');
      } else {
        alert("Could not generate download link");
      }
    } catch {
      console.error('Download failed');
    }
  };
  // Edit handlers (doctor only)
  const editMed = (m: Medication) => { setMedForm({ name: m.name, dosage: m.dosage, frequency: m.frequency, instructions: m.instructions || "", isActive: m.isActive }); setEditingId(m.id); setActiveModal("medication"); };
  const editCond = (c: MedicalCondition) => { setCondForm({ condition: c.condition, status: c.status, severity: c.severity || "moderate", notes: c.notes || "" }); setEditingId(c.id); setActiveModal("condition"); };
  const editAllergy = (a: Allergy) => { setAllergyForm({ allergen: a.allergen, reaction: a.reaction || "", severity: a.severity }); setEditingId(a.id); setActiveModal("allergy"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!patient) return <div className="min-h-screen flex items-center justify-center bg-background text-destructive">Patient not found</div>;

  const getVital = (t: string) => patient.vitalsHistory[t]?.[patient.vitalsHistory[t].length - 1];
  const hr = getVital("heartRate"), bp = getVital("systolic"), bpd = getVital("diastolic"), spo2 = getVital("spo2");

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{patient.name || "Patient"}</h1>
          <p className="text-sm text-muted-foreground">ID: {patient.id}</p>
        </div>
        {/* Quick Actions - Doctor Only */}
        {isDoctor && (
          <div className="flex gap-2">
            <QuickBtn icon={<Heart className="w-4 h-4" />} label="Vital" onClick={() => setActiveModal("vital")} />
            <QuickBtn icon={<Pill className="w-4 h-4" />} label="Med" onClick={() => { setMedForm({ name: "", dosage: "", frequency: "Once Daily", instructions: "", isActive: true }); setEditingId(null); setActiveModal("medication"); }} />
            <QuickBtn icon={<AlertTriangle className="w-4 h-4" />} label="Condition" onClick={() => { setCondForm({ condition: "", status: "active", severity: "moderate", notes: "" }); setEditingId(null); setActiveModal("condition"); }} />
          </div>
        )}
        {/* Upload Report - Both */}
        <button onClick={() => setActiveModal("report")} className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm">
          <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Info + Score */}
        <div className="lg:col-span-3 space-y-4">
          <Card title="Patient Info" action={isDoctor && <EditBtn onClick={openPatientInfoModal} />}>
            <InfoRow label="DOB" value={patient.dob ? format(new Date(patient.dob), "MMM d, yyyy") : "-"} />
            <InfoRow label="Gender" value={patient.gender || "-"} />
            <InfoRow label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : "-"} />
            <InfoRow label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : "-"} />
            <InfoRow label="Blood Type" value={patient.bloodType || "-"} />
          </Card>

          {healthScore && (
            <Card title="Health Score">
              <div className="text-center py-2">
                <span className={`text-4xl font-bold ${healthScore.score >= 70 ? "text-emerald-500" : healthScore.score >= 50 ? "text-yellow-500" : "text-destructive"}`}>{healthScore.score}</span>
                <span className="text-muted-foreground ml-1">/100</span>
              </div>
              <div className="mt-3 space-y-1">
                {healthScore.factors.slice(0, 3).map((f, i) => <p key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-primary mt-0.5">•</span>{f}</p>)}
              </div>
            </Card>
          )}
        </div>

        {/* MIDDLE: Vitals + Meds */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Recent Vitals" action={isDoctor && <AddBtn onClick={() => setActiveModal("vital")} />}>
            <div className="grid grid-cols-2 gap-3">
              <VitalBox icon={<Heart className="w-4 h-4 text-rose-500" />} label="Heart Rate" value={hr ? `${hr.value} BPM` : "--"} timestamp={hr?.timestamp} />
              <VitalBox icon={<Activity className="w-4 h-4 text-blue-500" />} label="Blood Pressure" value={bp && bpd ? `${bp.value}/${bpd.value}` : "--"} timestamp={bp?.timestamp} />
              <VitalBox icon={<Activity className="w-4 h-4 text-primary" />} label="SpO2" value={spo2 ? `${spo2.value}%` : "--"} timestamp={spo2?.timestamp} />
              <VitalBox icon={<Thermometer className="w-4 h-4 text-orange-500" />} label="Temperature" value={getVital("temperature") ? `${getVital("temperature")?.value}°F` : "--"} timestamp={getVital("temperature")?.timestamp} />
            </div>
          </Card>

          <Card title="Medications" action={isDoctor && <AddBtn onClick={() => { setMedForm({ name: "", dosage: "", frequency: "Once Daily", instructions: "", isActive: true }); setEditingId(null); setActiveModal("medication"); }} />}>
            {patient.medications.length === 0 ? <p className="text-muted-foreground text-sm italic p-2">No medications prescribed</p> : (
              <div className="space-y-2">
                {patient.medications.map(m => (
                  <div key={m.id} className={`p-3 rounded-lg border ${m.isActive ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'} flex justify-between items-start transition-colors`}>
                    <div>
                      <p className="font-medium text-sm text-foreground">{m.name} <span className="text-muted-foreground text-xs ml-1">{m.dosage}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.frequency} {m.instructions && `• ${m.instructions}`}</p>
                    </div>
                    {isDoctor && <div className="flex gap-1"><EditBtn onClick={() => editMed(m)} /><DelBtn onClick={() => deleteItem("medications", m.id)} /></div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Conditions + Allergies + Reports */}
        <div className="lg:col-span-4 space-y-4">
          <Card title="Diagnosed Conditions" action={isDoctor && <AddBtn onClick={() => { setCondForm({ condition: "", status: "active", severity: "moderate", notes: "" }); setEditingId(null); setActiveModal("condition"); }} />}>
            {patient.conditions.length === 0 ? <p className="text-muted-foreground text-sm italic p-2">No active conditions</p> : (
              <div className="space-y-2">
                {patient.conditions.map(c => (
                  <div key={c.id} className={`p-3 rounded-lg border text-sm ${c.severity === 'critical' || c.severity === 'severe' ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-card'} flex justify-between items-start`}>
                    <div>
                      <p className="font-medium text-foreground">{c.condition}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge color={c.status === 'active' ? 'yellow' : c.status === 'cured' ? 'green' : 'blue'}>{c.status}</Badge>
                        {c.severity && <Badge color={c.severity === 'critical' ? 'red' : c.severity === 'severe' ? 'orange' : 'gray'}>{c.severity}</Badge>}
                      </div>
                    </div>
                    {isDoctor && <div className="flex gap-1"><EditBtn onClick={() => editCond(c)} /><DelBtn onClick={() => deleteItem("conditions", c.id)} /></div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Allergies" action={isDoctor && <AddBtn onClick={() => { setAllergyForm({ allergen: "", reaction: "", severity: "moderate" }); setEditingId(null); setActiveModal("allergy"); }} />}>
            {(!patient.allergies || patient.allergies.length === 0) ? <p className="text-muted-foreground text-sm italic p-2">No known allergies</p> : (
              <div className="space-y-2">
                {patient.allergies.map(a => (
                  <div key={a.id} className="p-3 rounded-lg border border-orange-200/50 bg-orange-50/50 text-sm flex justify-between items-start">
                    <div>
                      <p className="font-medium flex items-center gap-1.5 text-foreground"><AlertTriangle className="w-3.5 h-3.5 text-orange-500" />{a.allergen}</p>
                      {a.reaction && <p className="text-xs text-muted-foreground mt-0.5">{a.reaction}</p>}
                    </div>
                    {isDoctor && <div className="flex gap-1"><EditBtn onClick={() => editAllergy(a)} /><DelBtn onClick={() => deleteItem("allergies", a.id)} /></div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Medical Reports" action={<AddBtn onClick={() => setActiveModal("report")} />}>
            {(!patient.reports || patient.reports.length === 0) ? <p className="text-muted-foreground text-sm italic p-2">No reports uploaded</p> : (
              <div className="space-y-2">
                {patient.reports.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/10 transition-all text-sm flex justify-between items-center group">
                    <div>
                      <p className="font-medium flex items-center gap-2 text-foreground">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate max-w-[120px]">{r.title}</span>
                      </p>
                      <p className="text-xs text-muted-foreground ml-5.5">{format(new Date(r.uploadedAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => viewReport(r)} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadReport(r)} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* FILE PREVIEW MODAL */}
      <AnimatePresence>
        {previewData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setPreviewData(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl border border-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">
                  {previewData.format === 'pdf' ? 'PDF Preview' : 'File Preview'}
                </h3>
                <div className="flex gap-2">
                  <a
                    href={previewData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-sm hover:bg-muted/80 flex items-center gap-1 transition-colors"
                  >
                    Open in New Tab
                  </a>
                  <a
                    href={previewData.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button
                    onClick={() => setPreviewData(null)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-muted/20">
                {previewData.type === 'image' ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={previewData.url}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('Image failed to load');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : previewData.format === 'pdf' ? (
                  <div className="w-full h-full relative">
                    {/* Primary: Object tag (better PDF support) */}
                    <object
                      data={previewData.url}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      {/* Fallback: iframe */}
                      <iframe
                        src={previewData.url}
                        className="w-full h-full border-0"
                        title="PDF Preview"
                      >
                        {/* Final fallback */}
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                          <p className="text-foreground font-medium mb-2">
                            Unable to display PDF in browser
                          </p>
                          <a
                            href={previewData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" /> Download PDF
                          </a>
                        </div>
                      </iframe>
                    </object>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-foreground font-medium mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Format: {previewData.format || 'Unknown'}
                    </p>
                    <a
                      href={previewData.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download to View
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODALS ============ */}
      <AnimatePresence>
        {activeModal && (
          <Modal onClose={() => { setActiveModal(null); setEditingId(null); }}>
            {activeModal === "vital" && (
              <ModalContent title="Add Vital Sign">
                <select value={quickVital.type} onChange={e => { const t = e.target.value; setQuickVital({ type: t, value: "", unit: { heartRate: "BPM", systolic: "mmHg", diastolic: "mmHg", spo2: "%", temperature: "°F", weight: "kg", sugar: "mg/dL" }[t] || "" }); }} className="w-full rounded-lg border border-border px-3 py-2 mb-3 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  <option value="heartRate">Heart Rate</option>
                  <option value="systolic">BP Systolic</option>
                  <option value="diastolic">BP Diastolic</option>
                  <option value="spo2">SpO2</option>
                  <option value="temperature">Temperature</option>
                  <option value="weight">Weight</option>
                  <option value="sugar">Blood Sugar</option>
                </select>
                <input type="number" value={quickVital.value} onChange={e => setQuickVital(v => ({ ...v, value: e.target.value }))} placeholder={`Value (${quickVital.unit})`} className="w-full rounded-lg border border-border px-3 py-2 mb-3 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                <button onClick={addVital} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">Save Vital</button>
              </ModalContent>
            )}

            {activeModal === "medication" && (
              <ModalContent title={editingId ? "Edit Medication" : "Prescribe Medication"}>
                <input value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} placeholder="Medication name" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} placeholder="Dosage (e.g. 500mg)" className="rounded-lg border border-border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                  <select value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))} className="rounded-lg border border-border px-3 py-2 bg-background outline-none">
                    <option>Once Daily</option><option>Twice Daily</option><option>Three Times</option><option>As Needed</option>
                  </select>
                </div>
                <input value={medForm.instructions} onChange={e => setMedForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Instructions (e.g. after meals)" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <label className="flex items-center gap-2 mb-4 text-sm text-foreground cursor-pointer select-none"><input type="checkbox" checked={medForm.isActive} onChange={e => setMedForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-border text-primary focus:ring-primary" />Is Active Treatment</label>
                <button onClick={saveMedication} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">{editingId ? "Update Prescription" : "Add Prescription"}</button>
              </ModalContent>
            )}

            {activeModal === "condition" && (
              <ModalContent title={editingId ? "Edit Condition" : "Log Condition"}>
                <input value={condForm.condition} onChange={e => setCondForm(f => ({ ...f, condition: e.target.value }))} placeholder="Condition name" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={condForm.status} onChange={e => setCondForm(f => ({ ...f, status: e.target.value as any }))} className="rounded-lg border border-border px-3 py-2 bg-background outline-none">
                    <option value="active">Active</option><option value="managed">Managed</option><option value="cured">Resolved</option>
                  </select>
                  <select value={condForm.severity} onChange={e => setCondForm(f => ({ ...f, severity: e.target.value as any }))} className="rounded-lg border border-border px-3 py-2 bg-background outline-none">
                    <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="critical">Critical</option>
                  </select>
                </div>
                <textarea value={condForm.notes} onChange={e => setCondForm(f => ({ ...f, notes: e.target.value }))} placeholder=" Clinical notes..." className="w-full rounded-lg border border-border px-3 py-2 mb-3 h-20 bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
                <button onClick={saveCondition} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">{editingId ? "Update Condition" : "Add Condition"}</button>
              </ModalContent>
            )}

            {activeModal === "allergy" && (
              <ModalContent title={editingId ? "Edit Allergy" : "Log Allergy"}>
                <input value={allergyForm.allergen} onChange={e => setAllergyForm(f => ({ ...f, allergen: e.target.value }))} placeholder="Allergen (e.g. Penicillin)" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <input value={allergyForm.reaction} onChange={e => setAllergyForm(f => ({ ...f, reaction: e.target.value }))} placeholder="Reaction (e.g. Skin rash)" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <select value={allergyForm.severity} onChange={e => setAllergyForm(f => ({ ...f, severity: e.target.value as any }))} className="w-full rounded-lg border border-border px-3 py-2 mb-4 bg-background outline-none">
                  <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="life-threatening">Life-Threatening</option>
                </select>
                <button onClick={saveAllergy} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">{editingId ? "Update Allergy" : "Add Allergy"}</button>
              </ModalContent>
            )}

            {activeModal === "report" && (
              <ModalContent title="Upload Medical Report">
                <input value={reportForm.title} onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))} placeholder="Report Name (e.g. Blood Test - Jan)" className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                <select value={reportForm.type} onChange={e => setReportForm(f => ({ ...f, type: e.target.value as any }))} className="w-full rounded-lg border border-border px-3 py-2 mb-2 bg-background outline-none">
                  <option value="prescription_pdf">Prescription</option>
                  <option value="lab_result">Lab Result</option>
                  <option value="imaging">Imaging/Scan</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="other">Other</option>
                </select>
                <div className="mb-4">
                  <input type="file" ref={fileInputRef} onChange={e => setReportForm(f => ({ ...f, file: e.target.files?.[0] || null }))} accept=".pdf,.jpg,.jpeg,.png" className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                </div>
                <button onClick={uploadReport} disabled={uploading || !reportForm.file} className="w-full py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 font-medium transition-colors">
                  {uploading ? "Uploading Securely..." : "Upload Report"}
                </button>
              </ModalContent>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* Patient Info Edit Modal */}
      <AnimatePresence>
        {showPatientInfoModal && (
          <Modal onClose={() => setShowPatientInfoModal(false)}>
            <ModalContent title="Edit Patient Info">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={patientInfoForm.dob}
                    onChange={e => setPatientInfoForm(f => ({ ...f, dob: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Gender</label>
                  <select
                    value={patientInfoForm.gender}
                    onChange={e => setPatientInfoForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 bg-background outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Blood Type</label>
                  <select
                    value={patientInfoForm.bloodType}
                    onChange={e => setPatientInfoForm(f => ({ ...f, bloodType: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 bg-background outline-none"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={patientInfoForm.height_cm}
                      onChange={e => setPatientInfoForm(f => ({ ...f, height_cm: e.target.value }))}
                      placeholder="e.g. 170"
                      className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={patientInfoForm.weight_kg}
                      onChange={e => setPatientInfoForm(f => ({ ...f, weight_kg: e.target.value }))}
                      placeholder="e.g. 65"
                      className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={savePatientInfo}
                className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
              >
                Save Patient Info
              </button>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------
   SUB-COMPONENTS
   -------------------------*/
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide opacity-80">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}


function VitalBox({ icon, label, value, timestamp }: { icon: React.ReactNode; label: string; value: string; timestamp?: number }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1.5">{icon}{label}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      {timestamp && (
        <div className="text-[10px] text-muted-foreground mt-1">
          {format(new Date(timestamp), "MMM d, h:mm a")}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm py-2 border-b border-border/40 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{value}</span></div>;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  // Map legacy color props to new semantic classes where possible, or keep specific utility colors for status
  const colors: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    gray: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary"
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${colors[color] || colors.gray}`}>{children}</span>;
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 shadow-sm transition-all active:scale-95">{icon}<span className="hidden sm:inline font-medium">{label}</span></button>;
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"><Plus className="w-4 h-4" /></button>;
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>;
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalContent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </>
  );
}
