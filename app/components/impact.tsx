export function Impact() {
  const items = [
    { value: "1M+", label: "Records Capacity", sub: "Designed for scale" },
    { value: "50+", label: "Target Cities", sub: "Nationwide expansion plan" },
    { value: "Open", label: "Partner Network", sub: "For Clinics & Hospitals" },
    { value: "24/7", label: "AI Monitoring", sub: "Always-on safety protocol" },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-24" aria-labelledby="impact-heading">
      <div className="mb-12 text-center">
        <h2 id="impact-heading" className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
          Built for Impact
        </h2>
        <p className="text-muted-foreground mt-4">Scalable infrastructure ready to transform healthcare delivery.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="text-4xl font-extrabold text-primary mb-2">{item.value}</div>
            <div className="text-lg font-bold text-foreground">{item.label}</div>
            <p className="mt-2 text-sm text-muted-foreground font-medium">{item.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
