import { useState, useEffect } from "react";
import { AlertCircle, PlusCircle, Map as MapIcon, BarChart3, Database, Check, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReportPage from "./components/ReportPage";
import DashboardPage from "./components/DashboardPage";
import ImpactPage from "./components/ImpactPage";
import { Issue, DashboardStats, Hotspot } from "./types";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<"dashboard" | "report" | "impact">("dashboard");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIssues: 0,
    openIssues: 0,
    resolvedIssues: 0,
    categoryCounts: {},
    avgSeverity: 0,
  });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Helper to add toast notifications
  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch all backend data
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [issuesRes, statsRes, hotspotsRes] = await Promise.all([
        fetch("/api/issues"),
        fetch("/api/stats"),
        fetch("/api/hotspots")
      ]);

      if (issuesRes.ok && statsRes.ok && hotspotsRes.ok) {
        const issuesData = await issuesRes.json();
        const statsData = await statsRes.json();
        const hotspotsData = await hotspotsRes.json();

        setIssues(issuesData);
        setStats(statsData);
        setHotspots(hotspotsData);
      } else {
        console.error("API responses failed");
      }
    } catch (error) {
      console.error("Fetch data failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Seeding mock issues (Demo Mode helper)
  const handleLoadDemoData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        addToast("Demo dataset loaded: 8 Hyderabad reports added!", "success");
        await fetchData(true);
      } else {
        addToast("Failed to load seed data", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to seed data. Is the server running?", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  // Callback when a user reports a new issue
  const handleIssueReported = () => {
    addToast("Issue successfully processed by AI pipeline and logged!", "success");
    fetchData(true);
  };

  // Callback when an issue is upvoted
  const handleIssueUpvoted = () => {
    addToast("Upvote recorded!", "success");
    fetchData(true);
  };

  return (
    <div id="app-root" className="min-h-screen flex flex-col bg-[#F4F1EA] text-[#1A1A1A] border-[12px] border-white md:border-[16px]">
      {/* Navbar Container */}
      <nav className="sticky top-0 z-40 bg-white border-b border-black/[0.08] px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Logo and branding */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-40 mb-1">
              HYPERLOCAL CIVIC DIALOGUE
            </span>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-2xl tracking-tight text-[#1A1A1A] italic">
                CivicPulse
              </span>
            </div>
          </div>

          {/* Navigation Links and Seed CTA */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 border-r border-black/[0.08] pr-4">
              <button
                onClick={() => setCurrentPage("report")}
                className={`text-[11px] uppercase tracking-[0.2em] font-bold pb-1 transition-all cursor-pointer ${
                  currentPage === "report"
                    ? "border-b-2 border-[#1A1A1A] text-[#1A1A1A]"
                    : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                }`}
              >
                Report Issue
              </button>

              <button
                onClick={() => setCurrentPage("dashboard")}
                className={`text-[11px] uppercase tracking-[0.2em] font-bold pb-1 transition-all cursor-pointer ${
                  currentPage === "dashboard"
                    ? "border-b-2 border-[#1A1A1A] text-[#1A1A1A]"
                    : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                }`}
              >
                Live Map
              </button>

              <button
                onClick={() => setCurrentPage("impact")}
                className={`text-[11px] uppercase tracking-[0.2em] font-bold pb-1 transition-all cursor-pointer ${
                  currentPage === "impact"
                    ? "border-b-2 border-[#1A1A1A] text-[#1A1A1A]"
                    : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                }`}
              >
                Impact
              </button>
            </div>

            {/* Subtle Seed Data CTA */}
            <button
              onClick={handleLoadDemoData}
              disabled={isSeeding}
              className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] px-4 py-2.5 rounded-none transition disabled:opacity-40 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
            >
              {isSeeding ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Database size={11} />
              )}
              Demo Data
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            // Animated shimmering skeleton loader as requested in Phase 6
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 py-12 space-y-8"
            >
              <div className="space-y-2">
                <div className="w-1/3 h-8 animate-shimmer rounded-md" />
                <div className="w-1/4 h-4 animate-shimmer rounded-md" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="h-28 animate-shimmer rounded-none" />
                <div className="h-28 animate-shimmer rounded-none" />
                <div className="h-28 animate-shimmer rounded-none" />
                <div className="h-28 animate-shimmer rounded-none" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 h-96 animate-shimmer rounded-none" />
                <div className="lg:col-span-4 h-96 animate-shimmer rounded-none" />
              </div>
            </motion.div>
          ) : issues.length === 0 && currentPage !== "report" ? (
            // High fidelity empty states matching Phase 6 with Artistic flair
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto py-24 px-6 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-black/[0.04] flex items-center justify-center mx-auto text-[#B86B4D]">
                <Sparkles size={28} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Welcome to CivicPulse</h2>
                {currentPage === "dashboard" ? (
                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed max-w-sm mx-auto">
                    No community issues have been logged yet. Seed our mock dataset or be the first to report an issue in your area!
                  </p>
                ) : (
                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed max-w-sm mx-auto">
                    Start reporting community issues to unlock localized diagnostics and civic impact timelines.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentPage("report")}
                  className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-[#B86B4D] text-[#F4F1EA] text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 transition cursor-pointer"
                >
                  Report First Issue
                </button>
                <button
                  onClick={handleLoadDemoData}
                  className="w-full sm:w-auto bg-white hover:bg-[#F4F1EA] border border-black/[0.08] text-[#1A1A1A] text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 transition cursor-pointer"
                >
                  Load Demo Data
                </button>
              </div>
            </motion.div>
          ) : (
            // Active page rendering
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full"
            >
              {currentPage === "report" && (
                <ReportPage
                  onNavigateToMap={() => setCurrentPage("dashboard")}
                  onIssueReported={handleIssueReported}
                />
              )}
              {currentPage === "dashboard" && (
                <DashboardPage
                  issues={issues}
                  hotspots={hotspots}
                  onIssueUpvoted={handleIssueUpvoted}
                />
              )}
              {currentPage === "impact" && (
                <ImpactPage
                  issues={issues}
                  stats={stats}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Toast Notification Container */}
      <div id="toast-container" className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-4 shadow-[60px_60px_100px_rgba(0,0,0,0.06)] border text-xs font-semibold flex items-center gap-3 pointer-events-auto bg-white ${
                toast.type === "success"
                  ? "border-emerald-500/30 text-emerald-800"
                  : toast.type === "error"
                  ? "border-rose-500/30 text-rose-800"
                  : "border-black/[0.08] text-[#1A1A1A]"
              }`}
            >
              {toast.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="tracking-wide">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-black/[0.08] py-6 text-center text-[10px] text-[#1A1A1A]/40 mt-auto uppercase tracking-[0.2em] font-medium">
        CivicPulse · Digital Archiving &copy; Selected Works MCM — MMXXVI
      </footer>
    </div>
  );
}
