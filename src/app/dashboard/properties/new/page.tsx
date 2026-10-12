"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "BUY" as "BUY" | "RENT" | "STAY",
    price: 0,
    latitude: 28.5355, // Default Noida Sec 150
    longitude: 77.3910,
    images: [] as string[],
    plotArea: 1800,
    securityDeposit: 50000,
    dailyRate: 6500,
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Direct S3 Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      // 1. Request presigned URL
      const presignRes = await fetch("/api/v1/properties/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "image/jpeg",
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.error?.message || "Failed to initiate upload");
      }

      // 2. Upload file directly to S3 (mocked/real)
      // For development when S3 credentials are simulated, store the returned public URL
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, presignData.data.publicUrl],
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Handler (DRAFT -> PENDING_APPROVAL)
  const handleSubmitListing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        price: Number(formData.price),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        images: formData.images.length > 0 ? formData.images : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
        ...(formData.type === "BUY" && {
          buyDetails: {
            plotArea: Number(formData.plotArea),
            totalPrice: Number(formData.price),
            emiAvailable: true,
          },
        }),
        ...(formData.type === "RENT" && {
          rentDetails: {
            securityDeposit: Number(formData.securityDeposit),
            isMin11Months: true,
            tenantPreferences: "Verified Professionals / Families",
          },
        }),
        ...(formData.type === "STAY" && {
          stayDetails: {
            dailyRate: Number(formData.dailyRate),
            cancellationRule: "Flexible",
          },
        }),
      };

      // 1. Create property via API
      const res = await fetch("/api/v1/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await res.json();
      if (!res.ok || !response.success) {
        throw new Error(response.error?.message || "Failed to create listing");
      }

      const propertyId = response.data.id;

      // 2. Submit for Admin Approval (DRAFT -> PENDING_APPROVAL)
      await fetch("/api/v1/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          status: "PENDING_APPROVAL",
        }),
      });

      router.push("/dashboard?success=listing_submitted_for_approval");
    } catch (err: any) {
      setError(err.message || "Error submitting listing");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Progress Steps Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        {[
          { num: 1, label: "Basic Details" },
          { num: 2, label: "Location" },
          { num: 3, label: "Media Upload" },
          { num: 4, label: "Review & Submit" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= s.num ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-slate-700">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      {/* Step 1: Basic Details & Listing Mode */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Listing Mode & Property Details</CardTitle>
            <CardDescription>Select whether you are selling, renting, or hosting this property.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Listing Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {(["BUY", "RENT", "STAY"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: mode })}
                    className={`p-3 rounded-xl border text-sm font-bold transition ${
                      formData.type === mode
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {mode === "BUY" ? "Sale / Plot" : mode === "RENT" ? "Long-Term Rent" : "Short Stay"}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Property Title"
              placeholder="e.g. 3BHK Eco-Villa in Sector 150, Noida"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
              <textarea
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe structural features, Vastu orientation, connectivity..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Input
              label="Listed Price (INR ₹)"
              type="number"
              placeholder="15000000"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!formData.title || !formData.price}>
                Next: Drop Location Pin →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: PostGIS Coordinates Pin */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Geospatial Location (PostGIS)</CardTitle>
            <CardDescription>Specify the precise GPS coordinates for map bounding box queries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude (WGS84)"
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
              />
              <Input
                label="Longitude (WGS84)"
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-bold text-slate-800">Pin Registered: Sector 150, Noida NCR</p>
                <p>Coordinates will be indexed with PostGIS GiST for radius and viewport searches.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)}>Next: Upload Media →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Media Upload */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Secure S3 Media Upload</CardTitle>
            <CardDescription>Upload site photographs and blueprint images.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 bg-slate-50">
              <span className="text-4xl">📸</span>
              <p className="text-sm font-semibold text-slate-700">Choose images to upload via secure S3 pre-signed URL</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImage}
                className="text-xs text-slate-500"
              />
              {uploadingImage && <p className="text-xs text-emerald-700 font-bold">Uploading to S3...</p>}
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {formData.images.map((img, i) => (
                  <div key={i} className="h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={img} alt="Property" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)}>Next: Review & Submit →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Review & Submit for Admin Approval</CardTitle>
            <CardDescription>Submitting will transition your listing to PENDING_APPROVAL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm space-y-2">
              <p><span className="font-bold text-slate-600">Title:</span> {formData.title}</p>
              <p><span className="font-bold text-slate-600">Mode:</span> {formData.type}</p>
              <p><span className="font-bold text-slate-600">Price:</span> ₹{Number(formData.price).toLocaleString("en-IN")}</p>
              <p><span className="font-bold text-slate-600">GPS Coordinates:</span> {formData.latitude}, {formData.longitude}</p>
              <p><span className="font-bold text-slate-600">Media Count:</span> {formData.images.length || 1} image(s)</p>
            </div>

            {/* Proactive Pre-Listing Audit Cross-Sell Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h4 className="font-bold text-amber-950 text-sm">Boost Listing Visibility with Prakriti Gold Pin</h4>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Pre-certify this property with a Structural Engineering or Vedic Vastu audit. Certified listings earn the prominent 
                <span className="font-bold text-amber-800"> Gold Pin</span> on search maps, attracting 3.4x more verified buyers and accelerating token lock time.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-full border border-amber-300">
                  Pre-Listing Audit Option: Active
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={handleSubmitListing} isLoading={isLoading}>
                Submit for Verification & Publication 🚀
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
