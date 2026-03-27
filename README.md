# Habesha Breweries Promotional Audit Platform

Production-oriented React + Vite platform for field execution auditing, supervisor sign-off, escalation management, and executive visibility across Habesha Breweries promotional outlets in Addis Ababa.

## Why this platform

This system replaces paper and ad-hoc reporting with a role-based, evidence-backed workflow that captures field reality in near real time and makes issues actionable within the same day.

## Core capabilities

- Role-based authentication and route protection for enumerator, supervisor, project manager, and executive views.
- Live mode with Supabase auth/data and demo mode fallback when Supabase keys are not configured.
- Deterministic demo accounts for all key roles, including quick autofill buttons on login in demo mode.
- Mobile-first audit submission with structured sections, validation, escalation controls, and photo/GPS handling.
- Supervisor command view for submission status, sign-off actions, and escalation countdown tracking.
- Program-level PM dashboard with KPIs, reporting workflows, and oversight controls.
- Read-only executive dashboard focused on KPI summaries, trend visibility, and report access.
- Outlet map and outlet profile drill-down views for spatial and historical compliance analysis.
- Questionnaire versioning and escalation console for operational control.
- Bilingual UI support (English/Amharic) via centralized language context.
- Resilience and UX hardening features such as error boundaries, network status, lockout guardrails, and improved empty/failure states.

## Implemented routes

- `/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/verify-otp`
- `/auth/reset-password`
- `/audit/new`
- `/supervisor`
- `/admin`
- `/executive`
- `/map`
- `/outlets/:id`
- `/admin/questionnaire`
- `/admin/escalations`

## Authentication behavior

- `Live mode`: active when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present.
- `Demo mode`: automatic fallback when Supabase keys are missing.
- Login UX includes password show/hide controls and simplified link flow.

### Demo credentials (non-Supabase mode)

- Enumerator: `enumerator@demo.habesha` / `Demo@12345`
- Supervisor: `supervisor@demo.habesha` / `Demo@12345`
- Project Manager: `pm@demo.habesha` / `Demo@12345`
- Executive: `executive@demo.habesha` / `Demo@12345`

## Technical stack

- Frontend: React 19, Vite 8, React Router DOM 7
- Backend/BaaS: Supabase (Auth, Postgres, Storage, Realtime)
- Mapping: Leaflet
- Styling: CSS Modules + shared tokenized design system
- Tooling: ESLint, npm scripts, modular component/page architecture

## Project structure (high level)

- `src/auth`: auth provider/hooks, protected routes, demo auth fallback logic.
- `src/pages`: route-level screens for each role and auth journey.
- `src/components`: reusable UI primitives and shell components.
- `src/data`: centralized mock datasets for pre-live operation.
- `src/lib/supabase.js`: Supabase client setup and configuration check.
- `src/styles`: design tokens and shared visual system assets.
- `supabase/bootstrap.sql`: schema bootstrap for new Supabase projects.

## Local development

1. Install dependencies:
	`npm install`
2. Start dev server:
	`npm run dev`
3. Lint:
	`npm run lint`
4. Build production bundle:
	`npm run build`

## Environment setup

Use `.env.example` as template.

Required for live mode:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional demo seed overrides:

- `VITE_DEMO_ENUMERATOR_EMAIL`
- `VITE_DEMO_ENUMERATOR_PASSWORD`
- `VITE_DEMO_SUPERVISOR_EMAIL`
- `VITE_DEMO_SUPERVISOR_PASSWORD`
- `VITE_DEMO_PROJECT_MANAGER_EMAIL`
- `VITE_DEMO_PROJECT_MANAGER_PASSWORD`
- `VITE_DEMO_EXECUTIVE_EMAIL`
- `VITE_DEMO_EXECUTIVE_PASSWORD`
- `VITE_DEMO_USERS_JSON`

## Deployment notes (Netlify)

- SPA fallback is configured through `public/_redirects` with:

  `/* /index.html 200`

This prevents 404 errors on direct route hits such as `/login` or `/admin`.

## Business and operational benefits

- Faster issue detection through immediate escalation visibility.
- Stronger compliance confidence with evidence-backed field data.
- Better coordination between field teams, supervision, and client stakeholders.
- Reduced reporting cycle time through centralized and structured data.
- Clear audit trail and accountability from submission through resolution.

## References

- Supabase onboarding and setup guide: `docs/SUPABASE_SETUP.md`
- Remediation roadmap: `docs/EDGE_CASES_REMEDIATION_PLAN.md`
- Supabase bootstrap SQL: `supabase/bootstrap.sql`
