// ==================== ENUMS & CONSTANTS ====================
export type Role = "patient" | "doctor";

export const Roles = {
    PATIENT: "patient" as Role,
    DOCTOR: "doctor" as Role,
};

export type Gender = "Male" | "Female" | "Other" | string;

// Re-export common types that were previously in enums
export type {
    AppointmentStatus,
    AppointmentMode,
    ReportType
} from "./common";

export type {
    VitalType,
    ConditionStatus,
    ConditionSeverity,
    AllergySeverity,
    HealthTrend
} from "./patient";
