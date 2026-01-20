"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { auth, db } from "@/lib/firebase"; // Ensure this matches your project structure

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Loader2, Pencil, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthUser, DoctorUser, PatientUser } from "@/types";

export default function Profile() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);

  // Flattened form state for easier binding
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    bloodType: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    pincode: "",
    emergencyContact: "", // Only if accessible or we add it to schema?
  });

  // Load user + DB info
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);

      if (currentUser?.uid) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const data = snapshot.val() as AuthUser;
          setDbUser(data);

          // Map nested data to flat form
          const p = data.profile;
          // specific safe guards
          const contact = p.contact || { phone: "", email: "", address: { city: "", state: "", pincode: "" } };
          const addr = contact.address || { city: "", state: "", pincode: "" };

          setEditForm({
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            dob: p.dob || "",
            gender: p.gender || "",
            bloodType: (p as any).bloodType || "",
            phone: contact.phone || "",
            email: contact.email || currentUser.email || "",
            city: addr.city || "",
            state: addr.state || "",
            pincode: addr.pincode || "",
            emergencyContact: contact.emergencyContact || "",
          });
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Save profile changes
  const handleSave = async () => {
    if (!firebaseUser || !dbUser) return;

    try {
      // We need to update specific paths or the whole object.
      // Updating deeply nested fields without destroying others.
      // Construct the updated profile object.

      const updatedProfile = {
        ...dbUser.profile,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        dob: editForm.dob,
        gender: editForm.gender,
        bloodType: editForm.bloodType,
        contact: {
          ...dbUser.profile.contact,
          phone: editForm.phone,
          // email: editForm.email, // Usually email is not editable or handled separately
          emergencyContact: editForm.emergencyContact,
          address: {
            ...dbUser.profile.contact?.address, // Handle optional address
            city: editForm.city,
            state: editForm.state,
            pincode: editForm.pincode
          }
        }
      } as any; // Cast to any to avoid union discrimination issues during simple update

      const updates: Record<string, any> = {};
      updates[`users/${firebaseUser.uid}/profile`] = updatedProfile;

      // If we also update the public doctors node
      if (dbUser.role === 'doctor') {
        updates[`doctors/${firebaseUser.uid}/profile`] = updatedProfile; // Simplified update
        // Or map specific fields if structure differs
      }

      await update(ref(db), updates);

      // Local update
      setDbUser({ ...dbUser, profile: updatedProfile });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading)
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
      </div>
    );

  if (!firebaseUser) return <p className="p-6">You are not logged in.</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="p-8 space-y-8 shadow-sm rounded-2xl border border-gray-200 bg-white animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* HEADER */}
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 transition hover:scale-105 hover:shadow-md">
            <AvatarFallback className="text-xl bg-indigo-100 text-indigo-700">
              {firebaseUser.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {isEditing
                ? `${editForm.firstName} ${editForm.lastName}`
                : dbUser?.displayName || `${dbUser?.profile?.firstName} ${dbUser?.profile?.lastName}`}

              <Badge variant="secondary" className="text-xs px-2 py-1">
                {dbUser?.role?.toUpperCase()}
              </Badge>
            </h1>

            <p className="text-sm text-gray-500">{firebaseUser.email}</p>
            {dbUser?.role === 'patient' && <p className="text-sm text-gray-400">ID: {(dbUser as PatientUser).patientDataId}</p>}
          </div>
        </div>

        {/* PROFILE SECTION */}
        <div className="border-t pt-6 space-y-4">
          <h2 className="font-semibold text-lg">Profile Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              {isEditing ? (
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.firstName || "-"}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              {isEditing ? (
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.lastName || "-"}</p>
              )}
            </div>

            {/* DOB */}
            <div>
              <label className="text-sm font-medium text-gray-700">Date of Birth</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.dob || "-"}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium text-gray-700">Gender</label>
              {isEditing ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.gender || "-"}</p>
              )}
            </div>

            {/* Blood Type - Patient Only */}
            {dbUser?.role === 'patient' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Blood Type</label>
                {isEditing ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editForm.bloodType}
                    onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-800">{(dbUser as any).profile?.bloodType || "-"}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              {isEditing ? (
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.contact?.phone || "Not set"}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="text-sm font-medium text-gray-700">Emergency Contact</label>
              {isEditing ? (
                <Input
                  value={editForm.emergencyContact}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-800">{dbUser?.profile?.contact?.emergencyContact || "Not set"}</p>
              )}
            </div>

            {/* Address Fields */}
            <div className="sm:col-span-2 grid grid-cols-3 gap-2">
              <div className="col-span-3"><label className="text-sm font-medium text-gray-700">Address</label></div>
              {isEditing ? (
                <>
                  <Input placeholder="City" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                  <Input placeholder="State" value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} />
                  <Input placeholder="Pincode" value={editForm.pincode} onChange={e => setEditForm({ ...editForm, pincode: e.target.value })} />
                </>
              ) : (
                <p className="text-sm text-gray-800 col-span-3">
                  {dbUser?.profile?.contact?.address && (dbUser.profile.contact.address.city || dbUser.profile.contact.address.state || dbUser.profile.contact.address.pincode) ?
                    [
                      dbUser.profile.contact.address.city,
                      dbUser.profile.contact.address.state,
                      dbUser.profile.contact.address.pincode ? ` - ${dbUser.profile.contact.address.pincode}` : ""
                    ].filter(Boolean).join(", ").replace(",  -", " -")
                    : "Not set"}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex items-center justify-between pt-6 border-t">
          {!isEditing ? (
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button className="flex items-center gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}

          <Button
            variant="destructive"
            className="flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

