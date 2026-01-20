import { PatientHealthData } from "@/types";

export function calculateHealthScore(patient: PatientHealthData): { score: number; trend: "up" | "down" | "stable"; factors: string[] } {
    const factors: string[] = [];
    let score = 100;

    // Medication Adherence (-30)
    const activeMeds = patient.medications?.filter(m => m.isActive) || [];
    if (activeMeds.length > 0) {
        let taken = 0, total = 0;
        const now = new Date();
        const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        activeMeds.forEach(m => {
            (m.adherenceLog || []).forEach(log => {
                const d = new Date(log.date);
                if (d >= days7Ago && d <= now) {
                    total++;
                    if (log.status === 'taken') taken++;
                }
            });
        });

        // Fix: If no logs exist yet, assume neutral or small penalty vs fail
        // For now keeping logic same as original but handling 0 total case
        if (total > 0) {
            const adherence = (taken / total) * 100;
            if (adherence < 50) { score -= 30; factors.push("Very low medication adherence"); }
            else if (adherence < 70) { score -= 20; factors.push("Low medication adherence"); }
            else if (adherence < 90) { score -= 10; factors.push("Moderate adherence"); }
            else factors.push("Good adherence");
        }
    }

    // Conditions Severity (-25)
    const conditions = patient.conditions || [];
    const critical = conditions.filter(c => c.severity === 'critical' && c.status === 'active').length;
    const severe = conditions.filter(c => c.severity === 'severe' && c.status === 'active').length;

    if (critical > 0) { score -= 25; factors.push(`${critical} critical condition(s)`); }
    else if (severe > 0) { score -= 15; factors.push(`${severe} severe condition(s)`); }
    else if (conditions.filter(c => c.status === 'active').length === 0) factors.push("No active conditions");

    // Allergies (-10)
    const severeAllergies = (patient.allergies || []).filter(a => a.severity === 'severe' || a.severity === 'life-threatening').length;
    if (severeAllergies > 0) { score -= 10; factors.push(`${severeAllergies} severe allergy(s)`); }

    // Vitals check (-15)
    const vitals = patient.vitalsHistory || {};
    if (Object.keys(vitals).length === 0) { score -= 5; factors.push("No vitals recorded"); }
    else {
        const hr = vitals.heartRate?.[vitals.heartRate.length - 1];
        if (hr && (hr.value < 50 || hr.value > 100)) { score -= 10; factors.push("Abnormal heart rate"); }
        const bp = vitals.systolic?.[vitals.systolic.length - 1];
        if (bp && (bp.value > 140 || bp.value < 90)) { score -= 10; factors.push("Abnormal blood pressure"); }
    }

    score = Math.max(0, Math.min(100, score));

    const history = patient.healthScoreHistory || [];
    let trend: "up" | "down" | "stable" = "stable";
    if (history.length > 0) {
        const last = history[history.length - 1].score;
        if (score > last + 5) trend = "up";
        else if (score < last - 5) trend = "down";
    }

    return { score, trend, factors };
}
