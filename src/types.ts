export interface Issue {
  id: string;
  title: string;
  category: "Pothole" | "Broken Streetlight" | "Water Leakage" | "Waste Dump" | "Damaged Road" | "Sewage" | "Other";
  description: string;
  confidence: number;
  lat: number;
  lng: number;
  isDuplicate: boolean;
  duplicateCount: number;
  clusterId: string | null;
  severity: number;
  severityLabel: "Low" | "Moderate" | "High" | "Critical" | "Emergency";
  severityReasoning: string;
  department: "Public Works" | "Roads & Infrastructure" | "Water & Sewerage Board" | "Municipal Solid Waste" | "Electricity Board" | "General Administration";
  priority: "Routine" | "Urgent" | "Emergency";
  estimatedResolutionDays: number;
  actionSummary: string;
  status: "Open" | "Resolved";
  upvotes: number;
  photoUrl: string | null; // Data URI / base64 string
  createdAt: string;
  agentLog: string[];
}

export interface DashboardStats {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  categoryCounts: Record<string, number>;
  avgSeverity: number;
}

export interface Hotspot {
  lat: number;
  lng: number;
  count: number;
  category: string;
  radius: number;
}
