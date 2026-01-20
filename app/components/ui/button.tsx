import * as React from "react"
import { cn } from "../lib/utils"

type Variant = "default" | "secondary" | "outline" | "ghost" | "link" | "destructive"
type Size = "default" | "sm" | "lg" | "icon"

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 ring-offset-background"

const variantClasses: Record<Variant, string> = {
  default: "bg-[#3B82F6] text-primary-foreground hover:bg-[#2467D4]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
}

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
}

export function buttonVariants({
  variant = "default",
  size = "default",
}: {
  variant?: Variant
  size?: Size
}) {
  return cn(base, variantClasses[variant], sizeClasses[size])
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    return <button ref={ref} className={cn(base, variantClasses[variant], sizeClasses[size], className)} {...props} />
  },
)

Button.displayName = "Button"
