// ==================== CENTRALIZED TYPE EXPORTS ====================
// All types should be imported from this file: `import { ... } from "@/types"`

export * from "./enums";
export * from "./common";
export * from "./doctor";
export * from "./patient";

// ==================== UNION TYPES ====================
import { DoctorUser } from "./doctor";
import { PatientUser } from "./patient";

export type AuthUser = DoctorUser | PatientUser;

// Type guard helpers
export function isPatientUser(user: AuthUser): user is PatientUser {
    return user.role === "patient";
}

export function isDoctorUser(user: AuthUser): user is DoctorUser {
    return user.role === "doctor";
}
