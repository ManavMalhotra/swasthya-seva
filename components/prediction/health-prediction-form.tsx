"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function HealthPredictionForm() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    chestPainType: "",
    restingBP: "",
    cholesterol: "",
    fastingBloodSugar: "",
    restECG: "",
    maxHR: "",
    exerciseAngina: "",
    oldpeak: "",
    slope: "",
    ca: "",
    thal: "",
  })

  const [prediction, setPrediction] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = () => {
    return Object.values(formData).every((value) => value !== "")
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      alert("Please fill in all fields")
      return
    }

    // Simulate prediction logic
    const riskScore = Math.random() * 100
    if (riskScore < 30) {
      setPrediction("Low Risk - Your heart health appears to be good. Continue maintaining a healthy lifestyle.")
    } else if (riskScore < 70) {
      setPrediction("Moderate Risk - Consider consulting with a specialist for a detailed evaluation.")
    } else {
      setPrediction("High Risk - We recommend scheduling an appointment with a cardiologist immediately.")
    }
    setShowResult(true)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Health Assessment Form</CardTitle>
          <CardDescription>Provide your medical information for accurate prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm md:text-base">
                Age *
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm md:text-base">
                Gender *
              </Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                <SelectTrigger id="gender" className="text-sm md:text-base">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chest Pain Type */}
            <div className="space-y-2">
              <Label htmlFor="chestPainType" className="text-sm md:text-base">
                Chest Pain Type *
              </Label>
              <Select
                value={formData.chestPainType}
                onValueChange={(value) => handleInputChange("chestPainType", value)}
              >
                <SelectTrigger id="chestPainType" className="text-sm md:text-base">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typical">Typical Angina</SelectItem>
                  <SelectItem value="atypical">Atypical Angina</SelectItem>
                  <SelectItem value="nonanginal">Non-anginal Pain</SelectItem>
                  <SelectItem value="asymptomatic">Asymptomatic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resting BP */}
            <div className="space-y-2">
              <Label htmlFor="restingBP" className="text-sm md:text-base">
                Resting BP (mmHg) *
              </Label>
              <Input
                id="restingBP"
                type="number"
                placeholder="e.g., 120"
                value={formData.restingBP}
                onChange={(e) => handleInputChange("restingBP", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Cholesterol */}
            <div className="space-y-2">
              <Label htmlFor="cholesterol" className="text-sm md:text-base">
                Cholesterol (mg/dl) *
              </Label>
              <Input
                id="cholesterol"
                type="number"
                placeholder="e.g., 200"
                value={formData.cholesterol}
                onChange={(e) => handleInputChange("cholesterol", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Fasting Blood Sugar */}
            <div className="space-y-2">
              <Label htmlFor="fastingBloodSugar" className="text-sm md:text-base">
                Fasting Blood Sugar (mg/dl) *
              </Label>
              <Input
                id="fastingBloodSugar"
                type="number"
                placeholder="e.g., 100"
                value={formData.fastingBloodSugar}
                onChange={(e) => handleInputChange("fastingBloodSugar", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Rest ECG */}
            <div className="space-y-2">
              <Label htmlFor="restECG" className="text-sm md:text-base">
                Rest ECG *
              </Label>
              <Select value={formData.restECG} onValueChange={(value) => handleInputChange("restECG", value)}>
                <SelectTrigger id="restECG" className="text-sm md:text-base">
                  <SelectValue placeholder="Select ECG result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="stwaveabnormality">ST-Wave Abnormality</SelectItem>
                  <SelectItem value="lvh">Left Ventricular Hypertrophy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max HR */}
            <div className="space-y-2">
              <Label htmlFor="maxHR" className="text-sm md:text-base">
                Max Heart Rate *
              </Label>
              <Input
                id="maxHR"
                type="number"
                placeholder="e.g., 150"
                value={formData.maxHR}
                onChange={(e) => handleInputChange("maxHR", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Exercise Angina */}
            <div className="space-y-2">
              <Label htmlFor="exerciseAngina" className="text-sm md:text-base">
                Exercise Induced Angina *
              </Label>
              <Select
                value={formData.exerciseAngina}
                onValueChange={(value) => handleInputChange("exerciseAngina", value)}
              >
                <SelectTrigger id="exerciseAngina" className="text-sm md:text-base">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Oldpeak */}
            <div className="space-y-2">
              <Label htmlFor="oldpeak" className="text-sm md:text-base">
                Oldpeak (ST Depression) *
              </Label>
              <Input
                id="oldpeak"
                type="number"
                step="0.1"
                placeholder="e.g., 1.5"
                value={formData.oldpeak}
                onChange={(e) => handleInputChange("oldpeak", e.target.value)}
                className="text-sm md:text-base"
              />
            </div>

            {/* Slope */}
            <div className="space-y-2">
              <Label htmlFor="slope" className="text-sm md:text-base">
                Slope of ST Segment *
              </Label>
              <Select value={formData.slope} onValueChange={(value) => handleInputChange("slope", value)}>
                <SelectTrigger id="slope" className="text-sm md:text-base">
                  <SelectValue placeholder="Select slope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsloping">Upsloping</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="downsloping">Downsloping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CA (Number of Major Vessels) */}
            <div className="space-y-2">
              <Label htmlFor="ca" className="text-sm md:text-base">
                Major Vessels Colored (0-3) *
              </Label>
              <Select value={formData.ca} onValueChange={(value) => handleInputChange("ca", value)}>
                <SelectTrigger id="ca" className="text-sm md:text-base">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Thal */}
            <div className="space-y-2">
              <Label htmlFor="thal" className="text-sm md:text-base">
                Thalassemia Type *
              </Label>
              <Select value={formData.thal} onValueChange={(value) => handleInputChange("thal", value)}>
                <SelectTrigger id="thal" className="text-sm md:text-base">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fixed">Fixed Defect</SelectItem>
                  <SelectItem value="reversible">Reversible Defect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <AlertDialog open={showResult} onOpenChange={setShowResult}>
              <AlertDialogTrigger asChild>
                <Button
                  onClick={handleSubmit}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base py-2 md:py-3"
                >
                  Predict Health
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%] md:w-full">
                <AlertDialogTitle className="text-lg md:text-xl">Health Prediction Result</AlertDialogTitle>
                <AlertDialogDescription className="text-sm md:text-base mt-4">{prediction}</AlertDialogDescription>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <AlertDialogCancel className="text-sm md:text-base">Close</AlertDialogCancel>
                  <AlertDialogAction className="text-sm md:text-base">Schedule Appointment</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={() =>
                setFormData({
                  age: "",
                  gender: "",
                  chestPainType: "",
                  restingBP: "",
                  cholesterol: "",
                  fastingBloodSugar: "",
                  restECG: "",
                  maxHR: "",
                  exerciseAngina: "",
                  oldpeak: "",
                  slope: "",
                  ca: "",
                  thal: "",
                })
              }
              className="w-full sm:w-auto text-sm md:text-base py-2 md:py-3"
            >
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
