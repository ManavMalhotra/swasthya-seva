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
    <div className="flex flex-col h-screen px-8 py-8">
      <DashboardHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>

        {/* <aside className="hidden lg:block w-[384px] p-6 pr-4">
          <ChatPanel />
        </aside> */}
      </div>
    </div>
  );
}
