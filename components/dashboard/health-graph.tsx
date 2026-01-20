"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function HealthGraph() {
  const [timePeriod, setTimePeriod] = useState("1w")

  // Sample data for different time periods
  const dataByPeriod = {
    "1d": [
      { time: "00:00", value: 72 },
      { time: "04:00", value: 68 },
      { time: "08:00", value: 75 },
      { time: "12:00", value: 78 },
      { time: "16:00", value: 76 },
      { time: "20:00", value: 72 },
      { time: "24:00", value: 70 },
    ],
    "1w": [
      { time: "Mon", value: 72 },
      { time: "Tue", value: 74 },
      { time: "Wed", value: 71 },
      { time: "Thu", value: 75 },
      { time: "Fri", value: 73 },
      { time: "Sat", value: 70 },
      { time: "Sun", value: 72 },
    ],
    "1m": [
      { time: "Week 1", value: 72 },
      { time: "Week 2", value: 73 },
      { time: "Week 3", value: 71 },
      { time: "Week 4", value: 74 },
    ],
    "3m": [
      { time: "Jan", value: 72 },
      { time: "Feb", value: 73 },
      { time: "Mar", value: 71 },
    ],
    "1y": [
      { time: "Jan", value: 72 },
      { time: "Mar", value: 73 },
      { time: "May", value: 71 },
      { time: "Jul", value: 74 },
      { time: "Sep", value: 72 },
      { time: "Nov", value: 70 },
    ],
    all: [
      { time: "2024", value: 72 },
      { time: "2025", value: 73 },
    ],
  }

  const periods = [
    { id: "1d", label: "1d" },
    { id: "1w", label: "1w" },
    { id: "1m", label: "1m" },
    { id: "3m", label: "3m" },
    { id: "1y", label: "1y" },
    { id: "all", label: "All Time" },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl sm:text-2xl">Health Graph</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {periods.map((period) => (
              <Button
                key={period.id}
                variant={timePeriod === period.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(period.id)}
                className="text-xs sm:text-sm"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataByPeriod[timePeriod as keyof typeof dataByPeriod]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: `1px solid var(--color-border)`,
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "var(--color-foreground)" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: "var(--color-primary)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
