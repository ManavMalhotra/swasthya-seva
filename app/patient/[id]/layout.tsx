import React from "react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import DashboardHeader from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. The main container is a vertical column taking up the full screen height.
    <div className="flex flex-col h-screen  px-8 py-8">
      {/* 2. The header is the first element, taking its natural height. */}
      <DashboardHeader />

      {/* 3. This container is a horizontal row and fills the REMAINING vertical space. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Fixed width, part of the flex row. */}
        <Sidebar />

        {/* Main Content: Takes all available horizontal space and handles its own scrolling. */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>

        {/* Chat Panel: Fixed width, part of the flex row, responsive. */}
        {/* <aside className="hidden lg:block w-[384px] p-6 pr-4">
          <ChatPanel />
        </aside> */}
      </div>
    </div>
  );
}
