import { SiteHeader } from "./components/site-header"
import { Hero } from "./components/hero"
import { Features } from "./components/features"
import { Impact } from "./components/impact"
import { HowTo } from "./components/how-to"
import { AboutSection } from "./components/about-section"
import { FaqSection } from "./components/faq-section"
import { ContactSection } from "./components/contact-section"
import { SiteFooter } from "./components/site-footer"

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Impact />
        <HowTo />
        <AboutSection />
        <FaqSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  )
}
