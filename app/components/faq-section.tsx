"use client"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

export function FaqSection() {
    const faqs = [
        {
            question: "How do I get a swasthya seva Smart Card?",
            answer: "You can get your card at any partner hospital or clinic. The issuance process takes less than 5 minutes. Once issued, you can link it to your app account to view your digital records."
        },
        {
            question: "Is my medical data safe?",
            answer: "Absolutely. We use end-to-end encryption for all data transmission and storage. We comply with major digital health data protection standards and never sell your data to third parties."
        },
        {
            question: "Can I use the card for my whole family?",
            answer: "Each individual needs their own Smart Card as it links to their unique medical profile (allergies, history, prescriptions). You can, however, manage multiple family profiles from a single caregiver account in the app."
        },
        {
            question: "What happens if I lose my card?",
            answer: "Don't worry! You can instantly lock your card via the app to prevent unauthorized access. Visit any partner clinic to get a replacement card issued; your data will be automatically synced to the new card."
        },
        {
            question: "Do I need an internet connection?",
            answer: "The card itself uses RFID and doesn't need internet. However, to view real-time updates and cloud records on your phone or for the doctor to upload new data, an active internet connection is required."
        },
    ]

    return (
        <section id="faq" className="py-20 bg-muted/30 scroll-mt-24 border-y border-border/50">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground">Common queries about security, devices, and the swasthya seva platform.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <FaqItem key={i} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-border rounded-lg bg-card overflow-hidden transition-all hover:border-primary/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-4 text-left font-medium transition-colors hover:bg-muted/50"
            >
                {question}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
            >
                <div className="p-4 pt-0 text-muted-foreground text-sm leading-relaxed border-t border-dashed border-border/50 mt-2">
                    {answer}
                </div>
            </div>
        </div>
    )
}
