"use client"

import { useState } from "react"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import { HospitalSearch } from "./hospital-search"
import { HospitalMap } from "./hospital-map"

export function HospitalsContent() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <ScrollArea className="flex-1 w-full lg:w-2/3 h-full">
      <div className="p-4 md:p-6 space-y-6">
        {/* Search Bar */}
        <HospitalSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Map Area */}
        <HospitalMap searchQuery={searchQuery} />
      </div>
    </ScrollArea>
  )
}
