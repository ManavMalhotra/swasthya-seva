import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function processMedicalPrescription(imageData: string, mimeType: string = "image/jpeg") {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = "Analyze this prescription image or text. Extract the medicine names, dosages, and frequency. Format the output as a JSON object with keys: 'medicines' (array of objects with 'name', 'dosage', 'frequency', 'time' (Morning/Afternoon/Night)), and 'advice' (string). If it's not a prescription, return an error message.";

    const imagePart = {
        inlineData: {
            data: imageData,
            mimeType: mimeType,
        },
    };

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text); // Debug log

        // Robust JSON extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = text.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(jsonStr);
        }

        return null;
    } catch (error) {
        console.error("Error processing prescription:", error);
        return null;
    }
}

