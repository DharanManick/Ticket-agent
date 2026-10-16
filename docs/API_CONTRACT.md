# Ticket Audit Agent — API Contract & Backend Specification

This document defines the complete REST API contract and Server-Sent Events (SSE) interfaces for the Ticket Audit Agent backend. Designed as the definitive reference for UI integration and frontend client development.

---

## 1. Global Conventions

### Base URL & Transport
- **Default Base URL**: `http://localhost:3000`
- **Transport**: HTTP/1.1 with Server-Sent Events (SSE) for real-time telemetry and sync notifications.
- **Content Type**: `application/json; charset=utf-8` for all REST endpoints.

### Request Headers
| Header | Type | Description | Required |
|---|---|---|:---:|
| `Content-Type` | `string` | Must be `application/json` for `POST` / `PUT` requests with a body. | Yes |
| `X-Request-Id` | `string` | Optional client-generated UUID for distributed tracing. If omitted, the backend generates one. | No |

### Response Headers
| Header | Description | Example |
|---|---|---|
| `X-Request-Id` | Unique request trace identifier for logging and debugging. | `req_1729123456_a8f9c2` |
| `X-Response-Time` | Total backend processing duration. | `14ms` |
| `Access-Control-Allow-Origin` | Permitted cross-origin origin (defaults to `*`). | `*` |

### Standard Error Response Format
All 4xx and 5xx responses strictly adhere to the following schema:
```json
{
  "error": {
    "code": "BAD_REQUEST" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR",
    "message": "Human-readable description of what failed.",
    "traceId": "req_1729123456_a8f9c2"
  }
}
```

---

## 2. System & Observability Endpoints

### `GET /api/health`
Checks server health, uptime, and active service statuses.

- **Auth**: None
- **Response** (`200 OK`):
```json
{
  "status": "ok",
  "uptimeSeconds": 1420,
  "timestamp": "2026-10-17T00:25:00.000Z",
  "traceId": "req_1729123456_a8f9c2",
  "version": "1.0.0",
  "services": {
    "geminiConfigured": true,
    "geminiModel": "gemini-3.8-flash",
    "servicenowInstance": "https://dev423209.service-now.com",
    "servicenowOnlyResolved": true,
    "autoSyncActive": true
  }
}
```

---

### `GET /api/usage/stats`
Retrieves live operational metrics, including LLM token consumption, estimated API cost, latency averages, and ServiceNow API call counts.

- **Auth**: None
- **Response** (`200 OK`):
```json
{
  "llm": {
    "totalCalls": 42,
    "promptTokens": 14200,
    "responseTokens": 3800,
    "estimatedCostUsd": 0.002205,
    "averageLatencyMs": 1850,
    "successRate": 100,
    "modelBreakdown": {
      "gemini-3.8-flash": 40,
      "gemini-3.5-flash-lite": 2
    },
    "recentCalls": [
      {
        "id": "llm_1729123456_123",
        "timestamp": "2026-10-17T00:24:00.000Z",
        "model": "gemini-3.8-flash",
        "task": "Audit compliance analysis for INC0012345",
        "tokens": 420,
        "latencyMs": 1420,
        "status": "Success"
      }
    ]
  },
  "servicenow": {
    "totalRequests": 18,
    "successRequests": 18,
    "failedRequests": 0,
    "averageResponseTimeMs": 240,
    "lastSyncTimestamp": "2026-10-17T00:23:45.000Z",
    "endpointBreakdown": { "incident": 14, "kb_knowledge": 4 },
    "recentRequests": []
  }
}
```

---

## 3. ServiceNow Integration Endpoints

### `GET /api/servicenow/credentials`
Retrieves the active ServiceNow connection settings. Passwords are automatically masked.

- **Response** (`200 OK`):
```json
{
  "success": true,
  "credentials": {
    "instanceName": "https://dev423209.service-now.com",
    "username": "admin",
    "password": "********",
    "limit": 10,
    "syncType": "all",
    "useSimulator": false,
    "autoSyncEnabled": true,
    "autoFetchEnabled": true,
    "autoFetchInterval": 5,
    "assignmentGroupFilter": "ALL",
    "onlyResolved": true,
    "manualLoadEnabled": false,
    "trackedGroups": ["Desktop Support", "Network Infrastructure"]
  }
}
```

---

### `POST /api/servicenow/credentials`
Updates connection and synchronization settings. If the client submits `password: "********"`, the backend retains the existing secret without overwriting.

- **Request Body**:
```json
{
  "instanceName": "https://dev423209.service-now.com",
  "username": "admin",
  "password": "newPasswordOrKeepMasked",
  "limit": 10,
  "syncType": "all",
  "useSimulator": false,
  "autoSyncEnabled": true,
  "autoFetchEnabled": true,
  "autoFetchInterval": 5,
  "assignmentGroupFilter": "ALL",
  "onlyResolved": true,
  "manualLoadEnabled": false,
  "trackedGroups": ["Desktop Support"]
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "credentials": {
    "instanceName": "https://dev423209.service-now.com",
    "username": "admin",
    "password": "********",
    "limit": 10,
    "onlyResolved": true
  }
}
```

---

### `POST /api/servicenow/sync`
Triggers an immediate background polling sweep against the configured ServiceNow instance.

- **Request Body**: `{}`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Manual ServiceNow sync cycle initiated.",
  "status": "In Progress"
}
```

---

### `POST /api/servicenow/toggle-resolved`
Instantly toggles workspace filtering between "Resolved incidents only" and "All incidents".

- **Request Body**:
```json
{
  "onlyResolved": true
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "onlyResolved": true,
  "message": "Workspace filtering set strictly to Resolved incidents."
}
```

---

### `GET /api/servicenow/fetch-logs`
Returns the recent sync and polling history logs.

- **Response** (`200 OK`):
```json
{
  "success": true,
  "logs": [
    {
      "id": "fetch_1729123400",
      "timestamp": "2026-10-17T00:23:00.000Z",
      "triggerType": "auto",
      "tables": ["incident"],
      "recordsFetched": 8,
      "recordsIngested": 8,
      "status": "success"
    }
  ]
}
```

---

## 4. Ticket Auditing & Compliance Endpoints

### `POST /api/audit/ticket`
Performs an instant multi-dimensional compliance audit on an individual ticket against configured ITIL rules.

- **Request Body**:
```json
{
  "ticket": {
    "number": "INC0012345",
    "shortDescription": "Microsoft Outlook crashes immediately on startup with Event 1000",
    "resolutionDescription": "Cleared Windows Credential Manager and performed Online Repair.",
    "state": "Resolved",
    "incidentState": "6",
    "closeNotes": "Runbook KB0010928 applied successfully.",
    "affectedCi": "Outlook 365 Client",
    "assignedGroup": "Desktop Support",
    "activityLogs": "New -> In Progress -> Resolved"
  }
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "report": {
    "ticketNumber": "INC0012345",
    "auditScore": 100,
    "scoreColor": "Green",
    "status": "COMPLIANT",
    "infractions": [],
    "ruleResults": [
      {
        "ruleId": "rule_activity_log",
        "ruleName": "ITIL State Invariant Transition",
        "passed": true,
        "score": 20,
        "detail": "Incident transitioned into Resolved prior to closure."
      },
      {
        "ruleId": "rule_word_count",
        "ruleName": "Resolution Description Depth",
        "passed": true,
        "score": 20,
        "detail": "Description length (62 chars) satisfies minimum threshold."
      }
    ],
    "citations": ["KB0010928"],
    "confidenceScore": 0.98,
    "traceId": "req_1729123456_a8f9c2"
  }
}
```

---

### `POST /api/audit/remediation`
Calls Gemini LLM to generate actionable remediation guidance and coaching tips for an analyst who submitted a non-compliant ticket.

- **Request Body**:
```json
{
  "ticketNumber": "INC0099999",
  "shortDescription": "VPN dropped",
  "resolutionDescription": "fixed it",
  "infractions": [
    "Resolution description is skeletal (under 20 characters)",
    "Missing mandatory Knowledge Base article reference"
  ]
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "advice": {
    "executiveSummary": "Ticket INC0099999 fails ITIL documentation compliance due to missing root cause and runbook references.",
    "correctiveActions": [
      "Expand resolution description with technical cause (MTU packet fragmentation over PPPoE).",
      "Document specific remediation command executed (netsh interface ipv4 set subinterface mtu=1350).",
      "Link approved Knowledge Base runbook [KB0010411]."
    ],
    "recommendedCloseNotes": "Identified MTU packet fragmentation on remote client. Adjusted AnyConnect client profile MTU to 1350 per corporate runbook KB0010411. Verified tunnel stability with 1322 byte continuous ping.",
    "coachingTips": "Always record root cause diagnostics to allow future automation engineers to detect repeating network hardware faults."
  },
  "sources": [
    {
      "id": "KB0010411",
      "title": "Cisco AnyConnect VPN MTU and Tunnel Drop Troubleshooting"
    }
  ],
  "traceId": "req_1729123456_a8f9c2"
}
```

---

## 5. Notifications & Alerting Endpoints

### `POST /api/dispatch-teams-webhook`
Sends an Adaptive Card or infraction alert payload to a Microsoft Teams incoming webhook. Protected by server-side SSRF validation.

- **Request Body**:
```json
{
  "webhookUrl": "https://outlook.office.com/webhook/...",
  "payload": {
    "@type": "MessageCard",
    "summary": "Compliance Infraction Alert",
    "themeColor": "D63B3B",
    "title": "Incident Audit Infraction: INC0099999",
    "text": "Ticket was closed with zero Knowledge Base citation."
  }
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "status": 200,
  "message": "Teams webhook dispatched successfully."
}
```
- **Error Response** (`400 Bad Request` if private IP / cloud metadata is supplied):
```json
{
  "success": false,
  "error": "Invalid webhook destination: Private or cloud metadata IP addresses are prohibited",
  "traceId": "req_1729123456_a8f9c2"
}
```

---

### `POST /api/send-email`
Sends audit infraction reports or executive digests via SMTP. Enforces recipient domain allowlists and blocks CRLF header injection.

- **Request Body**:
```json
{
  "to": "analyst@enterprise.com",
  "cc": "manager@enterprise.com",
  "subject": "Notice: Compliance Infraction for Ticket INC0099999",
  "body": "Please review your ticket resolution notes.",
  "html": "<h3>Audit Infraction</h3><p>Resolution description did not meet standards.</p>",
  "useSimulator": false
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "messageId": "<guid@enterprise.com>",
  "message": "Direct email sent successfully via SMTP (smtp.office365.com)!"
}
```

---

## 6. Real-Time Streaming: Server-Sent Events (SSE)

### `GET /api/events`
Establishes a persistent SSE connection for live updates, sync progress, and infraction broadcasts.

- **Headers**:
  - `Accept: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Events Emitted**:

#### `event: servicenow_sync`
Emitted whenever a background or manual ServiceNow polling cycle completes.
```
event: servicenow_sync
data: {"type":"sync_complete","newTicketsCount":3,"totalActive":45,"timestamp":"2026-10-17T00:26:00.000Z"}
```

#### `event: ticket_audited`
Emitted when an individual ticket is ingested and audited in the background.
```
event: ticket_audited
data: {"ticketNumber":"INC0012345","score":100,"color":"Green","status":"COMPLIANT"}
```

---

## 7. Frontend Integration Checklist

When building UI views against this backend:
1. **Always read `X-Request-Id`**: Inspect `res.headers.get('x-request-id')` or `data.traceId` and include it when displaying toast notifications on errors.
2. **CORS is Pre-Configured**: The backend accepts `*` origins by default; in production, configure `CORS_ORIGIN="https://your-ui-domain.corp"` in `.env`.
3. **Password Masking**: Never attempt to decrypt `********` in the UI. If a user does not change the password field, send `********` and the backend will preserve the existing secret.
4. **Timeouts**: The backend sets a 45-second timeout on ServiceNow upstream calls. Use an `AbortSignal.timeout(60000)` on long-running batch sync operations.
