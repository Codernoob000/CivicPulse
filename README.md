# CivicPulse

**A hyperlocal civic issue reporting platform powered by a 4-agent AI pipeline.**

CivicPulse transforms raw citizen complaints — broken streetlights, potholes, overflowing garbage bins, and other civic issues — into verified, prioritized, and routed action items for municipal bodies. Instead of another digital complaint box, CivicPulse adds a reasoning layer that verifies reports, scores urgency, routes them to the correct department, and tracks resolution — the way a well-staffed municipal office would, if every municipal office had unlimited staff.

Built for **Vibe2Ship 2026** (Coding Ninjas × Google for Developers).

---

## Table of Contents

- [Problem](#problem)
- [Solution](#solution)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Business Model](#business-model)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

---

## Problem

Every day, citizens report the same civic issues through helplines, government apps, or social media — and most reports disappear into an unverified, unprioritized queue with no visibility into whether anyone acted on them.

Current civic reporting systems fail because they:
- Have no deduplication — the same pothole reported by 50 people becomes 50 separate, ignored tickets
- Have no urgency intelligence — a live electrical hazard is queued the same way as a faded lane marking
- Require manual, slow routing to the correct municipal department
- Offer no meaningful follow-up or resolution tracking

## Solution

CivicPulse is not a form-and-database app — it's a multi-agent AI pipeline that reasons about each report before it reaches a human. When a citizen submits a report (text, photo, and location), four specialized agents process it end-to-end:

| Agent | Responsibility |
|---|---|
| **Verification & Deduplication** | Confirms report validity and merges duplicate reports of the same issue into a single prioritized ticket |
| **Urgency & Severity Scoring** | Assesses risk level (e.g., safety hazard vs. cosmetic issue) to prioritize response |
| **Routing** | Automatically directs the ticket to the correct municipal department |
| **Lifecycle & Follow-up Tracking** | Monitors ticket status and follows up on resolution progress |

## Architecture

```
Citizen Report (text / photo / location)
            │
            ▼
   ┌─────────────────────┐
   │  Verification Agent │──► Deduplication check
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │   Urgency Scoring    │──► Severity classification
   │        Agent          │
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │   Routing Agent      │──► Department assignment
   └─────────────────────┘
            │
            ▼
   ┌─────────────────────┐
   │  Follow-up Agent     │──► Lifecycle tracking
   └─────────────────────┘
            │
            ▼
   Municipal Dashboard (prioritized, de-duplicated, routed tickets)
```

## Tech Stack

- **AI / Agent Pipeline:** Gemini 2.0 Flash (4-agent architecture)
- **Backend:** [specify framework, e.g., FastAPI / Node.js]
- **Frontend:** [specify framework, e.g., React / Next.js]
- **Database:** [specify, e.g., Firestore / PostgreSQL]
- **Deployment:** Google Cloud Run
- **Other:** [Maps/geolocation API, image storage, etc. — fill in as applicable]

## How It Works

1. A citizen submits a civic issue report via the app, including a description, photo, and location.
2. The **Verification Agent** checks the report against existing open tickets in the same area to detect duplicates and validate authenticity.
3. The **Urgency Scoring Agent** analyzes the report's content and context to assign a severity/priority level.
4. The **Routing Agent** maps the issue category to the appropriate municipal department.
5. The **Follow-up Agent** tracks the ticket's status over time and manages citizen-facing updates.
6. Municipal staff access a dashboard showing verified, prioritized, and correctly routed issues — eliminating manual triage.

## Getting Started

### Prerequisites

- [Runtime/language version, e.g., Node.js 18+ / Python 3.10+]
- Google Cloud account with Gemini API access
- [Database setup instructions]

### Installation

```bash
git clone https://github.com/[your-org]/civicpulse.git
cd civicpulse
[install dependencies command]
```

### Environment Variables

Create a `.env` file with the following:

```
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=your_database_connection_string
[other required variables]
```

### Running Locally

```bash
[start command, e.g., npm run dev / python main.py]
```

## Deployment

CivicPulse is deployed on **Google Cloud Run**.

```bash
gcloud run deploy civicpulse \
  --source . \
  --region [your-region] \
  --allow-unauthenticated
```

## Business Model

CivicPulse follows a **B2G (Business-to-Government)** model:

- **Citizens** use the reporting app free of charge to maximize adoption and report volume.
- **Municipal bodies** subscribe to a dashboard providing verified, de-duplicated, and prioritized complaint data — reducing the staff time and cost required for manual triage.

## Roadmap

- [x] Core 4-agent reporting pipeline
- [x] Cloud Run deployment
- [ ] Multi-city configuration (department mapping, localized urgency thresholds)
- [ ] Citizen-facing resolution tracking and notifications
- [ ] Analytics dashboard for municipal administrators
- [ ] Multi-language support

## Team

Built by **Codinjas** for Vibe2Ship 2026 (Coding Ninjas × Google for Developers).

- [Team member names / roles]

## License

[Specify license, e.g., MIT License — see `LICENSE` file for details]
