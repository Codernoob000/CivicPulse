import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { Issue, DashboardStats, Hotspot } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// In-memory store for issues
let issues: Issue[] = [];

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to call Gemini with a fallback model in case of temporary 503 unavailability
async function generateContentWithFallback(params: {
  model?: string;
  contents: any;
  config?: any;
}) {
  const primaryModel = params.model || "gemini-2.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";
  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (err: any) {
    console.warn(`Primary Gemini model (${primaryModel}) failed:`, err.message || err, `. Retrying with fallback model (${fallbackModel})...`);
    return await ai.models.generateContent({
      ...params,
      model: fallbackModel,
    });
  }
}

// Helper: Haversine distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. GET /api/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

// 2. POST /api/report — Combined 4-Agent Pipeline
app.post("/api/report", upload.single("image"), async (req, res) => {
  try {
    const descriptionText = req.body.description || "";
    const lat = parseFloat(req.body.lat) || 17.3850;
    const lng = parseFloat(req.body.lng) || 78.4867;

    let base64Image = "";
    let mimeType = "image/jpeg";

    if (req.file) {
      base64Image = req.file.buffer.toString("base64");
      mimeType = req.file.mimetype;
    }

    const agentLog: string[] = [];

    // ==========================================
    // AGENT 1: Intake Agent
    // ==========================================
    let intakeResult = {
      title: "Unknown Civic Issue",
      category: "Other" as any,
      description: descriptionText || "No description provided.",
      confidence: 0.5
    };

    try {
      const intakePrompt = `Analyze this civic issue photo. Extract and return a JSON object with these fields:
- "title": a short, concise description of the issue (maximum 8 words)
- "category": must be exactly one of: ["Pothole", "Broken Streetlight", "Water Leakage", "Waste Dump", "Damaged Road", "Sewage", "Other"]
- "description": a highly descriptive 2-sentence summary of the civic problem shown in the photo
- "confidence": estimate a confidence score from 0.0 to 1.0 based on how clearly the civic issue is shown and identified.

If no photo is provided, base your analysis on this text description: "${descriptionText || "Unknown issue"}"`;

      const contents: any[] = [];
      if (base64Image) {
        contents.push({
          inlineData: {
            mimeType,
            data: base64Image
          }
        });
      }
      contents.push({ text: intakePrompt });

      const intakeResponse = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ["Pothole", "Broken Streetlight", "Water Leakage", "Waste Dump", "Damaged Road", "Sewage", "Other"]
              },
              description: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["title", "category", "description", "confidence"]
          }
        }
      });

      const parsedIntake = JSON.parse(intakeResponse.text || "{}");
      if (parsedIntake.title) intakeResult.title = parsedIntake.title;
      if (parsedIntake.category) intakeResult.category = parsedIntake.category;
      if (parsedIntake.description) intakeResult.description = parsedIntake.description;
      if (parsedIntake.confidence !== undefined) intakeResult.confidence = parsedIntake.confidence;

      agentLog.push("Intake ✓");
    } catch (err: any) {
      console.error("Intake Agent Error:", err);
      intakeResult.title = descriptionText ? (descriptionText.substring(0, 40) + "...") : "Unidentified issue";
      agentLog.push("Intake ⚠ (Fallback)");
    }

    // ==========================================
    // AGENT 2: Validation Agent (Duplicate Detection)
    // ==========================================
    let isDuplicate = false;
    let duplicateCount = 0;
    let clusterId: string | null = null;
    const issueId = "CP-" + Math.floor(100000 + Math.random() * 900000);

    try {
      // Find matches of the exact same category within 300m
      const duplicates = issues.filter(issue => 
        issue.category === intakeResult.category &&
        getDistanceInMeters(lat, lng, issue.lat, issue.lng) <= 300
      );

      if (duplicates.length > 0) {
        isDuplicate = true;
        duplicateCount = duplicates.length;
        clusterId = duplicates[0].clusterId || duplicates[0].id;
      }

      agentLog.push("Validation ✓");
    } catch (err) {
      console.error("Validation Agent Error:", err);
      agentLog.push("Validation ⚠ (Skipped)");
    }

    // ==========================================
    // AGENT 3: Severity Agent
    // ==========================================
    let severityResult = {
      severity: 3,
      severityLabel: "Moderate" as any,
      reasoning: "Default moderate rating assigned due to lack of visual data context."
    };

    try {
      const severityPrompt = `Given this reported civic issue:
- Category: ${intakeResult.category}
- Title: ${intakeResult.title}
- Description: ${intakeResult.description}
- Nearby reports: ${duplicateCount}

Rate the severity on a scale of 1 to 5, where:
- 1 is a minor inconvenience (e.g., small cosmetic crack)
- 5 is an immediate public safety hazard (e.g., live sparking electric wires, deep pothole on a highway)

Return a JSON object with these exact fields:
- "severity": an integer from 1 to 5
- "severityLabel": one of: ["Low", "Moderate", "High", "Critical", "Emergency"]
- "reasoning": a brief one-sentence explanation of why you selected this severity score`;

      const severityResponse = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        contents: severityPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.INTEGER },
              severityLabel: { 
                type: Type.STRING, 
                enum: ["Low", "Moderate", "High", "Critical", "Emergency"]
              },
              reasoning: { type: Type.STRING }
            },
            required: ["severity", "severityLabel", "reasoning"]
          }
        }
      });

      const parsedSeverity = JSON.parse(severityResponse.text || "{}");
      if (parsedSeverity.severity) severityResult.severity = parsedSeverity.severity;
      if (parsedSeverity.severityLabel) severityResult.severityLabel = parsedSeverity.severityLabel;
      if (parsedSeverity.reasoning) severityResult.reasoning = parsedSeverity.reasoning;

      agentLog.push("Severity ✓");
    } catch (err) {
      console.error("Severity Agent Error:", err);
      agentLog.push("Severity ⚠ (Fallback)");
    }

    // ==========================================
    // AGENT 4: Routing Agent
    // ==========================================
    let routingResult = {
      department: "General Administration" as any,
      priority: "Routine" as any,
      estimatedResolutionDays: 14,
      actionSummary: "Dispatching team for onsite inspection."
    };

    try {
      const routingPrompt = `Determine municipal routing details for this civic issue:
- Category: ${intakeResult.category}
- Title: ${intakeResult.title}
- Description: ${intakeResult.description}
- Severity Rating: ${severityResult.severity}/5 (${severityResult.severityLabel})

Return a JSON object with these exact fields:
- "department": must be exactly one of: ["Public Works", "Roads & Infrastructure", "Water & Sewerage Board", "Municipal Solid Waste", "Electricity Board", "General Administration"]
- "priority": must be exactly one of: ["Routine", "Urgent", "Emergency"]
- "estimatedResolutionDays": integer days to resolve the issue
- "actionSummary": a single sentence explaining the immediate action that the routed department should take.`;

      const routingResponse = await generateContentWithFallback({
        model: "gemini-2.5-flash",
        contents: routingPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              department: { 
                type: Type.STRING, 
                enum: ["Public Works", "Roads & Infrastructure", "Water & Sewerage Board", "Municipal Solid Waste", "Electricity Board", "General Administration"]
              },
              priority: { 
                type: Type.STRING, 
                enum: ["Routine", "Urgent", "Emergency"]
              },
              estimatedResolutionDays: { type: Type.INTEGER },
              actionSummary: { type: Type.STRING }
            },
            required: ["department", "priority", "estimatedResolutionDays", "actionSummary"]
          }
        }
      });

      const parsedRouting = JSON.parse(routingResponse.text || "{}");
      if (parsedRouting.department) routingResult.department = parsedRouting.department;
      if (parsedRouting.priority) routingResult.priority = parsedRouting.priority;
      if (parsedRouting.estimatedResolutionDays) routingResult.estimatedResolutionDays = parsedRouting.estimatedResolutionDays;
      if (parsedRouting.actionSummary) routingResult.actionSummary = parsedRouting.actionSummary;

      agentLog.push("Routing ✓");
    } catch (err) {
      console.error("Routing Agent Error:", err);
      agentLog.push("Routing ⚠ (Fallback)");
    }

    // Prepare final composite issue
    const finalIssue: Issue = {
      id: issueId,
      title: intakeResult.title,
      category: intakeResult.category,
      description: intakeResult.description,
      confidence: intakeResult.confidence,
      lat,
      lng,
      isDuplicate,
      duplicateCount,
      clusterId,
      severity: severityResult.severity,
      severityLabel: severityResult.severityLabel,
      severityReasoning: severityResult.reasoning,
      department: routingResult.department,
      priority: routingResult.priority,
      estimatedResolutionDays: routingResult.estimatedResolutionDays,
      actionSummary: routingResult.actionSummary,
      status: "Open",
      upvotes: 0,
      photoUrl: base64Image ? `data:${mimeType};base64,${base64Image}` : null,
      createdAt: new Date().toISOString(),
      agentLog
    };

    issues.unshift(finalIssue);
    res.json(finalIssue);
  } catch (error: any) {
    console.error("Pipeline failure:", error);
    res.status(500).json({ error: "Pipeline processing failed.", details: error.message });
  }
});

// 3. GET /api/issues
app.get("/api/issues", (req, res) => {
  res.json(issues);
});

// 4. POST /api/upvote/:id
app.post("/api/upvote/:id", (req, res) => {
  const issue = issues.find(i => i.id === req.params.id);
  if (issue) {
    issue.upvotes += 1;
    res.json({ success: true, upvotes: issue.upvotes });
  } else {
    res.status(404).json({ error: "Issue not found." });
  }
});

// 5. GET /api/stats
app.get("/api/stats", (req, res) => {
  const totalIssues = issues.length;
  const openIssues = issues.filter(i => i.status === "Open").length;
  const resolvedIssues = issues.filter(i => i.status === "Resolved").length;

  const categoryCounts: Record<string, number> = {};
  let totalSeverity = 0;

  issues.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    totalSeverity += i.severity;
  });

  const avgSeverity = totalIssues > 0 ? parseFloat((totalSeverity / totalIssues).toFixed(1)) : 0;

  const stats: DashboardStats = {
    totalIssues,
    openIssues,
    resolvedIssues,
    categoryCounts,
    avgSeverity
  };

  res.json(stats);
});

// 6. GET /api/hotspots
app.get("/api/hotspots", (req, res) => {
  const hotspots: Hotspot[] = [];
  const byCategory: Record<string, Issue[]> = {};

  issues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });

  for (const [category, catIssues] of Object.entries(byCategory)) {
    const visited = new Set<string>();
    for (const issue of catIssues) {
      if (visited.has(issue.id)) continue;

      const neighbors = catIssues.filter(other => 
        getDistanceInMeters(issue.lat, issue.lng, other.lat, other.lng) <= 500
      );

      if (neighbors.length >= 3) {
        let sumLat = 0;
        let sumLng = 0;
        neighbors.forEach(n => {
          sumLat += n.lat;
          sumLng += n.lng;
          visited.add(n.id);
        });

        hotspots.push({
          lat: sumLat / neighbors.length,
          lng: sumLng / neighbors.length,
          count: neighbors.length,
          category,
          radius: 500
        });
      }
    }
  }

  res.json(hotspots);
});

// 7. POST /api/generate-report — Generates AI Summary
app.post("/api/generate-report", async (req, res) => {
  try {
    console.log(`Report generation request received. Total issues in store: ${issues.length}`);
    
    // Sort issues by createdAt descending to get the most recent ones first
    const sortedIssues = [...issues].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // Limit issues sent to maximum 8 most recent
    const recentIssues = sortedIssues.slice(0, 8);
    console.log(`Slicing to top 8 most recent issues for report generation. Count: ${recentIssues.length}`);

    const issuesJSON = JSON.stringify(recentIssues.map(i => ({
      category: i.category,
      title: i.title,
      severity: i.severity,
      severityLabel: i.severityLabel,
      department: i.department,
      status: i.status,
      upvotes: i.upvotes,
      createdAt: i.createdAt
    })));

    const reportPrompt = `You are a civic intelligence system. Based on these community issue reports: ${issuesJSON} — generate a concise 3-paragraph civic report covering: (1) the most critical issues, (2) patterns and hotspots detected, (3) recommended priority actions for the municipal corporation. Keep it factual and professional.`;

    console.log("Calling Gemini API to generate civic report...");
    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: reportPrompt,
    });

    console.log("Gemini API call returned successfully.");
    res.json({ report: response.text || "No report could be generated." });
  } catch (error: any) {
    console.error("CRITICAL Report generation failure:", error);
    res.status(500).json({ 
      error: "Failed to generate report.", 
      details: error.message || error,
      stack: error.stack
    });
  }
});

// 8. POST /api/seed — Loads 8 high-fidelity issues in Hyderabad
app.post("/api/seed", (req, res) => {
  const seedIssues: Issue[] = [
    {
      id: "CP-827134",
      title: "Major Pothole on Roadway Near Metro",
      category: "Pothole",
      description: "Extremely deep pothole directly under the Madhapur Metro pillar 17. Creating severe traffic bottleneck and hazardous conditions for two-wheelers.",
      confidence: 0.98,
      lat: 17.4483,
      lng: 78.3741,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 5,
      severityLabel: "Emergency",
      severityReasoning: "High-speed road with massive two-wheeler density. The depth of the pothole can throw riders off.",
      department: "Roads & Infrastructure",
      priority: "Emergency",
      estimatedResolutionDays: 2,
      actionSummary: "Deploy cold-mix asphalt patch team immediately tonight.",
      status: "Open",
      upvotes: 42,
      photoUrl: null,
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-449102",
      title: "Broken Streetlight Near Park Entrance",
      category: "Broken Streetlight",
      description: "The street light in front of Jubilee Hills park is completely dark. Dark stretch makes the area unsafe after sunset.",
      confidence: 0.95,
      lat: 17.4325,
      lng: 78.4075,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 2,
      severityLabel: "Low",
      severityReasoning: "A security issue but doesn't pose immediate fatal road danger. Simple fixture replacement.",
      department: "Electricity Board",
      priority: "Routine",
      estimatedResolutionDays: 5,
      actionSummary: "Dispatch maintenance van to check bulbs and circuitry.",
      status: "Open",
      upvotes: 12,
      photoUrl: null,
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-912830",
      title: "Massive Illegal Garbage Dumping",
      category: "Waste Dump",
      description: "Huge heap of household plastic waste and decaying organic matter dumped on the side of the main road near Charminar.",
      confidence: 0.99,
      lat: 17.3616,
      lng: 78.4747,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 4,
      severityLabel: "Critical",
      severityReasoning: "Severe public hygiene concern. Plastic waste is blockading rain gutters.",
      department: "Municipal Solid Waste",
      priority: "Urgent",
      estimatedResolutionDays: 3,
      actionSummary: "Route a compacting dump truck for clearing debris.",
      status: "Open",
      upvotes: 35,
      photoUrl: null,
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    // Adding duplicates near Charminar to trigger the "Hotspot circle" (3+ issues of Waste Dump within 500m)
    {
      id: "CP-912831",
      title: "Piles of Plastic Waste Near Bazaar",
      category: "Waste Dump",
      description: "Plastic bottles, bags, and commercial trash dumped right next to the walkway. Stray dogs pulling bags onto the road.",
      confidence: 0.96,
      lat: 17.3620,
      lng: 78.4752,
      isDuplicate: true,
      duplicateCount: 1,
      clusterId: "CP-912830",
      severity: 3,
      severityLabel: "Moderate",
      severityReasoning: "Secondary dumping. Contributes to local hygiene hazard.",
      department: "Municipal Solid Waste",
      priority: "Routine",
      estimatedResolutionDays: 4,
      actionSummary: "Instruct circle sweepers to clear roadside litter.",
      status: "Open",
      upvotes: 18,
      photoUrl: null,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-912832",
      title: "Overflowing Commercial Trash Bins",
      category: "Waste Dump",
      description: "Trash bins outside markets are overflowing onto public roads. Terrible stench spreading in the entire historical tourist zone.",
      confidence: 0.94,
      lat: 17.3612,
      lng: 78.4740,
      isDuplicate: true,
      duplicateCount: 2,
      clusterId: "CP-912830",
      severity: 4,
      severityLabel: "Critical",
      severityReasoning: "High tourist footfall area. Stench and rotting garbage are ecological and visual blight.",
      department: "Municipal Solid Waste",
      priority: "Urgent",
      estimatedResolutionDays: 2,
      actionSummary: "Empty commercial bins and sanitize the paving stones.",
      status: "Open",
      upvotes: 27,
      photoUrl: null,
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-208311",
      title: "Drinking Water Pipeline Burst",
      category: "Water Leakage",
      description: "Fresh water gushing out from a ruptured main supply joint in Gachibowli. Hundreds of gallons wasted per hour.",
      confidence: 0.97,
      lat: 17.4401,
      lng: 78.3489,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 4,
      severityLabel: "Critical",
      severityReasoning: "Substantial loss of purified drinking water and causing localized waterlogging on side lane.",
      department: "Water & Sewerage Board",
      priority: "Urgent",
      estimatedResolutionDays: 3,
      actionSummary: "Isolate pipeline segment and replace damaged valve collars.",
      status: "Open",
      upvotes: 56,
      photoUrl: null,
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-110294",
      title: "Sewage Water Overflowing",
      category: "Sewage",
      description: "Manhole overflowing with black sewer water in Secunderabad residential lane. Flooded the entrance of several homes.",
      confidence: 0.95,
      lat: 17.4399,
      lng: 78.4983,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 5,
      severityLabel: "Emergency",
      severityReasoning: "Untreated raw sewage flooding homes presents extreme immediate biohazard to residents.",
      department: "Water & Sewerage Board",
      priority: "Emergency",
      estimatedResolutionDays: 1,
      actionSummary: "Deploy jetting machine truck to clear line blockage instantly.",
      status: "Open",
      upvotes: 49,
      photoUrl: null,
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    },
    {
      id: "CP-748293",
      title: "Damaged Main Road Asphalt",
      category: "Damaged Road",
      description: "Road surface completely chipped off near Begumpet flyover. Exposes gravel and iron rods, puncturing vehicle tires.",
      confidence: 0.92,
      lat: 17.4448,
      lng: 78.4600,
      isDuplicate: false,
      duplicateCount: 0,
      clusterId: null,
      severity: 3,
      severityLabel: "Moderate",
      severityReasoning: "Significant damage to road top surface. Vehicles can skid, but structural support remains.",
      department: "Roads & Infrastructure",
      priority: "Urgent",
      estimatedResolutionDays: 6,
      actionSummary: "Schedule milling and hot-mix resurfacing for upcoming weekend.",
      status: "Open",
      upvotes: 21,
      photoUrl: null,
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      agentLog: ["Intake ✓", "Validation ✓", "Severity ✓", "Routing ✓"]
    }
  ];

  // Merge, ensuring no duplicates added if double seeded
  const existingIds = new Set(issues.map(i => i.id));
  seedIssues.forEach(item => {
    if (!existingIds.has(item.id)) {
      issues.push(item);
    }
  });

  res.json({ success: true, count: seedIssues.length, currentTotal: issues.length });
});

// Serve frontend assets using Vite middleware or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booted and running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Vite server failed to start:", error);
});
