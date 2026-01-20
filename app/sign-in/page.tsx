import { SiteHeader } from "../components/site-header"
import { SiteFooter } from "../components/site-footer"
import { Button } from "../components/ui/button"

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Authentication will be added here in a future step.</p>
        <Button disabled className="w-full">
          Continue
        </Button>
      </main>
      <SiteFooter />
    </>
  )
}
