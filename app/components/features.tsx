import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Activity, Brain, CreditCard, Bell, Sparkles, FileText, Bot } from "lucide-react";

const features = [
  {
    title: "Timely Medication Reminders",
    description:
      "Never miss a dose again with our smart reminders. Get notifications on your phone or email when it's time to take your medications.",
    Icon: Activity,
  },
  {
    title: "AI-Powered Predictions",
    description:
      "Smart algorithms analyze your vitals and history to detect early warning signs. Get alerts before risks turn into emergencies.",
    Icon: Brain,
  },
  {
    title: "Smart Health Card",
    description:
      "Carry your complete medical history securely in one digital card. Access past reports and health records anytime, from birth to present.",
    Icon: CreditCard,
  },
];

export function Features() {
  const patientFeatures = [
    {
      title: "Active Meds Adherence",
      desc: "Track your intake streak. Sync reminders directly to your health record.",
      icon: Activity,
      color: "bg-emerald-500",
    },
    {
      title: "Smart Reminders",
      desc: "Never miss a dose. Get notified on multiple devices.",
      icon: CreditCard, // Using CreditCard as placeholder or change to Bell if available
      color: "bg-blue-500",
    },
    {
      title: "Prescription Scan",
      desc: "Upload a photo of your prescription. AI auto-sets your reminders.",
      icon: Activity, // Placeholder
      color: "bg-rose-500",
    },
  ];

  const doctorFeatures = [
    {
      title: "Efficient Data",
      desc: "View patient vitals, timeline, and reports in one dashboard.",
      icon: Brain,
      color: "bg-violet-500",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24 bg-secondary/30 rounded-3xl my-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
          Complete Care Ecosystem
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Designed for safety at home and efficiency in the clinic.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Patient Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">For Patients</span>
          </div>
          {patientFeatures.map((f, i) => (
            <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-primary/10 overflow-hidden">
              <CardHeader>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${f.color} text-white shadow-lg`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                {f.desc}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Center / Highlight Feature */}
        <div className="md:col-span-2 lg:col-span-1 bg-white rounded-3xl p-8 border border-primary/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-violet-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl shadow-primary/20">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Powered by Gemini AI</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our AI doesn't just store data—it understands it. From explaining complex prescriptions to predicting potential heart risks based on vitals history.
            </p>
          </div>

          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-primary/10 to-transparent rounded-tl-full" />
        </div>

        {/* Doctor Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-semibold">For Doctors</span>
          </div>
          {doctorFeatures.map((f, i) => (
            <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-violet-100 overflow-hidden">
              <CardHeader>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${f.color} text-white shadow-lg`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-relaxed">
                {f.desc}
              </CardContent>
            </Card>
          ))}

          {/* <div className="rounded-2xl bg-slate-900 p-6 text-white text-center">
            <p className="font-semibold mb-2">Join the Network</p>
            <p className="text-slate-400 text-sm">Compatible with existing EMR systems.</p>
          </div> */}
        </div>
      </div>
    </section>
  );
}
