"use client";

import { useState } from "react";
import { HospitalSearch } from "./HospitalSearch";
import { HospitalMap } from "./HospitalMap";

export function HospitalsContent() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-4 space-y-6 w-full">
      <HospitalSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <HospitalMap searchQuery={searchQuery} />
    </div>
  );
}
