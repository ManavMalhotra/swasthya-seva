"use client"

import { useState } from "react"
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { MainContent } from "./main-content"
import { ChatPanel } from "./chat-panel"

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content with Chat - Stack vertically on mobile, horizontal on lg+ */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Dashboard Content */}
          <MainContent />

          {/* Chat Panel */}
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
