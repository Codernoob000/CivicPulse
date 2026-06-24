import { useState, useEffect } from "react";
import { Award, BarChart3, AlertTriangle, FileText, CheckCircle, Copy, Check, Loader2, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue, DashboardStats } from "../types";

interface ImpactPageProps {
  issues: Issue[];
  stats: DashboardStats;
}

export default function ImpactPage({ issues, stats }: ImpactPageProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Community Score formula: (resolved / total * 100) + (totalUpvotes * 2), capped at 1000
  const totalUpvotes = issues.reduce((acc, curr) => acc + curr.upvotes, 0);
  const resolutionRate = stats.totalIssues > 0 ? (stats.resolvedIssues / stats.totalIssues) * 100 : 0;
  const communityScoreRaw = Math.round(resolutionRate + (totalUpvotes * 2));
  const communityScore = stats.totalIssues > 0 ? Math.min(communityScoreRaw, 1000) : 0;

  // Generate Area Report via Express + Gemini
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setReportText(data.report);
        setShowReportModal(true);
      } else {
        alert("Unable to generate AI report at this time. Please try again later.");
      }
    } catch (err) {
      console.error("Failed to generate report:", err);
      alert("Error generating report. Check connection.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Copy to Clipboard
  const handleCopyReport = () => {
    if (reportText) {
      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Timeline calculation: Last 5 reports
  const recentReports = [...issues].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Timeago helper for timeline
  const getTimeAgo = (dateStr: string) => {
    const elapsed = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSeverityBadgeColor = (severity: number) => {
    if (severity <= 2) return "bg-emerald-500";
    if (severity === 3) return "bg-amber-500";
    if (severity === 4) return "bg-orange-500";
    return "bg-rose-500";
  };

  // Categories list to build horizontal bars
  const categoriesList = ["Pothole", "Broken Streetlight", "Water Leakage", "Waste Dump", "Damaged Road", "Sewage", "Other"];
  const maxCategoryCount = Math.max(...categoriesList.map(cat => stats.categoryCounts[cat] || 0), 1);

  // Count severity levels
  const severityCounts = [0, 0, 0, 0, 0]; // Index 0 is severity 1, index 4 is severity 5
  issues.forEach(i => {
    if (i.severity >= 1 && i.severity <= 5) {
      severityCounts[i.severity - 1]++;
    }
  });

  return (
    <div id="impact-page" className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-black/[0.06] pb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 block mb-2">
            MUNICIPAL STATISTICAL REGISTER
          </span>
          <h1 className="text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">Community Impact</h1>
          <p className="text-sm text-[#1A1A1A]/60 mt-1 font-serif italic">Real-time statistics of municipal resolution and community safety index.</p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || issues.length === 0}
          className="flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] font-bold text-[10px] uppercase tracking-[0.25em] py-3.5 px-6 rounded-none transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="animate-spin" size={13} />
              Generating Report...
            </>
          ) : (
            <>
              <FileText size={13} />
              Generate Area Report
            </>
          )}
        </button>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Issues */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-[48px] font-serif select-none text-black/[0.02] font-bold">
            TOT
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">Total Registered</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#1A1A1A] font-mono">
              {stats.totalIssues}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 font-mono">reports</span>
          </div>
        </div>

        {/* Card 2: Resolved Issues */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-[48px] font-serif select-none text-black/[0.02] font-bold">
            RES
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">Resolved Entries</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-emerald-700 font-mono">
              {stats.resolvedIssues}
            </span>
            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider font-mono">
              ({Math.round(resolutionRate)}%)
            </span>
          </div>
        </div>

        {/* Card 3: Avg Severity */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-[48px] font-serif select-none text-black/[0.02] font-bold">
            SEV
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">Avg Severity Rating</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-amber-600 font-mono">
              {stats.avgSeverity}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 font-mono">/ 5.0 score</span>
          </div>
        </div>

        {/* Card 4: Community Score */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-[48px] font-serif select-none text-black/[0.02] font-bold">
            SCR
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">Community Score</p>
            <Award size={13} className="text-[#B86B4D]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#B86B4D] font-mono">
              {communityScore}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 font-mono">/ 1000 pts</span>
          </div>
        </div>
      </div>

      {/* Grid of Chart Analysis and Recent Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Side: Charts */}
        <div className="lg:col-span-7 space-y-8">
          {/* Category Breakdown (Horizontal pure CSS bar chart) */}
          <div className="bg-white border border-black/[0.08] rounded-none p-8 shadow-sm space-y-6 relative">
            <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06]">
              <BarChart3 className="text-[#B86B4D]" size={16} />
              <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-[#1A1A1A]">Distribution by Category</h2>
            </div>

            <div className="space-y-5">
              {categoriesList.map(category => {
                const count = stats.categoryCounts[category] || 0;
                const pct = (count / maxCategoryCount) * 100;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">{category}</span>
                      <span className="font-mono text-[#B86B4D] font-bold text-[11px]">{count} reports</span>
                    </div>
                    <div className="h-1.5 bg-[#F4F1EA] rounded-none overflow-hidden">
                      <div
                        className="h-full bg-[#B86B4D] rounded-none transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white border border-black/[0.08] rounded-none p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06]">
              <AlertTriangle className="text-[#B86B4D]" size={16} />
              <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-[#1A1A1A]">Severity Index Metrics</h2>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                { level: 1, label: "Minor", bg: "bg-emerald-50 text-emerald-800 border-emerald-100" },
                { level: 2, label: "Moderate", bg: "bg-teal-50 text-teal-800 border-teal-100" },
                { level: 3, label: "High", bg: "bg-amber-50 text-amber-800 border-amber-100" },
                { level: 4, label: "Critical", bg: "bg-orange-50 text-orange-800 border-orange-100" },
                { level: 5, label: "Emergency", bg: "bg-rose-50 text-rose-800 border-rose-100" }
              ].map(({ level, label, bg }) => {
                const count = severityCounts[level - 1];
                return (
                  <div key={level} className={`border p-3 text-center rounded-none shadow-sm ${bg}`}>
                    <span className="block text-2xl font-bold font-mono">{count}</span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider mt-1 opacity-70">Lvl {level}</span>
                    <span className="block text-[8px] opacity-60 font-serif italic truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline Activity */}
        <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-none p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06]">
            <Clock className="text-[#B86B4D]" size={16} />
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-[#1A1A1A]">Recent Activity Feed</h2>
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-[#1A1A1A]/40 text-xs font-serif italic">Start reporting issues to unlock the feed timeline.</p>
            </div>
          ) : (
            <div className="relative pl-5 border-l border-[#1A1A1A]/10 space-y-8">
              {recentReports.map((item) => (
                <div key={item.id} className="relative space-y-1.5">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${getSeverityBadgeColor(item.severity)}`} />

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-mono font-bold text-[#B86B4D] bg-[#F4F1EA] px-2 py-0.5 rounded-none border border-black/[0.05]">
                      {item.id}
                    </span>
                    <span className="text-[10px] font-bold uppercase opacity-40 font-mono">
                      {getTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">{item.title}</h4>
                  <p className="text-[11px] text-[#1A1A1A]/70 line-clamp-2 leading-relaxed font-serif italic">
                    {item.description}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider font-bold opacity-40">
                    Category: <span className="opacity-100 font-sans text-[#1A1A1A]">{item.category}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Styled Gemini AI Report Modal Dialog */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl w-full bg-white border border-black/[0.12] rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
            >
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-[96px] font-serif select-none text-black/[0.01] font-bold">
                REP
              </div>
              <div className="px-6 py-4 border-b border-black/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="text-xs uppercase tracking-[0.25em] font-bold text-[#1A1A1A]">AI-Generated Civic Report</h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition p-1.5 hover:bg-[#F4F1EA]"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-4 text-[#1A1A1A]/80 text-xs leading-relaxed font-serif italic">
                {reportText ? (
                  reportText.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))
                ) : (
                  <p className="text-[#1A1A1A]/40">No report content received.</p>
                )}
              </div>

              <div className="px-6 py-4 bg-[#F4F1EA]/55 border-t border-black/[0.08] flex items-center justify-end gap-3">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] py-2 px-4 rounded-none transition"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy Report"}
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-[10px] uppercase tracking-wider font-bold bg-white hover:bg-[#F4F1EA] border border-black/[0.08] text-[#1A1A1A] py-2 px-4 rounded-none transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
