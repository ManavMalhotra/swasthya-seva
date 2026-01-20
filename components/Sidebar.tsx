"use client";

import { usePathname } from "next/navigation";
import { Home, Calendar, MapPin, Zap, User, X, Bot, LogOut, LayoutGrid, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    {
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      href: "/dashboard/appointments",
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: Bell,
      href: "/dashboard/reminders",
    },
    // {
    //   id: "hospitals",
    //   label: "Hospitals",
    //   icon: MapPin,
    //   href: "/dashboard/hospitals",
    // },
    // {
    //   id: "prediction",
    //   label: "Prediction",
    //   icon: Zap,
    //   href: "/dashboard/prediction",
    // },
    {
      id: "chat",
      label: "Assistant",
      icon: Bot,
      href: "/dashboard/chat",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out flex flex-col md:relative md:bg-card md:inset-auto",
          // Mobile: Slide in from left
          isOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0",
          // Desktop: Always visible, collapsed width
          "md:w-20 md:translate-x-0"
        )}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            {/* Simple Logo Placeholder */}
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">Swasthya Seva</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted/50 rounded-full h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 flex flex-col md:px-3 md:items-center overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose} // Auto-close on mobile
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group w-full md:w-auto md:justify-center md:px-0 md:py-0",
                  active
                    ? "bg-primary/5 text-primary font-semibold md:bg-transparent md:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground md:hover:bg-transparent"
                )}
              >
                {/* Icon Container */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl transition-all duration-200",
                    "h-6 w-6 md:h-11 md:w-11", // Plain icon on mobile, styled container on desktop
                    active
                      ? "md:bg-primary md:text-primary-foreground md:shadow-md md:scale-105"
                      : "md:text-muted-foreground md:hover:bg-accent md:hover:text-accent-foreground md:hover:scale-105"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "md:text-primary-foreground" : "")} />
                </div>

                {/* Text Label (Mobile Only - Desktop uses Tooltip) */}
                <span className="md:hidden text-base">{item.label}</span>

                {/* Desktop Tooltip */}
                <span className="hidden md:block absolute left-14 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section (Logout/Profile on Mobile) */}
        <div className="md:hidden p-6 border-t border-border/50 bg-muted/5">
          <Button variant="outline" className="w-full justify-center gap-2 border-dashed border-border hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-colors h-11 bg-background">
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
