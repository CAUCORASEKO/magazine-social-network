# Magazine Social Network

Magazine Social Network is a text-first, long-form editorial platform for
professional writers, researchers, and subject-matter experts who publish
within topic- and language-scoped magazines. It addresses the gap between
general social networks and editorial publications by providing a structured,
read-only space for multilingual long-form writing without engagement
mechanics.

## Core Principles

- Text-first
- Long-form
- Editorial scope
- Real identities
- Multilingual separation

## Current Scope (MVP)

- Node.js + TypeScript API with PostgreSQL storage
- Magazines scoped to a single topic and language
- Article lifecycle with explicit states (draft, submitted, published)
- Article version history preserved in the database
- Public read endpoints for articles and public profiles
- Minimal Next.js reader UI for feed, article, and public profile pages
- Session-based authentication with email verification
- Seeded languages and topics for filtering

## Explicitly Out of Scope

- Authentication providers or production auth
- Social graph, likes, reactions, or algorithmic feeds
- Comments, messaging, or notifications
- Media uploads (images, video, audio, embeds)
- Monetization, subscriptions, or payments
- Organization accounts or multi-author ownership
- Automatic translation or ranking systems

## High-Level Architecture

- Backend: Express API in Node.js + TypeScript, PostgreSQL, raw SQL migrations
- Frontend: Next.js read-only UI consuming the public API
- Architecture details: `docs/architecture.md`

## Repository Structure

- `/backend`: API, database access, and SQL migrations
- `/frontend`: Next.js reader interface
- `/docs`: product and architecture documentation

## Local Development

Backend:
1. Start PostgreSQL:
   - `docker compose -f backend/docker/docker-compose.yml up -d`
2. Configure environment variables:
   - `cp backend/.env.example backend/.env`
3. Apply database migrations (in order):
   - `for f in backend/src/db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done`
4. Install dependencies and run the API:
   - `cd backend`
   - `npm install`
   - `npm run dev`

Frontend:
1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Optional environment variables in `frontend/.env.local`:
   - `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000`)
   - `NEXT_PUBLIC_TOPIC_GEOPOLITICS_ID`
   - `NEXT_PUBLIC_TOPIC_TECHNOLOGY_ID`
   - `NEXT_PUBLIC_TOPIC_SCIENCE_ID`
   - `NEXT_PUBLIC_TOPIC_ECONOMICS_ID`
3. Run the Next.js app:
   - `npm run dev`

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string used by the API
- `SESSION_SECRET`: Session signing secret for cookie-based auth

## Project Status

- Foundation complete
- Read-only MVP
- Ready for evaluation and iteration
