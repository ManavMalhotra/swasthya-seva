"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { Bell, Menu, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Logo from "@/public/logo.png";

// Mock notifications (fixed missing fields)
const mockNotifications = [
  {
    id: 1,
    title: "Notification1 Heading",
    message:
      "doctor's dashboard and the patient's dashboard with the right balance of information is critical",
    time: "2m ago",
  },
  {
    id: 2,
    title: "High Alert: Patient At-Risk",
    message:
      "Patient Lakshya Singh's vitals are trending downwards. Please review immediately.",
    time: "10m ago",
  },
  {
    id: 3,
    title: "System Update",
    message:
      "The reporting module will be updated tonight at 10 PM. Expect brief downtime.",
    time: "1h ago",
  },
];

// Better logo component
// const swasthya-sevaLogo = () => (
//   <Image
//     src={Logo}
//     alt="Logo"
//     className="md:w-50 w-24 m-2 ms-0 rounded"
//   />
// );

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const notifications = mockNotifications;

  return (
    <header className="border-b border-border bg-card h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      {/* Left: Logo and Menu */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden h-9 w-9 text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          {/* <h1>Swasthya Seva</h1> */}
          <Image
            src={Logo}
            alt="swasthya-seva Logo"
            className="w-32 md:w-40 h-auto object-contain transition-all hover:opacity-90"
            priority
          />
        </div>
      </div>

      {/* Right: Settings + Notifications */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications Dropdown */}
        <DropdownMenu
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-card" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 sm:w-80">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>

            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex flex-col items-start py-3 px-4 cursor-default hover:bg-muted text-xs sm:text-sm"
              >
                <p className="font-medium">{notif.title}</p>
                <p className="text-muted-foreground line-clamp-2">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notif.time}
                </p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Page Button - Cleaned up */}
        <Link href="/profile">
          <Button
            variant={pathname.startsWith("/profile") ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-full border border-border/50 hover:bg-muted"
            title="Profile"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
