import Link from "next/link";
import { Button } from "../components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Amatic_SC } from "next/font/google";
// import HeroImage from "@/public/heroImg.png";
import HeroImage from "@/public/hero.png";

const amatic = Amatic_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-amatic",
});

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-24 overflow-hidden relative">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Left side (text) */}
        <div className="space-y-8 relative z-10 animate-in slide-in-from-left duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary/60 animate-pulse"></span>
            End-to-End Encrypted & HIPAA Compliant
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Your Health. <br />
              <span className="text-primary">Intelligently Managed.</span>
            </h1>
            <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl leading-relaxed">
              Experience the future of healthcare with <b>AI-powered Reminders</b>, instant prescription analysis, and a 24/7 <b>Smart Health Assistant</b>. Stay on track, effortlessy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12 rounded-2xl shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-12 rounded-2xl border-2 hover:bg-secondary/50">
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side (3D Image) */}
        <div className="relative flex justify-center lg:justify-end animate-in zoom-in duration-1000 delay-200">
          <div className="relative w-full max-w-[600px] aspect-[4/3]">
            {/* Glow effects */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-3xl opacity-50 rounded-full" />

            <Image
              src="/smart_hero.png"
              alt="swasthya-seva Smart Health Interface"
              fill
              className="object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500 rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
