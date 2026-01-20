import { SiteHeader } from "../components/site-header"
import { SiteFooter } from "../components/site-footer"

export default function FaqsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">FAQs</h1>
        <p className="text-muted-foreground">
          Common questions and answers about Swasthya Seva. This is a placeholder FAQs page.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
