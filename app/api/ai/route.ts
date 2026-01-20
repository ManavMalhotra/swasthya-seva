import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { verifyAuthToken, adminDb as db, checkPatientAccess } from "@/lib/firebaseAdmin";

// Initialize Gemini (Lazy init inside handler to ensure env vars are loaded)
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Initialize Gemini (Lazy init inside handler to ensure env vars are loaded)
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        console.log("DEBUG: Google API Key Status:", !!process.env.GEMINI_API_KEY ? "Present" : "Missing");

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Server Configuration Error: Missing GEMINI_API_KEY" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // 1. Verify Auth
        const { valid, uid, error } = await verifyAuthToken(req);
        if (!valid || !uid) {
            return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userMessage, image } = body; // accept image base64

        // 2. Fetch User Profile & Role
        const userSnap = await db.ref(`users/${uid}`).get();
        if (!userSnap.exists()) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }
        const userData = userSnap.val();
        const role = userData.role;
        const userName = userData.displayName || userData.email || "Patient";

        console.log(`DEBUG: AI Request from User: ${uid}, Role: ${role}, Name: ${userName}`);

        // 3. Build Context
        let contextPrompt = "";

        if (role === "patient") {
            const patientId = userData.patientDataId;
            console.log(`DEBUG: Patient Data ID: ${patientId}`);

            if (!patientId) {
                console.error("DEBUG: No patientDataId found for patient user.");
                return NextResponse.json({ error: "Patient record not linked" }, { status: 400 });
            }

            // Fetch Health Data
            const patientSnap = await db.ref(`patients/${patientId}`).get();
            const pData = patientSnap.val() || {};
            console.log(`DEBUG: Patient Data Found: ${!!patientSnap.exists()}`);

            // Fetch Available Doctors (Simple list for MVP)
            // Note: We fetch all users and filter in-memory to avoid needing a Firebase Index on 'role' for now.
            const usersSnap = await db.ref("users").get();
            let doctorsList = "No doctors currently available.";

            if (usersSnap.exists()) {
                const users = usersSnap.val();
                doctorsList = Object.values(users)
                    .filter((u: any) => u.role === "doctor")
                    .map((d: any) => `- Dr. ${d.profile?.firstName || d.displayName} (${d.profile?.specialization || "General"})`)
                    .join("\n");
            }

            // Format Lists
            const conditionList = pData.conditions
                ? pData.conditions.map((c: any) => `${c.condition} (${c.status})`).join(", ")
                : "None known";

            const medList = pData.medications
                ? pData.medications.filter((m: any) => m.isActive).map((m: any) => `${m.name} ${m.dosage}`).join(", ")
                : "No active medications";

            contextPrompt = `
      CONTEXT:
      You are speaking to ${userName} (Age: ${calculateAge(pData.dob) || "Unknown"}).
      
      PATIENT HEALTH RECORD:
      - Active Conditions: ${conditionList}
      - Current Medications: ${medList}
      - Recent Vitals: ${pData.vitalsHistory ? JSON.stringify(pData.vitalsHistory) : "None recorded"}
      
      AVAILABLE DOCTORS FOR REFERRAL:
      ${doctorsList}
      `;
            console.log("DEBUG: Context built successfully. Length:", contextPrompt.length);
        } else {
            console.log("DEBUG: User is not a patient. Skipping medical context.");
        }

        // 4. Construct System Prompt with JSON Instruction
        const systemPrompt = `
    ${contextPrompt}

    ROLE:
    You are 'Swasthya Seva AI', a helpful and empathetic medical assistant.
    
    RULES:
    1. Answer health questions based ONLY on the provided patient context if applicable.
    2. If the user asks about something unrelated to health (e.g. coding, history, politics), politely refuse.
    3. DISCLAIMER: You are an AI assistant. You do NOT need to repeat "I am not a doctor" in every message. Only mention it if you are providing a specific medical assessment or if the user asks for a diagnosis.
    4. EMERGENCY: If the user describes life-threatening symptoms (chest pain, trouble breathing, unconsciousness), IGNORE everything else and tell them to call Emergency Services immediately.

    ACTION CAPABILITY 1: APPOINTMENTS
    If the user asks to "book an appointment" or if you recommend a specific doctor and they say "yes" or "go ahead":
    - Return a JSON object with an "action" field.
    
    ACTION CAPABILITY 2: PRESCRIPTION ANALYSIS (REMINDERS)
    If the user uploads an image of a prescription or medicine:
    - Analyze the image to identify the medicine name, dosage, and frequency.
    - Return a JSON object with type "CONFIRM_REMINDER".
    - "times" should be an array of strings in 24h format (e.g., ["08:00", "20:00"]). Infer times based on frequency (e.g., "Twice a day" -> 09:00, 21:00).
    
    RESPONSE FORMAT:
    You must ALWAYS reply in strict JSON format. Do not include markdown naming like \`\`\`json.
    
    Possible Formats:
    1. Standard Reply:
    {
      "text": "Your heart rate seems normal..."
      
    }
    
    2. Trigger Booking Action:
    {
      "text": "I'm opening the booking form for Dr. Smith now.",
      "action": {
        "type": "OPEN_BOOKING",
        "doctorName": "Dr. Smith", 
        "specialization": "Cardiologist"
      }
    }

    3. Trigger Reminder Confirmation (for Prescription Images):
    {
        "text": "I found these medicines in the prescription. Please confirm to set reminders.",
        "action": {
            "type": "CONFIRM_REMINDER",
            "medications": [
                { "name": "Amoxicillin", "dosage": "500mg", "frequency": "Twice daily", "times": ["09:00", "21:00"] }
            ]
        }
    }
    `;

        // 5. Generate Response
        // Use a model that supports vision if image is present
        const modelName = image ? "models/gemini-2.5-flash" : "models/gemini-3-flash-preview";
        const model = genAI.getGenerativeModel({
            model: modelName,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ]
        });

        const chatParts: any[] = [{ text: systemPrompt }];

        // Logic for handling history + new message + potential image
        // We restart chat context for each request in this stateless API design (simplified)
        // ideally we would pass full history, but for now we rely on the single turn for image analysis

        const userParts: any[] = [];
        if (image) {
            // "image" is expected to be base64 string without data prefix, or with it.
            // Gemini expects straight base64.
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

            userParts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg", // Assume JPEG/PNG, logic can be smarter
                },
            });
            userParts.push({ text: "Analyze this image and extract medication details for reminders." });
        }

        if (userMessage) {
            userParts.push({ text: userMessage });
        }

        const result = await retryOperation(async () => {
            return await model.generateContent([
                ...chatParts,
                ...userParts
            ]);
        }, 3, 1000);

        const responseText = result.response.text();

        // Clean up potential markdown code blocks if the model adds them despite instructions
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsed = JSON.parse(cleanJson);
            return NextResponse.json({
                reply: parsed.text,
                action: parsed.action || null
            });
        } catch (e) {
            // Fallback if model fails JSON mode
            return NextResponse.json({ reply: responseText });
        }

    } catch (error: any) {
        console.error("AI Error:", error);

        // Check for specific Overloaded/Service Unavailable errors
        if (error.message?.includes("503") || error.message?.includes("overloaded")) {
            return NextResponse.json({
                error: "The AI service is currently experiencing high traffic. Please try again in a few moments."
            }, { status: 503 });
        }

        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

// Helper: Delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry Operation
async function retryOperation<T>(operation: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0 && (error.message?.includes("503") || error.message?.includes("429") || error.message?.includes("overloaded"))) {
            console.warn(`[AI Retry] Error encountered: ${error.message}. Retrying in ${delayMs}ms... (${retries} retries left)`);
            await delay(delayMs);
            return retryOperation(operation, retries - 1, delayMs * 2);
        }
        throw error;
    }
}

function calculateAge(dob?: string) {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return age > 0 ? age : null;
}
