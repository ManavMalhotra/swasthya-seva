"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Upload, X, Bot, User, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { processMedicalPrescription } from "@/lib/gemini";
import { getAuth } from "firebase/auth";
import { getDatabase, push, ref } from "firebase/database";
import { app } from "@/lib/firebase";

interface Message {
    id: string;
    type: "user" | "bot";
    content: string;
    image?: string;
    isPrescriptionAnalysis?: boolean;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            type: "bot",
            content: "Namaste! I am your Swasthya Seva assistant. Upload a prescription or ask me about your health.",
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            type: "user",
            content: inputValue,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Simulate/Call AI text response (If purely text)
            const modelResponse = "I process prescriptions best! Please upload an image if you need medication reminders.";
            // TODO: Hook up text chat to Gemini if needed, currently focusing on Image as requested.

            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), type: "bot", content: modelResponse },
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(",")[1]; // Remove header

            const mimeType = file.type || "image/jpeg";
            const userMsg: Message = {
                id: Date.now().toString(),
                type: "user",
                content: "Analyze this prescription",
                image: base64String,
            };
            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);

            try {
                const result = await processMedicalPrescription(base64Data, mimeType);

                let botReply = "I couldn't read the prescription properly. Please try again with a clearer image.";
                let isAnalysis = false;

                if (result && result.medicines) {
                    botReply = `I found the following medicines:\n${result.medicines.map((m: any) => `- **${m.name}**: ${m.dosage} (${m.frequency})`).join('\n')}\n\nAdvice: ${result.advice}`;
                    isAnalysis = true;

                    // Save to Firebase
                    const auth = getAuth(app);
                    const user = auth.currentUser;
                    if (user) {
                        const db = getDatabase(app);
                        result.medicines.forEach((med: any) => {
                            push(ref(db, `reminders/${user.uid}`), {
                                medicineName: med.name,
                                dosage: med.dosage,
                                frequency: med.frequency,
                                times: med.time ? [med.time] : ["09:00"], // Default or extracted time
                                status: "active",
                                createdAt: Date.now()
                            });
                        });
                    }

                    // Auto-schedule reminders (Mock)
                    if (Notification.permission === "granted") {
                        new Notification("Medication Reminder Set", {
                            body: `Reminders set for ${result.medicines.length} medicines.`,
                            icon: "/logo.png"
                        });
                    } else if (Notification.permission !== "denied") {
                        Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                                new Notification("Swasthya Seva", { body: "Notifications enabled!" });
                            }
                        });
                    }
                }

                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        type: "bot",
                        content: botReply,
                        isPrescriptionAnalysis: isAnalysis
                    },
                ]);
            } catch (error) {
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now().toString(), type: "bot", content: "Sorry, I encountered an error processing that image." },
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50",
                    isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100",
                    "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-emerald-500/50"
                )}
            >
                <Bot className="w-8 h-8" />
            </button>

            {/* Chat Window */}
            <div
                className={cn(
                    "fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100 transition-all duration-300 origin-bottom-right",
                    isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Bot className="w-6 h-6" />
                        <h3 className="font-semibold">Swasthya Assistant</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full",
                                msg.type === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                                    msg.type === "user"
                                        ? "bg-teal-600 text-white rounded-tr-none"
                                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                                )}
                            >
                                {msg.image && (
                                    <img src={msg.image} alt="Upload" className="w-full h-32 object-cover rounded-lg mb-2" />
                                )}
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                {msg.isPrescriptionAnalysis && (
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                        <button className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-full justify-center hover:bg-emerald-100 transition">
                                            <Bell className="w-3 h-3" /> Reminders Set
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                                <span className="text-xs text-gray-500">Processing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-gray-50 rounded-full transition"
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Type message..."
                            className="flex-1 px-4 py-2 bg-gray-50 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="p-2 bg-teal-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
