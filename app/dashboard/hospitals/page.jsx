"use client"

import { useState } from "react"
import { HospitalsContent } from "@/components/hospitals/HospitalsContent"

export default function HospitalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        {/* <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} /> */}

        {/* Content with Chat - Stack vertically on mobile, horizontal on lg+ */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Hospitals Content */}
          <HospitalsContent />

          {/* Chat Panel */}
          {/* <ChatPanel /> */}
        </div>
      </div>
    </div>
  )
}
