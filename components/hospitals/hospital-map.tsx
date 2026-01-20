"use client"

import { useState } from "react"
import { MapPin, Phone, MapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Hospital {
  id: number
  name: string
  address: string
  phone: string
  distance: string
  lat: number
  lng: number
}

const HOSPITALS_DATA: Hospital[] = [
  {
    id: 1,
    name: "City Heart Hospital",
    address: "123 Medical Lane, Downtown",
    phone: "+1 (555) 123-4567",
    distance: "2.5 km",
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: 2,
    name: "Central Medical Center",
    address: "456 Health Ave, Midtown",
    phone: "+1 (555) 234-5678",
    distance: "3.2 km",
    lat: 40.758,
    lng: -73.9855,
  },
  {
    id: 3,
    name: "Wellness Clinic",
    address: "789 Care Street, Uptown",
    phone: "+1 (555) 345-6789",
    distance: "1.8 km",
    lat: 40.7614,
    lng: -73.9776,
  },
  {
    id: 4,
    name: "Advanced Care Hospital",
    address: "321 Treatment Blvd, East Side",
    phone: "+1 (555) 456-7890",
    distance: "4.1 km",
    lat: 40.7489,
    lng: -73.968,
  },
  {
    id: 5,
    name: "Emergency Medical Center",
    address: "654 Emergency Rd, West Side",
    phone: "+1 (555) 567-8901",
    distance: "3.5 km",
    lat: 40.7505,
    lng: -74.0055,
  },
]

export function HospitalMap({ searchQuery }: { searchQuery: string }) {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)

  const filteredHospitals = HOSPITALS_DATA.filter(
    (hospital) =>
      hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hospital.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="w-full h-64 md:h-96 lg:h-[500px] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-border flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapIcon className="size-12 md:size-16 text-blue-400 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground text-sm md:text-base">Space for Maps</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredHospitals.length} hospital{filteredHospitals.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        {/* Hospital Markers (Visual representation) */}
        <div className="absolute inset-0">
          {filteredHospitals.map((hospital, index) => (
            <div
              key={hospital.id}
              className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
              style={{
                left: `${20 + (index % 3) * 30}%`,
                top: `${30 + Math.floor(index / 3) * 35}%`,
              }}
              onClick={() => setSelectedHospital(hospital)}
            >
              <div className="relative">
                <div
                  className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-30"
                  style={{ width: "24px", height: "24px" }}
                />
                <MapPin className="size-6 text-red-500 drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hospital List */}
      <div className="space-y-3">
        <h3 className="text-lg md:text-xl font-semibold text-foreground">
          Nearby Hospitals ({filteredHospitals.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {filteredHospitals.map((hospital) => (
            <Card
              key={hospital.id}
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedHospital?.id === hospital.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedHospital(hospital)}
            >
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm md:text-base">{hospital.name}</h4>

                <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 flex-shrink-0 mt-0.5" />
                    <span>{hospital.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="size-4 flex-shrink-0" />
                    <span>{hospital.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-primary font-medium">
                    <MapIcon className="size-4 flex-shrink-0" />
                    <span>{hospital.distance} away</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full mt-3 text-xs md:text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedHospital(hospital)
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredHospitals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hospitals found matching your search.</p>
          </div>
        )}
      </div>

      {/* Selected Hospital Details */}
      {selectedHospital && (
        <Card className="p-4 md:p-6 bg-primary/5 border-primary">
          <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3">Selected Hospital</h3>
          <div className="space-y-2 text-sm md:text-base">
            <p className="font-semibold text-foreground">{selectedHospital.name}</p>
            <p className="text-muted-foreground">{selectedHospital.address}</p>
            <p className="text-muted-foreground">{selectedHospital.phone}</p>
            <p className="text-primary font-medium">{selectedHospital.distance} away</p>
            <Button className="w-full mt-4">Get Directions</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
