import React, { useState, useRef } from "react";
import { Camera, MapPin, CheckCircle, Clock, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue } from "../types";

interface ReportPageProps {
  onNavigateToMap: () => void;
  onIssueReported: () => void;
}

export default function ReportPage({ onNavigateToMap, onIssueReported }: ReportPageProps) {
  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pipeline Animation State
  const [pipelineActive, setPipelineActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0 to 4
  const [reportedIssue, setReportedIssue] = useState<Issue | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  // Detect Geolocation
  const handleDetectLocation = () => {
    setIsDetectingLoc(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setIsDetectingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setIsDetectingLoc(false);
      },
      (error) => {
        console.error("Location detection failed:", error);
        // Fallback to central Hyderabad coordinates with a tiny random offset
        const randomOffsetLat = (Math.random() - 0.5) * 0.02;
        const randomOffsetLng = (Math.random() - 0.5) * 0.02;
        setLat((17.3850 + randomOffsetLat).toFixed(6));
        setLng((78.4867 + randomOffsetLng).toFixed(6));
        setIsDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit Issue Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) {
      alert("Please specify a location (detect or enter coordinates).");
      return;
    }

    setIsSubmitting(true);
    setPipelineActive(true);
    setActiveStep(0);
    setReportedIssue(null);

    // Prepare form data
    const formData = new FormData();
    if (file) {
      formData.append("image", file);
    }
    formData.append("description", description);
    formData.append("lat", lat);
    formData.append("lng", lng);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to report issue");
      }

      const issueData: Issue = await response.json();

      // Start the animated progression of the 4 agents
      // Intake (Step 1), Validation (Step 2), Severity (Step 3), Routing (Step 4)
      let step = 0;
      const interval = setInterval(() => {
        step += 1;
        setActiveStep(step);
        if (step >= 4) {
          clearInterval(interval);
          setReportedIssue(issueData);
          setIsSubmitting(false);
          onIssueReported();
        }
      }, 700);

    } catch (error) {
      console.error(error);
      alert("Error submitting issue report. Please check server logs.");
      setIsSubmitting(false);
      setPipelineActive(false);
    }
  };

  // Helper: Severity colors matching Phase 3 Design Rules
  const getSeverityBadgeClass = (severity: number) => {
    switch (severity) {
      case 1:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case 2:
        return "bg-teal-50 text-teal-800 border-teal-200";
      case 3:
        return "bg-amber-50 text-amber-800 border-amber-200";
      case 4:
        return "bg-orange-50 text-orange-800 border-orange-200";
      case 5:
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-50 text-slate-800 border-slate-200";
    }
  };

  return (
    <div id="report-page" className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <span className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 block mb-2">
          INCIDENT FILING REGISTRY
        </span>
        <h1 className="text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">Report a Civic Issue</h1>
        <p className="text-sm text-[#1A1A1A]/60 mt-1 font-serif italic">Engaging collective intelligence to realign public infrastructure.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 bg-white border border-black/[0.08] p-8 shadow-[30px_30px_60px_rgba(0,0,0,0.02)] rounded-none relative">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-[72px] font-serif select-none text-black/[0.02] font-bold">
            01
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload zone */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]/70 mb-3">Upload Photo Documentation</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer border border-dashed border-black/[0.12] hover:border-[#B86B4D] hover:bg-[#F4F1EA]/20 rounded-none p-10 flex flex-col items-center justify-center transition duration-200 bg-[#F4F1EA]/10"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-4 text-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-56 rounded-none mx-auto object-cover border border-black/[0.08] p-2 bg-white shadow-sm"
                    />
                    <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 flex items-center justify-center gap-2 hover:text-[#B86B4D]">
                      <RefreshCw size={11} /> Replace photographic plate
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-black/[0.03] flex items-center justify-center mx-auto text-[#B86B4D] group-hover:scale-105 transition duration-200">
                      <Camera size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest font-bold text-[#1A1A1A]">Select Image File</p>
                      <p className="text-[11px] text-[#1A1A1A]/40 font-serif italic">or drop raw photo prints directly onto this frame</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]/70">Location Coordinates</label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLoc}
                  className="text-[10px] uppercase tracking-[0.25em] font-bold flex items-center gap-2 bg-white hover:bg-[#1A1A1A] hover:text-[#F4F1EA] text-[#1A1A1A] px-4 py-2 border border-black/[0.08] transition duration-150 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isDetectingLoc ? <Loader2 className="animate-spin" size={12} /> : <MapPin size={12} />}
                  Detect Coordinates
                </button>
              </div>

              {lat && lng ? (
                <div className="bg-[#F4F1EA] border border-black/[0.06] p-4 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-bold text-[#B86B4D]">
                    LAT: {lat}° N &nbsp;//&nbsp; LNG: {lng}° E
                  </span>
                  <button
                    type="button"
                    onClick={() => { setLat(""); setLng(""); }}
                    className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 hover:text-[#1A1A1A] underline"
                  >
                    Clear coordinates
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g., 17.3850)"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-[#F4F1EA]/40 border border-black/[0.08] focus:border-[#B86B4D] focus:outline-none text-[#1A1A1A] rounded-none p-3 text-xs font-mono placeholder-[#1A1A1A]/30 transition"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g., 78.4867)"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-[#F4F1EA]/40 border border-black/[0.08] focus:border-[#B86B4D] focus:outline-none text-[#1A1A1A] rounded-none p-3 text-xs font-mono placeholder-[#1A1A1A]/30 transition"
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[#1A1A1A]/40 mt-2 font-serif italic">Provide coordinates or let the browser request telemetry.</p>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]/70 mb-3">
                Describe the issue <span className="opacity-50 font-normal italic font-serif">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicate your observation. If you uploaded an image, our multimodal curation engine will automatically map out the primary characteristics."
                className="w-full bg-[#F4F1EA]/40 border border-[#1A1A1A]/10 focus:border-[#B86B4D] focus:outline-none text-[#1A1A1A] rounded-none p-4 text-xs placeholder-[#1A1A1A]/30 font-serif leading-relaxed transition"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (!file && !description)}
              className="w-full flex items-center justify-center gap-3 bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] font-bold text-[11px] uppercase tracking-[0.4em] py-4 px-6 rounded-none transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,0.15)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Initiating Curation Stream...
                </>
              ) : (
                <>
                  Analyse & Register <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Stepper / Result Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-black/[0.08] p-8 shadow-[30px_30px_60px_rgba(0,0,0,0.02)] rounded-none min-h-[380px] flex flex-col justify-between relative">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-[72px] font-serif select-none text-black/[0.02] font-bold">
              02
            </div>

            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-[#1A1A1A] mb-8 pb-3 border-b border-black/[0.06] flex items-center gap-2">
                <span>🤖</span> Curation Pipeline
              </h2>

              {!pipelineActive ? (
                <div className="border border-dashed border-black/[0.12] rounded-none p-8 text-center flex flex-col items-center justify-center h-64 bg-[#F4F1EA]/10">
                  <p className="text-[#1A1A1A]/50 text-xs max-w-xs leading-relaxed font-serif italic">
                    Submit an active report to engage our 4-agent Gemini pipeline in real-time validation, scoring, and department assignment.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step 1: Intake */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                        activeStep >= 1 ? "bg-[#1A1A1A] text-white border-black" : "bg-[#F4F1EA] text-[#1A1A1A]/40 border-black/[0.08]"
                      }`}>
                        {activeStep >= 1 ? "✓" : "1"}
                      </div>
                      <div className="w-[1px] h-10 bg-black/[0.08]" />
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]">Intake Agent</h4>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1 font-serif italic">
                        {activeStep === 0 && "Parsing visual assets..."}
                        {activeStep >= 1 && (reportedIssue ? `Category Identified: ${reportedIssue.category}` : "Analyzing category details...")}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Validation */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                        activeStep >= 2 ? "bg-[#1A1A1A] text-white border-black" : "bg-[#F4F1EA] text-[#1A1A1A]/40 border-black/[0.08]"
                      }`}>
                        {activeStep >= 2 ? "✓" : "2"}
                      </div>
                      <div className="w-[1px] h-10 bg-black/[0.08]" />
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]">Validation Agent</h4>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1 font-serif italic">
                        {activeStep < 1 && "Pending pipeline stream..."}
                        {activeStep === 1 && "Verifying duplicates in registry..."}
                        {activeStep >= 2 && (reportedIssue ? (reportedIssue.isDuplicate ? `${reportedIssue.duplicateCount} duplicates found nearby` : "No duplicate entries logged") : "Scanning database indices...")}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Severity */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                        activeStep >= 3 ? "bg-[#1A1A1A] text-white border-black" : "bg-[#F4F1EA] text-[#1A1A1A]/40 border-black/[0.08]"
                      }`}>
                        {activeStep >= 3 ? "✓" : "3"}
                      </div>
                      <div className="w-[1px] h-10 bg-black/[0.08]" />
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]">Severity Scoring</h4>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1 font-serif italic">
                        {activeStep < 2 && "Pending pipeline stream..."}
                        {activeStep === 2 && "Scoring public hazard threat..."}
                        {activeStep >= 3 && (reportedIssue ? `Severity Rating: ${reportedIssue.severity}/5 — ${reportedIssue.severityLabel}` : "Analyzing safety impact parameters...")}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Routing */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-mono font-bold border transition ${
                        activeStep >= 4 ? "bg-[#1A1A1A] text-white border-black" : "bg-[#F4F1EA] text-[#1A1A1A]/40 border-black/[0.08]"
                      }`}>
                        {activeStep >= 4 ? "✓" : "4"}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#1A1A1A]">Routing & Timeline</h4>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1 font-serif italic">
                        {activeStep < 3 && "Pending pipeline stream..."}
                        {activeStep === 3 && "Determining responsible department..."}
                        {activeStep >= 4 && (reportedIssue ? `Assigned to: ${reportedIssue.department}, Priority: ${reportedIssue.priority}` : "Recommending resolution timeline...")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Final Issue Card Details */}
            {reportedIssue && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-8 border border-black/[0.12] bg-[#F4F1EA]/30 p-6 space-y-4 rounded-none"
              >
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                  <span className="font-mono text-[10px] font-bold text-[#B86B4D]">
                    {reportedIssue.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/40 flex items-center gap-1">
                    <Clock size={11} /> Registered
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">{reportedIssue.title}</h3>
                  <p className="text-xs text-[#1A1A1A]/70 mt-1.5 leading-relaxed font-serif italic">{reportedIssue.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-t border-black/[0.06] pt-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold opacity-40">Category</p>
                    <p className="font-bold text-[#1A1A1A] mt-0.5">{reportedIssue.category}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold opacity-40">Severity Score</p>
                    <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 mt-1 rounded-none border ${getSeverityBadgeClass(reportedIssue.severity)}`}>
                      {reportedIssue.severity}/5 ({reportedIssue.severityLabel})
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold opacity-40">Curation Department</p>
                    <p className="font-bold text-[#1A1A1A] mt-0.5">{reportedIssue.department}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold opacity-40">Target Timeline</p>
                    <p className="font-bold text-[#1A1A1A] mt-0.5">{reportedIssue.estimatedResolutionDays} Days ({reportedIssue.priority})</p>
                  </div>
                </div>

                <button
                  onClick={onNavigateToMap}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] py-3 px-4 rounded-none text-[10px] uppercase tracking-[0.25em] font-bold transition shadow-sm"
                >
                  Locate on Map <ArrowRight size={13} />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
