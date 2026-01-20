import Link from "next/link"
import Image from "next/image"
import Logo from "@/public/logo.png"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-secondary/5 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="inline-block" aria-label="swasthya-seva Home">
              {/* <Image
                src={Logo}
                alt="swasthya-seva"
                className="w-32 h-auto opacity-90 hover:opacity-100 transition-opacity"
              /> */}

              <h1 className="text-2xl font-bold text-foreground">💖 Swasthya Seva</h1>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Empowering proactive heart health through secure, AI-driven insights and instant global access.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold tracking-wide text-foreground">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition-colors">How it Works</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#security" className="hover:text-primary transition-colors">Security</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold tracking-wide text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="#careers" className="hover:text-primary transition-colors">Careers</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold tracking-wide text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Swasthya Seva Health Technologies. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
