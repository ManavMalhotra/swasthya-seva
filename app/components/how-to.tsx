export function HowTo() {
  const steps = [
    {
      step: 1,
      title: "Get Your Card",
      desc: "Visit any partner clinic or hospital. We instantly issue your RFID-enabled Smart Health Card.",
    },
    {
      step: 2,
      title: "Digitize Records",
      desc: "Scan your card to upload past prescriptions, allergies, and chronic conditions to the cloud.",
    },
    // {
    //   step: 3,
    //   title: "Connect & Monitor",
    //   desc: "Link IoT devices for real-time tracking. The system flags interactions automatically.",
    // },
    {
      step: 3,
      title: "AI Guardian",
      desc: "Use the AI chatbot to book appointments, explain reports, or check medication safety 24/7.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:py-24" aria-labelledby="howto-heading">
      <div className="mb-16 text-center">
        <h2 id="howto-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
          Simple Steps to Safer Health
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">From physical card to digital peace of mind.</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="relative space-y-8 pl-8 before:absolute before:inset-0 before:left-3 before:h-full before:w-[2px] before:bg-primary">
          {steps.map((s, i) => (
            <div key={i} className="relative group">
              <span className="absolute -left-9 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold shadow-lg ring-4 ring-white transition-transform group-hover:scale-110">
                {s.step}
              </span>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                <h3 className="text-xl font-bold mb-2 text-primary/90">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
