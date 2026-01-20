import { BaseUser, ContactInfo, Report } from "./common";

// ==================== VITALS (Time-series for Graphs) ====================
export type VitalType = "heartRate" | "systolic" | "diastolic" | "weight" | "sugar" | "spo2" | "temperature" | string;

export interface VitalRecord {
  id?: string;
  type: VitalType;
  value: number;
  unit: string;
  timestamp: number;
  recordedBy?: string;           // Doctor UID who recorded it
  notes?: string;
}

// ==================== MEDICATIONS (Doctor-managed) ====================
export interface Medication {
  id: string;
  name: string;
  dosage: string;               // e.g. "500mg"
  frequency: string;            // e.g. "Twice Daily", "Every 8 hours"
  startDate: string;            // YYYY-MM-DD
  endDate?: string;             // Optional (ongoing if not set)
  isActive: boolean;
  instructions?: string;        // "Take after food"
  prescribedBy?: string;        // Doctor UID
  prescribedByName?: string;    // Doctor display name
  reminderConfig?: {
    enabled: boolean;
    times: string[];            // ["08:00", "20:00"] (24h format)
  };
  adherenceLog?: MedicationAdherenceLog[];
}

export interface MedicationAdherenceLog {
  date: string;                 // YYYY-MM-DD
  time: string;                 // HH:mm
  status: "taken" | "skipped" | "missed";
}

// ==================== MEDICAL CONDITIONS (Doctor-managed) ====================
export type ConditionStatus = "active" | "cured" | "managed";
export type ConditionSeverity = "mild" | "moderate" | "severe" | "critical";

export interface MedicalCondition {
  id: string;
  condition: string;
  diagnosedDate?: string;
  status: ConditionStatus;
  severity?: ConditionSeverity;
  notes?: string;
  addedBy?: string;             // Doctor UID
}

// ==================== ALLERGIES (Doctor-managed) ====================
export type AllergySeverity = "mild" | "moderate" | "severe" | "life-threatening";

export interface Allergy {
  id: string;
  allergen: string;             // e.g. "Penicillin", "Peanuts"
  reaction?: string;            // e.g. "Skin rash", "Anaphylaxis"
  severity: AllergySeverity;
  notes?: string;
  addedBy?: string;             // Doctor UID
}

// ==================== HEALTH SCORE ====================
export type HealthTrend = "up" | "down" | "stable";

export interface HealthScoreRecord {
  score: number;                // 0-100
  trend: HealthTrend;
  timestamp?: number;
  date?: string;                // ISO String date
  factors?: string[];           // ["High BP", "Good Activity", "Missed Meds"]
  contributingFactors?: string[]; // Deprecated, use factors
}

// ==================== PATIENT PROFILE (User-editable) ====================
export interface PatientProfile {
  firstName: string;
  lastName: string;
  dob: string;                  // Date of birth
  gender: string;
  bloodType?: string;           // Added for patient profile
  contact: ContactInfo;
}

// ==================== PATIENT HEALTH DATA (Doctor-managed, Privacy-separated) ====================
export interface PatientHealthData {
  // ID for list operations
  id?: string;

  // Basic patient info (can be synced from user profile)
  name?: string;
  dob?: string;
  gender?: string;

  // Physical stats
  height_cm?: number | string;
  weight_kg?: number | string;
  bloodType?: string;

  // Doctor-managed medical data
  allergies?: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];

  // Time-series vital records (grouped by type)
  // e.g. { "heartRate": [{value: 72, timestamp: ...}], "systolic": [...] }
  vitalsHistory: Record<VitalType, VitalRecord[]>;

  // Health score tracking
  healthScoreHistory: HealthScoreRecord[];

  // Doctor-uploaded documents
  reports?: Report[];

  // Assigned doctors who can view/edit this patient
  assignedDoctors?: Record<string, boolean>;
}

// ==================== PATIENT USER (Auth-linked) ====================
export interface PatientUser extends BaseUser {
  role: "patient";
  profile: PatientProfile;
  patientDataId: string;        // The Unique 8-char ID connecting to /patients node
}
