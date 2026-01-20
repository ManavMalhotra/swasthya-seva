import { Shield, Activity, Globe } from "lucide-react"

export function AboutSection() {
    const values = [
        {
            icon: Shield,
            title: "Bank-Grade Security",
            desc: "Your health records are encrypted using AES-256 standards. Only you and your authorized doctors can access them.",
        },
        {
            icon: Activity,
            title: "AI-Driven Insights",
            desc: "Our active monitoring analysis flags irregularities instantly, turning raw data into life-saving actionable intelligence.",
        },
        {
            icon: Globe,
            title: "Universal Access",
            desc: "Carry your complete medical history in your pocket. The Smart Card works at any swasthya seva-enabled facility.",
        },
    ]

    return (
        <section id="about" className="container mx-auto px-4 py-20 scroll-mt-24">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 text-primary">Our Mission</h2>
                <p className="text-lg text-muted-foreground">
                    Refundamentalizing healthcare by bridging the gap between patient data and doctor decisions through secure, real-time IoT.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {values.map((v, i) => (
                    <div key={i} className="bg-card p-6 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                        <v.icon className="w-10 h-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">{v.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
