import { SiteHeader } from "../components/site-header"
import { SiteFooter } from "../components/site-footer"

export default function RegisterSpecialistPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Register (Specialist)</h1>
        <p className="text-muted-foreground">
          Specialists can register here to consult with patients and review IoT health data. This is a placeholder page.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
