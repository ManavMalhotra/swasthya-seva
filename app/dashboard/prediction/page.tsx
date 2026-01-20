"use client";

import { HealthPredictionForm } from "@/components/prediction/health-prediction-form";

export default function PredictionPage() {
  return (
    <div className="flex h-screen bg-background flex-col md:flex-row">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}

        {/* Content with Chat - Stack vertically on mobile, horizontal on lg+ */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Prediction Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Know Your Heart Health
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Fill out the form below to get a quick health prediction based
                  on your medical data
                </p>
              </div>
              <HealthPredictionForm />
            </div>
          </div>

          {/* Chat Panel */}
        </div>
      </div>
    </div>
  );
}
