"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Mic, Bot, User, Volume2, Sparkles,
  Stethoscope, Calendar, Activity, X, Info,
  ChevronRight, ArrowRight, ShieldCheck,
  Paperclip, Image as ImageIcon, Bell
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { auth, db } from "@/lib/firebase";
import { push, ref, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { AppointmentForm } from "@/components/appointments/appointment-form";

import { toast } from "sonner";
import { ensureMedicationExists } from "@/lib/adherenceService";
import { PatientUser } from "@/types";

// ---------- TYPES ----------
type Message = {
  id: number;
  sender: "ai" | "user";
  text: string;
  isAction?: boolean;
  image?: string; // Base64 preview
};

type ActionData = {
  type: string;
  doctorName?: string;
  doctorId?: string; // New: Pass ID if available
  specialization?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    times: string[];
  }>;
};

// ---------- TYPES FOR SPEECH RECOGNITION ----------
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function AiChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I'm Swasthya Seva AI 🤖\nI can help you check your health records, understand medications, or book appointments.\n\n*Note: I am an AI, not a doctor.*",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [prefilledDoctor, setPrefilledDoctor] = useState<string | undefined>(undefined);

  // Reminder Confirmation State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<ActionData["medications"]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecognition = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && window.webkitSpeechRecognition) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      speechRecognition.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechRecognition.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    if (isListening) speechRecognition.current.stop();
    else speechRecognition.current.start();
  };

  // Image Handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger Notification Permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop notifications");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success("Notifications enabled!");
      new Notification("Swasthya Seva", { body: "Test notification: Setup complete!" });
    } else {
      toast.error("Notification permission denied");
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() && !selectedImage) return;

    // Add User Message
    const userMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: textToSend,
      image: selectedImage || undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const imageToSend = selectedImage; // local copy
    clearImage(); // reset UI immediately
    setTyping(true);

    try {
      // Fix: Use firebase auth currentUser directly for token
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userMessage: textToSend,
          image: imageToSend
        }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Add AI Response
      const aiMsg: Message = { id: Date.now() + 1, sender: "ai", text: data.reply || "I'm not sure how to respond." };
      setMessages((prev) => [...prev, aiMsg]);

      // Handle Actions
      if (data.action) {
        if (data.action.type === "OPEN_BOOKING") {
          setPrefilledDoctor(undefined); // Could parse name from action if robust
          setTimeout(() => setShowBookingModal(true), 800);
        } else if (data.action.type === "CONFIRM_REMINDER") {
          const meds = data.action.medications || [];
          setPendingReminders(meds);
          // Select all by default
          setSelectedIndices(new Set(meds.map((_: any, i: number) => i)));
          setTimeout(() => setShowReminderModal(true), 800);
        }
      }

    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 2, sender: "ai", text: `⚠ Error: ${error.message || "Connection failed."}` },
      ]);
    }

    setTyping(false);
  };

  // Save Reminders to Firebase
  const confirmReminders = async () => {
    if (!user || user.role !== 'patient') {
      toast.error("Only patients can set reminders");
      return;
    }

    if (selectedIndices.size === 0) {
      toast.error("Please select at least one medicine");
      return;
    }

    try {
      const selectedMeds = pendingReminders?.filter((_, i) => selectedIndices.has(i)) || [];
      const promises = selectedMeds.map(med => {
        const reminderData = {
          medicineName: med.name,
          dosage: med.dosage,
          times: med.times, // Format: ["08:00", "20:00"]
          status: "upcoming",
          enabled: true,
          createdAt: Date.now(),
          userId: user.uid,
          everyDay: true, // Default to everyday for AI inferred
          weekdays: [],
          days: 7 // Default duration
        };
        const newRef = push(ref(db, `reminders/${user.uid}`));
        return set(newRef, { id: newRef.key, ...reminderData });
      });

      // SYNC: Ensure these meds exist in the patient's medical profile
      // We do this in parallel but don't block the UI success on it
      const pUser = user as PatientUser;
      selectedMeds.forEach(med => {
        ensureMedicationExists(
          pUser.patientDataId,
          med.name,
          med.dosage,
          med.frequency
        ).catch(e => console.error("Failed to sync med to profile:", e));
      });

      await Promise.all(promises);
      toast.success(`Saved ${promises.length} reminders!`);
      setShowReminderModal(false);
      setPendingReminders([]);
      setSelectedIndices(new Set());

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "ai",
        text: "✅ I've set up those reminders for you. You'll get notified at the scheduled times."
      }]);

    } catch (err) {
      toast.error("Failed to save reminders");
      console.error(err);
    }
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const suggestAction = (text: string) => handleSend(text);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gradient-to-br from-indigo-50 via-white to-purple-50 md:p-6 relative font-sans text-slate-800">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Disclaimer Banner */}
      <div className="bg-amber-50/80 backdrop-blur-sm text-amber-800 text-xs font-medium py-2 px-4 rounded-t-xl md:rounded-xl md:mb-4 border border-amber-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Swasthya Seva AI assistant. For emergencies, call 112.</span>
        </div>
        {/* Developer Test Button */}
        <button
          onClick={requestNotificationPermission}
          className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"
        >
          <Bell className="w-3 h-3" /> Test Notify
        </button>
      </div>

      <div className="flex-1 bg-white/70 backdrop-blur-xl md:rounded-3xl shadow-xl border border-white/50 flex flex-col overflow-hidden relative">

        {/* Header */}
        <div className="p-4 md:px-6 border-b border-gray-100/50 flex justify-between items-center bg-white/60 z-10 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
                <Bot className="text-primary-foreground w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
              </span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight tracking-tight">Health Assistant</h1>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                Powered by Gemini 3.0 <Sparkles className="w-3 h-3 text-amber-500" />
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] items-end ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.sender === "user" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                  {msg.sender === "user" ? <User className="w-4 h-4 text-muted-foreground" /> : <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-2 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  {msg.image && (
                    <div className="p-1 bg-white border rounded-xl shadow-sm w-48 h-auto overflow-hidden">
                      <img src={msg.image} alt="User upload" className="w-full h-auto rounded-lg" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm shadow-primary/10"
                    : "bg-card border border-border text-foreground rounded-bl-sm shadow-sm"
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Actions (Chips) */}
        {messages.length < 3 && (
          <div className="px-4 md:px-6 py-3 flex flex-wrap gap-2.5 border-t border-gray-50 bg-white/40 backdrop-blur-sm">
            <SuggestionChip
              icon={<Calendar className="text-blue-500" />}
              label="Book Appointment"
              subLabel="Find a doctor"
              onClick={() => suggestAction("I want to book an appointment")}
            />
            <SuggestionChip
              icon={<Activity className="text-emerald-500" />}
              label="Check Vitals"
              subLabel="Latest Health Stats"
              onClick={() => suggestAction("What are my latest vitals?")}
            />
            <SuggestionChip
              icon={<Stethoscope className="text-rose-500" />}
              label="My Meds"
              subLabel="Active Prescriptions"
              onClick={() => suggestAction("What medications am I on?")}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 md:p-6 pt-2 bg-white/60 backdrop-blur-md">
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-white rounded-lg border shadow-sm w-fit animate-in fade-in slide-in-from-bottom-2">
              <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded object-cover" />
              <span className="text-xs text-gray-500 font-medium">Image attached</span>
              <button onClick={clearImage} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><X size={14} /></button>
            </div>
          )}
          <div className="relative flex items-center gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
              title="Upload Prescription"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input
              className="flex-1 bg-transparent border-0 px-4 py-3 text-sm focus:ring-0 outline-none text-gray-700 placeholder:text-gray-400 font-medium"
              placeholder={isListening ? "Listening..." : "Type or upload prescription..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isListening}
            />

            <div className="flex items-center gap-1 pr-1">
              <button
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${isListening
                  ? "bg-red-50 text-red-500 ring-2 ring-red-100 animate-pulse"
                  : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  }`}
                title="Use Voice Input"
              >
                {isListening ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !selectedImage}
                className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-center mt-2.5">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Secure Health chat with swasthya-seva AI</p>
          </div>
        </div>
      </div>

      {/* Booking Modal (triggered by AI) */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 border-b border-purple-100 flex justify-between items-center">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Book Appointment
                </h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-1.5 rounded-full bg-white/50 hover:bg-white text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2">
                <AppointmentForm
                  defaultDoctorId={prefilledDoctor}
                  onSuccess={(bookedDate) => {
                    setShowBookingModal(false);
                    setMessages(prev => [...prev, {
                      id: Date.now(),
                      sender: 'ai',
                      text: `✅ Booking confirmed for ${bookedDate}. I've added it to your schedule.`
                    }]);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminder Confirmation Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setShowReminderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-amber-100 flex justify-between items-center">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Confirm Reminders
                </h3>
                <button onClick={() => setShowReminderModal(false)} className="p-1.5 rounded-full hover:bg-white/50 text-gray-500"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">Select the medicines you would like to set automatic reminders for:</p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {pendingReminders?.map((med, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleSelection(idx)}
                      className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${selectedIndices.has(idx) ? "bg-amber-50 border-amber-200 ring-1 ring-amber-100" : "bg-white border-gray-100 hover:bg-gray-50"
                        }`}
                    >
                      <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedIndices.has(idx) ? "bg-amber-500 border-amber-500" : "border-gray-300 bg-white"
                        }`}>
                        {selectedIndices.has(idx) && <X className="w-3.5 h-3.5 text-white rotate-45" />} {/* X rotated 45 = Checkmark-ish, or use Check icon proper */}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-gray-800">{med.name}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{med.dosage} • {med.frequency}</div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {med.times.map((t, ti) => (
                            <span key={ti} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-600">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowReminderModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={confirmReminders} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                    Set {selectedIndices.size} Reminder{selectedIndices.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Chip Component
function SuggestionChip({ icon, label, subLabel, onClick }: { icon: any, label: string, subLabel?: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 pl-3 pr-4 py-2.5 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all text-left"
    >
      <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center border border-border group-hover:border-primary/20 transition-colors">
        <div className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</span>
        {subLabel && <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide group-hover:text-primary/70">{subLabel}</span>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
    </button>
  );
}
