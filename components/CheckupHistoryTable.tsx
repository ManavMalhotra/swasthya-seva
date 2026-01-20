"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types for incoming reports
type Report = {
  date: string;
  title: string;
  summary: string;
  filePath: string;
};

type CheckupHistoryTableProps = {
  reports: Report[];
};

// Badge styles
const StatusBadge = ({ status }: { status: string }) => {
  let baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
  if (status.toLowerCase() === "good") {
    return (
      <span className={`${baseClasses} bg-indigo-100 text-indigo-800`}>
        Good
      </span>
    );
  }
  if (status.toLowerCase() === "ok") {
    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-800`}>OK</span>
    );
  }
  if (status.toLowerCase() === "bad") {
    return (
      <span className={`${baseClasses} bg-red-100 text-red-800`}>Bad</span>
    );
  }
  return (
    <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
  );
};

const CheckupHistoryTable: React.FC<CheckupHistoryTableProps> = ({
  reports,
}) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Checkup History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                >
                  Summary
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"
                >
                  Operations
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {report.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {report.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.summary}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a
                      href={`/${report.filePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </a>
                    <a
                      href="#"
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      Delete
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckupHistoryTable;
