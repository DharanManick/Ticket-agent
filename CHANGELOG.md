# Changelog

All notable changes to the Ticket Audit Agent will be documented in this file.

## [Unreleased] - Group 1 Quick Wins (Security & Engineering Hardening)

### Added
- `test(TEST-01)`: Configured automated test suite (`npm test`) using Node native test runner via `tsx --test tests/**/*.test.ts`.
- `test(TEST-01)`: Created `tests/characterization.test.ts` covering ticket normalization (`normalizeTicket`, `isIndividualUpn`), color scoring, and ITIL audit rule schema conformity.
