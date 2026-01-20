"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Trash2 } from "lucide-react"

interface CheckupRecord {
  id: string
  date: string
  time: string
  status: "Good" | "OK" | "Bad"
  score: number
}

export function CheckupTable() {
  const records: CheckupRecord[] = [
    {
      id: "1",
      date: "27-Sept-2025",
      time: "14:30",
      status: "Good",
      score: 80,
    },
    {
      id: "2",
      date: "23-Sept-2025",
      time: "10:15",
      status: "OK",
      score: 50,
    },
    {
      id: "3",
      date: "20-Sept-2025",
      time: "09:00",
      status: "Good",
      score: 85,
    },
    {
      id: "4",
      date: "15-Sept-2025",
      time: "15:45",
      status: "Bad",
      score: 35,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Good":
        return "text-green-600 bg-green-50 dark:bg-green-950"
      case "OK":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950"
      case "Bad":
        return "text-red-600 bg-red-50 dark:bg-red-950"
      default:
        return ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Checkup Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-max sm:min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-xs sm:text-sm">Checkup</th>
                <th className="text-left py-3 px-4 font-semibold text-xs sm:text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-xs sm:text-sm">Score</th>
                <th className="text-left py-3 px-4 font-semibold text-xs sm:text-sm">Operations</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4 text-xs sm:text-sm">
                    <div>
                      <p className="font-medium">{record.date}</p>
                      <p className="text-xs text-muted-foreground">{record.time}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs sm:text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${record.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium whitespace-nowrap">{record.score}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs sm:text-sm">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
