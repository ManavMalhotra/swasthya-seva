"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/20/solid";

const timeFilters = ["1d", "1w", "1m", "3m", "All Time"];

const HealthScoreGraph = () => {
  const [activeFilter, setActiveFilter] = useState("All Time");

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg mb-6">
          <p className="text-gray-400">Space for Graph</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusIcon className="h-8 w-8 text-indigo-500" strokeWidth={3} />

            <p className="text-3xl font-bold text-gray-800">
              96.28 %
              <span className="ml-3 text-base font-medium text-gray-500">
                Health Score
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full">
            {timeFilters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={`
                  rounded-full
                  ${
                    activeFilter === filter
                      ? "bg-blue-500 hover:bg-blue-600 text-white shadow"
                      : "text-gray-600 hover:bg-white"
                  }
                `}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthScoreGraph;
