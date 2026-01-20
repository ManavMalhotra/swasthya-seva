"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Heart, Activity } from "lucide-react"

export function LiveReadings() {
  const readings = [
    {
      label: "Heart Rate",
      value: "72",
      unit: "bpm",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950",
      fullWidth: true,
    }
  ]

  return (
    <div>
      {/* <h2 className="text-xl sm:text-2xl font-bold mb-4">Live Readings</h2> */}
      <div className="space-y-4">
        {readings.map((reading) => {
          const Icon = reading.icon
          return (
            <Card key={reading.label} className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{reading.label}</p>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-bold">{reading.value}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">{reading.unit}</span>
                    </div>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${reading.bgColor}`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${reading.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
