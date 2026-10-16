# Changelog

All notable changes to the Ticket Audit Agent will be documented in this file.

## [Unreleased] - Group 1 Quick Wins (Security & Engineering Hardening)

### Added
- `test(TEST-01)`: Configured automated test suite (`npm test`) using Node native test runner via `tsx --test tests/**/*.test.ts`.
- `test(TEST-01)`: Created `tests/characterization.test.ts` covering ticket normalization (`normalizeTicket`, `isIndividualUpn`), color scoring, and ITIL audit rule schema conformity.

### Fixed
- `fix(SEC-01)`: Eradicated hardcoded Google Gemini API key string from `.env.example` and fallback defaults in `server.ts`. Removed fallback loading of `.env.example` into `process.env`. Added regression assertions in `tests/security.test.ts`.
- `fix(SEC-03)`: Re-enabled Node global TLS verification by removing `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`. Scoped relaxed TLS strictly to ServiceNow via `SNOW_ALLOW_INSECURE_TLS` and preserved strict TLS for all external API endpoints. Added regression test in `tests/security.test.ts`.
- `fix(SEC-02)`: Created `lib/security.ts` with `isBlockedSsrfUrl` to block private IPv4 subnets, localhost/loopback, IPv6 link-local, cloud metadata services (169.254.169.254), and non-HTTP protocols on webhook endpoints. Re-enabled strict TLS verification on webhook dispatches. Added unit tests in `tests/security.test.ts`.
- `fix(SEC-04)`: Masked plaintext passwords in `/api/servicenow/credentials`, `/api/smtp/config`, and `/api/digest/config` responses using `maskServiceNowCredentials` and `maskSmtpSettings`. Preserved existing passwords on configuration updates when masked placeholder is submitted. Added unit tests in `tests/security.test.ts`.
- `fix(SEC-05)`: Hardened `/api/send-email` against open mail relay exploitation and SMTP header injection using `validateEmailPayload`. Enforced recipient domain validation via `ALLOWED_EMAIL_DOMAINS`, disabled arbitrary caller SMTP config overrides, and re-enabled TLS certificate validation. Added unit tests in `tests/security.test.ts`.
- `fix(CI-01)`: Extracted classification logic to `lib/classification.ts` and hardened `isResolvedTicket` to strictly match ITIL Resolved state (numeric 6 or label 'resolved') and state transitions, eliminating false-positive matches on problem descriptions containing the word 'resolution'. Added characterization test in `tests/characterization.test.ts`.
