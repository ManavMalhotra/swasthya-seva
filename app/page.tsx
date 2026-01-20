"use client";

import ChatBot from "@/components/ChatBot";
import { ArrowRight, Activity, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 drop-shadow-sm">
              Healthcare Reimagined with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-600">
                AI & Empathy
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              Swasthya Seva bridges the gap between technology and care. Manage prescriptions, track vitals, and connect with doctors seamlessly.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/onboarding" className="btn-primary flex items-center gap-2 px-8 py-4 text-lg">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/about" className="px-8 py-4 text-lg font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm hover:shadow-md">
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-8 h-8 text-teal-600" />}
              title="Smart Reminders"
              description="Never miss a dose again. AI extracts medicine details from your prescription photos."
            />
            <FeatureCard
              icon={<Activity className="w-8 h-8 text-emerald-600" />}
              title="Health Tracking"
              description="Monitor your vitals and keep a digital history of your health journey."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-8 h-8 text-cyan-600" />}
              title="Secure & Private"
              description="Your health data is encrypted and stored securely. Only you decide who sees it."
            />
          </div>
        </div>
      </section>

      <ChatBot />
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass-panel p-8 rounded-2xl border border-gray-100/50 hover:border-teal-100 transition shadow-lg hover:shadow-xl"
    >
      <div className="mb-4 p-3 bg-gray-50 rounded-xl w-fit">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}
