import { Role } from "./enums";

// ==================== ADDRESS & CONTACT ====================
export interface Address {
    street?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
}

export interface ContactInfo {
    phone: string;
    email: string;
    address: Address;
    emergencyContact?: string;
}

// ==================== BASE USER ====================
export interface BaseUser {
    uid: string;
    email: string | null;
    displayName?: string | null;
    role: Role;
    photoURL?: string | null;
}

// ==================== APPOINTMENTS ====================
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type AppointmentMode = "online" | "in-person";

export interface Appointment {
    id: string;
    patientId: string;           // Firebase Auth UID of patient
    patientDataId: string;       // 8-char patient health record ID
    patientName: string;
    patientEmail: string;
    doctorId: string;            // Firebase Auth UID of doctor
    doctorName?: string;
    date: string;                // YYYY-MM-DD
    time: string;                // HH:MM AM/PM
    status: AppointmentStatus;
    mode: AppointmentMode;
    notes?: string;
    createdAt: number;           // Timestamp
}

// ==================== PRESCRIPTIONS ====================
export interface PrescriptionMedication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}

export interface Prescription {
    id: string;
    patientDataId: string;
    doctorId: string;
    doctorName: string;
    diagnosis: string;
    medications: PrescriptionMedication[];
    notes?: string;
    createdAt: number;
    validUntil?: string;         // YYYY-MM-DD
}

// ==================== REPORTS (Doctor-uploaded) ====================
export type ReportType = "lab_result" | "imaging" | "prescription_pdf" | "discharge_summary" | "other";

export interface Report {
    id: string;
    title: string;
    type: ReportType;
    fileUrl?: string;             // Legacy or public URL
    cloudinaryPublicId?: string;  // For signed URL generation
    resourceType?: string;        // 'raw' for PDFs, 'image' for images
    version?: string;             // Cloudinary asset version (essential for signed URLs)
    format?: string;              // pdf, png, jpg, etc.
    uploadedBy: string;           // User UID
    uploadedByName: string;
    uploadedAt: number;           // Timestamp
    notes?: string;
}
