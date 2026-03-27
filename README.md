# Habesha Breweries Audit Platform

React + Vite implementation of the PRD for Habesha Breweries promotional activity auditing.

## Implemented pages
- /login
- /audit/new
- /supervisor
- /admin
- /executive
- /map
- /outlets/:id
- /admin/questionnaire
- /admin/escalations

## Language support
- Global English / Amharic toggle is available in the top app bar and applies across all implemented pages.

## Local run
1. Install dependencies:
	npm install
2. Start development server:
	npm run dev
3. Build for production:
	npm run build

## Local demo credentials (when Supabase is not configured)
- Enumerator: enumerator@demo.habesha / Demo@12345
- Supervisor: supervisor@demo.habesha / Demo@12345
- Project Manager: pm@demo.habesha / Demo@12345
- Executive: executive@demo.habesha / Demo@12345

## Supabase connection
Step-by-step setup is documented in docs/SUPABASE_SETUP.md.

Bootstrap SQL for a new project is in supabase/bootstrap.sql.
