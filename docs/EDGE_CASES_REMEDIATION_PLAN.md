# Edge Cases and Remediation Plan

Date: 2026-03-27
Owner: Senior Product Designer / Lead Full-Stack Architect

## Scope
- Full website audit across pages 1-9.
- Focus on auth, data integrity, UX resilience, localization, accessibility, and reusable UI architecture.

## Critical Gaps (Immediate)

### Auth
- Missing user-facing auth journeys:
  - Sign up
  - Verify OTP / magic-link verification
  - Forgot password and reset password
- No route guards for role-protected pages.
- No central auth context for current user/session state.
- No logout action in global shell.

### Stability and Security
- No global error boundary.
- No unified retry strategy for transient network failures.
- No account lockout/rate-limit UX on repeated login failures.
- Demo credentials are hardcoded in source and should move to environment variables.

## High-Priority UX Edge Cases By Page

### Login
- Distinguish credential errors vs network timeout.
- Add failed-attempt lockout state with cooldown timer.
- Add links to Sign up, Forgot Password, Verify OTP.

### Audit Form
- Enforce file size/type constraints before upload.
- Show clear GPS denied/unavailable warning and impact.
- Add unsaved changes guard on navigation.
- Require escalation remarks when manual escalation is checked.

### Supervisor
- Add retry button when live data load fails.
- Add confirm dialogs for approve/revision actions.
- Add stale-data indicator and manual refresh control.
- Scope escalation list by zone filter when selected.

### Admin
- Export actions should have loading/failure states.
- Add sorting by last visit date.
- Show N/A state when denominator metrics are zero.

### Executive
- Add empty-state cards when selected segment has no data.
- Add tabular fallback under trend chart for accessibility.
- Replace mock-only report action with real file export.

### Outlet Map
- Add empty-filter result CTA (Clear filters).
- Add map load fallback state when tile server fails.
- Add keyboard navigation for marker interactions.

### Outlet Profile
- Validate unknown outlet id and show graceful not-found state.
- Add pagination/load-more for long history lists.
- Add fallback for expired photo evidence links.

### Questionnaire Manager
- Prevent duplicate item keys in same version.
- Lock approved versions from mutation.
- Confirm activation/deactivation of active versions.

### Escalation Console
- Validate assignee eligibility.
- Add stronger resolution form validation.
- Persist resolved records robustly and support export from filtered state.

## Component Architecture Plan

### Implemented in this pass
- Global Toast system:
  - `src/components/Toast/ToastProvider.jsx`
  - `src/components/Toast/ToastContext.js`
- Reusable Dropdown component:
  - `src/components/Dropdown/Dropdown.jsx`
- Shared localization formatter utilities:
  - `src/i18n/localeText.js`

### Next shared components to add
- Modal/ConfirmDialog
- EmptyState
- DataTable (sorting/pagination built-in)
- ErrorBoundary
- KPI Card

## Localization Plan
- Continue using `tx(en, am)` for UI copy.
- Use formatter utilities for backend/mock tokens:
  - status values
  - weekdays
  - escalation reasons
  - outlet segments and mechanics
- Enforce localization QA checklist before each release.

## Delivery Phases

### Phase 1 (Week 1-2)
- Auth foundation:
  - AuthContext
  - route guards
  - sign up / forgot password / update password / verify OTP pages
- Logout and session timeout handling.
- ErrorBoundary and shared error display.

### Phase 2 (Week 3-4)
- Validation and reliability:
  - upload constraints
  - network retry and offline banners
  - form unsaved changes guard
- Modal confirmations for destructive or final actions.

### Phase 3 (Week 5-6)
- Data UX scale:
  - table pagination
  - empty/loading skeletons
  - export implementations
- Accessibility sweep (labels, focus order, table semantics, chart fallback).

## Acceptance Criteria
- All pages fully localizable between EN/AM without raw status/day tokens.
- Auth includes signup, OTP verification, forgot/reset password.
- Role-based routes blocked for unauthorized users.
- Toast and dropdown components used across all interactive dashboard pages.
- Lint and build pass after each milestone.
