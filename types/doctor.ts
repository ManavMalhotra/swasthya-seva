import { BaseUser, ContactInfo } from "./common";

// ==================== DOCTOR PROFILE ====================
export interface DoctorProfile {
    firstName: string;
    lastName: string;
    specialization: string;
    gender: string;
    dob: string;
    contact: ContactInfo;
    qualifications?: string[];   // ["MBBS", "MD Cardiology"]
    experience?: number;         // Years of experience
    metrics?: {
        height?: string;
        weight?: string;
    };
}

// ==================== DOCTOR USER (Auth-linked) ====================
export interface DoctorUser extends BaseUser {
    role: "doctor";
    profile: DoctorProfile;
    // Map of patientDataId -> true for O(1) lookup
    // Only these patients are visible to this doctor
    assignedPatients: Record<string, boolean>;
}

// ==================== PUBLIC DOCTOR RECORD (for patient search) ====================
export interface PublicDoctorRecord {
    uid: string;
    displayName: string;
    specialization: string;
    contact?: {
        phone?: string;
        address?: {
            city?: string;
            state?: string;
        };
    };
}
