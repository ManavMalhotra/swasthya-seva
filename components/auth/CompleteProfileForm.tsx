"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ref, set, get } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthUser, DoctorUser, PatientUser } from "@/types";
import { Roles } from "@/types";

function generatePatientIdCandidate() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function generateUniquePatientId() {
  for (let tries = 0; tries < 5; tries++) {
    const candidate = generatePatientIdCandidate();
    const snap = await get(ref(db, `patients/${candidate}`));
    if (!snap.exists()) return candidate;
  }
  return `P${Date.now().toString(36).toUpperCase().slice(-7)}`;
}

export default function CompleteProfileForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    mobNo: "",
    occupation: "",
    height: "",
    weight: "",
    state: "",
    city: "",
    pincode: "",
    landmark: "",
  });

  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Track if we've already prefilled to prevent overwriting user-typed values
  const hasPrefilledRef = useRef(false);

  const router = useRouter();

  // Listen for auth state changes properly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Prefill name from displayName (Google sign-in) - only once
  useEffect(() => {
    if (firebaseUser?.displayName && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true;
      const parts = firebaseUser.displayName.split(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
      }));
    }
  }, [firebaseUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseUser || !firebaseUser.email) {
      setError("No authenticated user found. Please log in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const displayName = `${formData.firstName} ${formData.lastName}`.trim();

    try {
      // Shared Contact Info
      const contactInfo = {
        phone: formData.mobNo,
        email: firebaseUser.email,
        address: {
          street: "", // Form doesn't have street line, leaving empty or mapping landmark
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          landmark: formData.landmark,
        },
      };

      if (role === "doctor") {
        /** -------------------------
         *    DOCTOR PROFILE
         * ------------------------*/
        const doctorObj: DoctorUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "doctor",
          displayName, // Keeping duplicate at top level for convenience, though it's optional in BaseUser
          profile: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            specialization: formData.occupation,
            gender: formData.gender,
            dob: formData.dob,
            contact: contactInfo,
            metrics: {
              height: formData.height,
              weight: formData.weight,
            },
          },
          assignedPatients: {},
        };

        await set(ref(db, `users/${firebaseUser.uid}`), doctorObj);
        const publicDoctorRecord = {
          ...doctorObj.profile,
          uid: firebaseUser.uid,
          displayName
        };
        await set(ref(db, `doctors/${firebaseUser.uid}`), publicDoctorRecord);

      } else {
        /** -------------------------
         *    PATIENT PROFILE
         * ------------------------*/
        const patientId = await generateUniquePatientId();

        const patientObj: PatientUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "patient",
          displayName,
          patientDataId: patientId,
          profile: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dob: formData.dob,
            gender: formData.gender,
            contact: contactInfo,
          },
        };

        await set(ref(db, `users/${firebaseUser.uid}`), patientObj);
        // Create Health Record Only (Privacy separation)
        const initialHealthData = {
          height_cm: formData.height,
          weight_kg: formData.weight,
          conditions: [],
          medications: [],
          vitalsHistory: {},
          healthScoreHistory: []
        };

        await set(ref(db, `patients/${patientId}`), initialHealthData);
      }

      await firebaseUser.getIdToken(true);
      router.push("/dashboard");

    } catch (err) {
      console.error("CompleteProfile error:", err);
      setError("Failed to save profile. Please try again.");
      setIsLoading(false);
    }
  };

  if (!firebaseUser) return <div>Loading user information...</div>;

  return (
    <div className="rounded-lg border bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-gray-900">
        Complete your profile
      </h1>
      <p className="mt-1 text-gray-500">Please enter your details</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
      >
        {/* first name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 p-3"
          />
        </div>

        {/* last name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 p-3"
          />
        </div>

        {/* ROLE SELECT */}
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-gray-700">
            Please select registration type
          </p>

          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* patient */}
            <label
              className={`relative flex cursor-pointer rounded-lg border p-4 ${role === "patient"
                ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6] text-[#8B5CF6] font-semibold"
                : "border-gray-300"
                }`}
            >
              <input
                type="radio"
                name="role"
                checked={role === "patient"}
                onChange={() => setRole("patient")}
                className="sr-only"
              />
              I'm an individual / patient
            </label>

            {/* doctor */}
            <label
              className={`relative flex cursor-pointer rounded-lg border p-4 ${role === "doctor"
                ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6] text-[#8B5CF6] font-semibold"
                : "border-gray-300"
                }`}
            >
              <input
                type="radio"
                name="role"
                checked={role === "doctor"}
                onChange={() => setRole("doctor")}
                className="sr-only"
              />
              I'm a specialist / doctor
            </label>
          </div>
        </div>

        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select name="gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required className="mt-1 block w-full rounded-md border border-gray-300 p-3">
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
          <input type="tel" name="mobNo" value={formData.mobNo} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>

        {/* Doctor Specific: Occupation -> Specialization */}
        {role === "doctor" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Specialization</label>
            <input name="occupation" value={formData.occupation} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 p-3" placeholder="e.g. Cardiologist" />
          </div>
        )}

        {/* Vitals (Both can enter, or optional for doctor) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
          <input type="number" name="height" value={formData.height} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
          <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>

        {/* Address Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">City <span className="text-gray-400 text-xs">(Optional)</span></label>
          <input name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">State <span className="text-gray-400 text-xs">(Optional)</span></label>
          <input name="state" value={formData.state} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Pincode <span className="text-gray-400 text-xs">(Optional)</span></label>
          <input name="pincode" value={formData.pincode} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Landmark</label>
          <input name="landmark" value={formData.landmark} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-3" />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full justify-center rounded-md bg-[#3B82F6] py-3 px-4 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 text-center text-red-500">{error}</p>}
    </div>
  );
}
