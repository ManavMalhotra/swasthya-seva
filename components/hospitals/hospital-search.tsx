"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface HospitalSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function HospitalSearch({ searchQuery, onSearchChange }: HospitalSearchProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-5" />
      <Input
        placeholder="Search for nearby hospitals..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 py-2 md:py-3 text-sm md:text-base rounded-lg border border-input bg-background"
      />
    </div>
  )
}
