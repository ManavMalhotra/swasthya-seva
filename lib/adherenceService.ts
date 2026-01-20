
import { db } from "./firebase";
import { ref, get, set, update, push } from "firebase/database";
import { PatientHealthData, Medication, MedicationAdherenceLog } from "@/types";
import { isSameDay, parseISO, subDays, startOfDay } from "date-fns";

/**
 * ADHERENCE SERVICE
 * 
 * Handles the logic for:
 * 1. Syncing "Reminders" (User-centric) -> "Medical Records" (Patient-centric)
 * 2. Logging intake (Taken/Skipped)
 * 3. Calculating adherence scores and streaks
 */

/**
 * Logs a medication intake action (Taken/Skipped) into the patient's official medical record.
 * If the medication doesn't exist in the medical record, it performs an "Automatic Reconciliation"
 * by adding it as a new active medication.
 */
export async function logMedicationIntake(
    patientId: string,
    medicineName: string,
    status: "taken" | "skipped",
    timestamp: number = Date.now() // Use provided timestamp or now
) {
    if (!patientId || !medicineName) return;

    const medsRef = ref(db, `patients/${patientId}/medications`);
    const snapshot = await get(medsRef);
    let medications: Medication[] = snapshot.exists() ? snapshot.val() : [];

    // 1. Find the medication (Case-insensitive fuzzy match)
    let medIndex = medications.findIndex(m =>
        m.name.toLowerCase().trim() === medicineName.toLowerCase().trim()
    );

    const todayStr = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // 2. If not found, Auto-Create it (Reconciliation)
    if (medIndex === -1) {
        const newMed: Medication = {
            id: push(ref(db, `dummy`)).key!, // Generate ID
            name: medicineName,
            dosage: "As per reminder", // Fallback
            frequency: "Daily", // Fallback
            startDate: todayStr,
            isActive: true,
            prescribedBy: "self-reminder",
            adherenceLog: []
        };
        medications.push(newMed);
        medIndex = medications.length - 1;
    }

    // 3. Append to Adherence Log
    const med = medications[medIndex];
    const newLog: MedicationAdherenceLog = {
        date: todayStr,
        time: timeStr,
        status
    };

    const currentLogs = med.adherenceLog || [];

    // Prevent duplicate logs for the same time window (simple debounce: same day same status)
    // In a real app we might allow multiple doses per day, so we just append.
    // But to be safe against double-clicks, check if we handled this minute already?
    // For simplicity, just append.
    const updatedLogs = [...currentLogs, newLog];

    // 4. Update Firebase
    const updates: Record<string, any> = {};
    updates[`patients/${patientId}/medications/${medIndex}/adherenceLog`] = updatedLogs;

    // If it was a new med, we need to save the whole object
    if (med.prescribedBy === "self-reminder") {
        updates[`patients/${patientId}/medications/${medIndex}`] = med;
        // ensure log is attached
        med.adherenceLog = updatedLogs;
        updates[`patients/${patientId}/medications/${medIndex}`] = med;
    }

    await update(ref(db), updates);

    await update(ref(db), updates);

    return true;
}

/**
 * Ensures a medication exists in the patient's profile.
 * If not, creates it with default "Active" status.
 */
export async function ensureMedicationExists(
    patientId: string,
    medicineName: string,
    dosage: string = "As per reminder",
    frequency: string = "Daily"
) {
    if (!patientId || !medicineName) return;

    const medsRef = ref(db, `patients/${patientId}/medications`);
    const snapshot = await get(medsRef);
    let medications: Medication[] = snapshot.exists() ? snapshot.val() : [];

    // Case-insensitive fuzzy match
    let medIndex = medications.findIndex(m =>
        m.name.toLowerCase().trim() === medicineName.toLowerCase().trim()
    );

    if (medIndex === -1) {
        const newMed: Medication = {
            id: push(ref(db, `dummy`)).key!,
            name: medicineName,
            dosage: dosage,
            frequency: frequency,
            startDate: new Date().toISOString().split('T')[0],
            isActive: true,
            prescribedBy: "self-reminder",
            adherenceLog: []
        };
        medications.push(newMed);

        // Save the new list
        await set(ref(db, `patients/${patientId}/medications`), medications);
    }
}

/**
 * Calculates a "Streak" of perfect adherence.
 * Defined as: Consecutive days up to yesterday/today where at least one med was taken and NONE missed.
 * (Simple version: Consecutive days with at least one 'taken' log)
 */
export function calculateStreak(healthData: PatientHealthData): number {
    if (!healthData?.medications) return 0;

    // Gather all unique dates where meds were taken
    const takenDates = new Set<string>();
    healthData.medications.forEach(m => {
        if (m.adherenceLog) {
            m.adherenceLog.forEach(log => {
                if (log.status === 'taken') takenDates.add(log.date);
            });
        }
    });

    if (takenDates.size === 0) return 0;

    let streak = 0;
    // Check backwards from today
    const today = new Date();

    // Check today first
    if (takenDates.has(today.toISOString().split('T')[0])) {
        streak++;
    }

    // Check previous days
    for (let i = 1; i < 365; i++) { // Limit check to 1 year
        const d = subDays(today, i);
        const dStr = d.toISOString().split('T')[0];
        if (takenDates.has(dStr)) {
            streak++;
        } else {
            // If today hasn't been logged yet, don't break streak if yesterday was good.
            // But if we are at i=1 (yesterday) and it's missing, streak breaks.
            // Exception: If we already found Today (streak=1), then missing yesterday breaks it.
            // If we didn't find Today (streak=0), missing yesterday means 0.

            // Actually, standard streak logic:
            // If today is logged, we count it. Then we check yesterday.
            // If today is NOT logged, we check yesterday. If yesterday is logged, streak starts there.
            if (i === 1 && streak === 0 && !takenDates.has(dStr)) return 0; // No meds today or yesterday

            // Gap found
            break;
        }
    }

    return streak;
}
