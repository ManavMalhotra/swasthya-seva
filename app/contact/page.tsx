import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export default function Contact() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-24 space-y-8 animate-appear">
        <div className="bg-card p-8 rounded-2xl shadow-lg border border-border text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Get in Touch</h1>
          <p className="text-muted-foreground mb-8">
            Have questions or need assistance? We are here to help you on your health journey.
          </p>

          <a
            href="mailto:support@swasthyaseva.com"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
          >
            Contact Support
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
