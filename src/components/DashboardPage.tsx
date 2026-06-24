import React, { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Flame, ThumbsUp, MapPin, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Issue, Hotspot } from "../types";

// Setup API Key access based on skill constitution
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY !== "";

interface DashboardPageProps {
  issues: Issue[];
  hotspots: Hotspot[];
  onIssueUpvoted: () => void;
}

export default function DashboardPage({ issues, hotspots, onIssueUpvoted }: DashboardPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Map center defaults to Hyderabad
  const [mapCenter, setMapCenter] = useState({ lat: 17.3850, lng: 78.4867 });
  const [mapZoom, setMapZoom] = useState(13);

  // Helper: Severity colors matching Phase 3
  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return "#22C55E"; // Green
    if (severity === 3) return "#F59E0B"; // Yellow
    if (severity === 4) return "#F97316"; // Orange
    return "#EF4444"; // Red (5)
  };

  const getSeverityLabelClass = (severity: number) => {
    if (severity <= 2) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (severity === 3) return "bg-amber-50 text-amber-800 border-amber-200";
    if (severity === 4) return "bg-orange-50 text-orange-800 border-orange-200";
    return "bg-rose-50 text-rose-800 border-rose-200";
  };

  // Filter Issues
  const filteredIssues = issues.filter((issue) => {
    if (selectedCategory === "All") return true;
    if (selectedCategory === "Other") return issue.category === "Other";
    return issue.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  // Handle Upvote action
  const handleUpvote = async (issueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/upvote/${issueId}`, {
        method: "POST",
      });
      if (response.ok) {
        onIssueUpvoted();
      }
    } catch (err) {
      console.error("Failed to upvote:", err);
    }
  };

  // Zoom and Pan to an Issue
  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setMapCenter({ lat: issue.lat, lng: issue.lng });
    setMapZoom(15);
  };

  // Custom Light Mode / Warm Beige styling for Google Maps matching Artistic Flair
  const artisticLightMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#F4F1EA" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 2 }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#1A1A1A" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#B86B4D" }, { weight: 1.5 }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#EAE6D9" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#1A1A1A" }, { opacity: 0.6 }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#D2DBD0" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#FFFFFF" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#EAE6D9" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#DDD8C9" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#C6D3E3" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#1A1A1A" }, { opacity: 0.5 }],
    },
  ];

  return (
    <div id="dashboard-page" className="flex flex-col h-[calc(100vh-80px)]">
      {/* Category Filter Pills and Layer Toggles */}
      <div className="bg-white border-b border-black/[0.08] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Pothole", "Streetlight", "Water", "Waste", "Other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[10px] uppercase tracking-wider px-4 py-2 font-bold transition cursor-pointer border rounded-none ${
                selectedCategory === cat
                  ? "bg-[#1A1A1A] border-[#1A1A1A] text-[#F4F1EA] shadow-sm"
                  : "bg-white border-black/[0.08] text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              {cat === "Streetlight" ? "💡 Streetlight" : cat === "Pothole" ? "🕳️ Pothole" : cat === "Water" ? "💧 Water" : cat === "Waste" ? "🗑️ Waste" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`text-[10px] uppercase tracking-wider flex items-center gap-2 px-4 py-2 border rounded-none font-bold transition cursor-pointer ${
              showHeatmap
                ? "bg-[#B86B4D] border-[#B86B4D] text-[#F4F1EA]"
                : "bg-white border-black/[0.08] text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            }`}
          >
            {showHeatmap ? <EyeOff size={11} /> : <Eye size={11} />}
            {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
          </button>
        </div>
      </div>

      {/* Main Map Content - 65% height */}
      <div className="h-[60%] w-full relative bg-[#F4F1EA] border-b border-black/[0.08]">
        {!hasValidKey ? (
          // Splendid Map key splash screen as required by skill constitution Rule 1C - aligned with Art theme
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#F4F1EA]">
            <div className="max-w-md w-full bg-white border border-black/[0.08] rounded-none p-8 text-center space-y-6 shadow-[30px_30px_60px_rgba(0,0,0,0.03)] relative">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 text-[56px] font-serif select-none text-black/[0.02] font-bold">
                MAP
              </div>
              <div className="w-14 h-14 rounded-full bg-black/[0.03] flex items-center justify-center mx-auto text-[#B86B4D]">
                <MapPin size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-wider text-[#1A1A1A]">Google Maps Credentials Required</h3>
                <p className="text-xs text-[#1A1A1A]/60 font-serif italic leading-relaxed">
                  To overlay digital topography, enter your key inside the <strong>Settings &gt; Secrets</strong> dashboard.
                </p>
              </div>

              <div className="text-left bg-[#F4F1EA] border border-black/[0.06] p-5 space-y-3 text-xs text-[#1A1A1A]/80 font-serif">
                <p className="font-bold font-sans uppercase text-[9px] tracking-widest text-[#1A1A1A]/60">Integration Protocol:</p>
                <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed">
                  <li>Acquire key credentials: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-[#B86B4D] underline font-bold">Google Cloud Platform</a></li>
                  <li>In AI Studio: Open <strong>Settings</strong> (⚙️ top-right) → <strong>Secrets</strong></li>
                  <li>Assign name: <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                  <li>Paste token values and register.</li>
                </ol>
              </div>

              <p className="text-[10px] uppercase tracking-wider font-bold opacity-30">Automatic refresh occurs upon key validation.</p>
            </div>
          </div>
        ) : (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              center={mapCenter}
              zoom={mapZoom}
              onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
              onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
              mapId="CIVICPULSE_MAP_LIGHT"
              options={{
                styles: artisticLightMapStyle,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%" }}
            >
              {/* Hotspot overlays */}
              {hotspots.map((h, i) => (
                <AdvancedMarker key={`hotspot-${i}`} position={{ lat: h.lat, lng: h.lng }}>
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#B86B4D]/10 border-2 border-[#B86B4D]/40 animate-pulse flex items-center justify-center">
                      <Flame size={18} className="text-[#B86B4D] animate-bounce" />
                    </div>
                    <span className="font-mono text-[9px] font-bold text-[#B86B4D] bg-white border border-black/[0.08] px-2 py-0.5 rounded-none shadow-sm mt-1 whitespace-nowrap">
                      🔥 HOTSPOT ({h.count} reports)
                    </span>
                  </div>
                </AdvancedMarker>
              ))}

              {/* Glowing Heatmap Layer toggled */}
              {showHeatmap &&
                filteredIssues.map((issue) => (
                  <AdvancedMarker key={`heat-${issue.id}`} position={{ lat: issue.lat, lng: issue.lng }}>
                    <div
                      className="rounded-full blur-xl animate-pulse pointer-events-none"
                      style={{
                        width: `${issue.severity * 28}px`,
                        height: `${issue.severity * 28}px`,
                        backgroundColor: getSeverityColor(issue.severity),
                        opacity: 0.22,
                      }}
                    />
                  </AdvancedMarker>
                ))}

              {/* Standard Marker Plots */}
              {!showHeatmap &&
                filteredIssues.map((issue) => (
                  <AdvancedMarker
                    key={issue.id}
                    position={{ lat: issue.lat, lng: issue.lng }}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <Pin
                      background={getSeverityColor(issue.severity)}
                      borderColor="#FFFFFF"
                      glyphColor="#fff"
                    />
                  </AdvancedMarker>
                ))}

              {/* Map InfoWindow */}
              {selectedIssue && (
                <InfoWindow
                  position={{ lat: selectedIssue.lat, lng: selectedIssue.lng }}
                  onCloseClick={() => setSelectedIssue(null)}
                >
                  <div className="text-[#1A1A1A] p-2 max-w-xs font-sans text-xs bg-white">
                    <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-black/[0.05]">
                      <span className="bg-[#1A1A1A] text-white text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-none uppercase">
                        {selectedIssue.category}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-bold uppercase ${
                        selectedIssue.severity >= 4 ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        S{selectedIssue.severity}: {selectedIssue.severityLabel}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">{selectedIssue.title}</h4>
                    <p className="text-[#1A1A1A]/70 mb-2 leading-relaxed font-serif italic">{selectedIssue.description}</p>
                    <div className="border-t border-black/[0.05] pt-1.5 space-y-0.5 text-[#1A1A1A]/60 font-serif">
                      <p><strong>Department:</strong> {selectedIssue.department}</p>
                      <p><strong>Timeline:</strong> {selectedIssue.estimatedResolutionDays} days ({selectedIssue.priority})</p>
                      <p className="text-[#1A1A1A]/30 font-mono text-[9px] mt-1.5 uppercase">ID: {selectedIssue.id}</p>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}
      </div>

      {/* Reports List Area - 40% height */}
      <div className="h-[40%] bg-[#F4F1EA] flex flex-col">
        <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-black/[0.08] shadow-sm">
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#1A1A1A]">
            Current Submissions ({filteredIssues.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-black/[0.06] px-6 py-2 bg-[#F4F1EA]/35">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[#1A1A1A]/40 text-xs font-serif italic">No registrations matching this category parameter.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => handleSelectIssue(issue)}
                className={`group py-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/40 transition px-3 rounded-none ${
                  selectedIssue?.id === issue.id ? "bg-white border-l-4 border-[#B86B4D] shadow-sm" : ""
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[9px] text-[#B86B4D] font-bold uppercase">{issue.id}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white text-[#1A1A1A] border border-black/[0.06]">
                      {issue.category}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-none border ${getSeverityLabelClass(issue.severity)}`}>
                      S{issue.severity}: {issue.severityLabel}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#B86B4D] uppercase tracking-tight">{issue.title}</h4>
                  <p className="text-xs text-[#1A1A1A]/60 line-clamp-1 max-w-2xl font-serif italic">{issue.description}</p>
                  <div className="text-[10px] text-[#1A1A1A]/50 flex items-center gap-3 font-serif">
                    <span>Dept: <strong className="text-[#1A1A1A] font-bold font-sans uppercase text-[9px] tracking-wider">{issue.department}</strong></span>
                    <span>•</span>
                    <span>Timeline: <strong className="text-[#1A1A1A] font-bold font-sans uppercase text-[9px] tracking-wider">{issue.estimatedResolutionDays} days</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch">
                  <button
                    onClick={(e) => handleUpvote(issue.id, e)}
                    className="flex items-center gap-2 text-[10px] font-mono bg-white hover:bg-[#F4F1EA] border border-black/[0.08] text-[#1A1A1A] px-3 py-1.5 rounded-none transition shadow-sm cursor-pointer"
                  >
                    <ThumbsUp size={10} className="text-[#B86B4D]" />
                    <span className="font-bold">{issue.upvotes}</span>
                  </button>
                  <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase">
                    {new Date(issue.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
