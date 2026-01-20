"use client"
import { LiveReadings } from "./live-readings"
import { HealthGraph } from "./health-graph"
import { CheckupTable } from "./checkup-table"

export function MainContent() {
  return (
    <main className="flex-1 overflow-y-auto bg-background w-full">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Live Readings */}
        <LiveReadings />

        {/* Health Graph */}
        <HealthGraph />

        {/* Checkup Records Table */}
        <CheckupTable />
      </div>
    </main>
  )
}
