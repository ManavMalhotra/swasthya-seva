"use client"

import Link from "next/link"
import { Button } from "../components/ui/button"
import Image from "next/image"
import Logo from "@/public/logo.png"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="swasthya-seva Home">
          <Image
            src={Logo}
            alt="swasthya-seva Logo"
            className="w-32 md:w-40 h-auto object-contain transition-all hover:opacity-90"
            priority
          />

          {/* <h1 className="text-2xl font-bold">💖 Swasthya Seva</h1> */}

        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="#about" className="hover:text-primary transition-colors">About</Link>
          <Link href="#contact" className="hover:text-primary transition-colors">Contact</Link>
          <Link href="#faq" className="hover:text-primary transition-colors">FAQs</Link>
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-primary hover:bg-primary/5">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition-all hover:scale-105">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full border-b border-border/50 bg-background shadow-lg animate-in slide-in-from-top-5 fade-in duration-200">
          <nav className="flex flex-col p-4 space-y-4 text-center">
            <Link
              href="/"
              className="py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href="#about"
              className="py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              href="#contact"
              className="py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="#faq"
              className="py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              FAQs
            </Link>
            <div className="pt-4 flex flex-col gap-3 border-t border-border/50">
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-center">Sign In</Button>
              </Link>
              <Link href="/register" onClick={() => setIsOpen(false)}>
                <Button className="w-full rounded-full">Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
