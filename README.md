# Magazine Social Network

## Project Overview

Magazine Social Network is a text-first, multilingual editorial platform for professional long-form writing. It prioritizes editorial integrity, focused reading, and real identities over engagement mechanics.

What it is:
- A structured publishing backend for topic- and language-scoped magazines.
- A system for long-form articles with explicit lifecycle states.
- A foundation for public reading and professional identity profiles.

What it is not:
- A social network with likes, feeds, or virality.
- A short-form or media-heavy platform.
- An anonymous publishing system.

Core principles:
- Text-first: writing and reading are the product.
- Editorial integrity: topic and language scope is enforced.
- Multilingual by design: content language is explicit and first-class.

## Architecture Overview

The backend is a Node.js + TypeScript Express API backed by PostgreSQL. The application uses a simple layered structure: routes map to controllers, controllers coordinate validation and flow, and repositories encapsulate SQL access.

Why versioned articles exist:
- Articles are long-form and iterative; versioning preserves history and supports editorial review without overwriting content.

Why topic + language scope is enforced:
- Each magazine defines its editorial scope, and articles inherit that scope. This enforces consistency and prevents drift, keeping publications coherent for readers and editors.

## Domain Model

- User: A real identity with name, email, and professional background. Users author articles and own magazines.
- UserProfile: Optional public or private professional profile attached to a user. Can include headline, bio, and external links.
- Magazine: An editorial channel with exactly one topic and one language. Owned by a user.
- Article: Long-form content with explicit lifecycle states and version history. Belongs to a magazine and inherits its scope.
- Language: A controlled list of content languages used for discovery and scope.
- Topic: A controlled taxonomy used to define editorial focus.

Relationships:
- A user owns many magazines and authors many articles.
- A user has zero or one user profile.
- A magazine has many articles.
- An article belongs to one magazine and is tied to that magazine's topic and language.

## Folder Structure

- `backend/src/controllers`: Request handlers, validation, and response shaping.
- `backend/src/repositories`: SQL access and persistence logic.
- `backend/src/routes`: HTTP route definitions.
- `backend/src/models`: TypeScript domain types.
- `backend/src/db/migrations`: Database schema and seed migrations.

## API Overview

Users (placeholder):
- Registration is not implemented yet; user creation is assumed to be handled externally for now.

Profiles:
- `PUT /profiles/me`
- `GET /profiles/:userId`

Magazines:
- `POST /magazines`
- `GET /magazines`

Articles:
- `POST /magazines/:id/articles`
- `POST /articles/:id/submit`
- `POST /articles/:id/publish`
- `GET /articles`
- `GET /articles/:id`

### Example Requests

Create a magazine:
```bash
curl -X POST http://localhost:3000/magazines \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "title": "Research Notes",
    "description": "Applied research and long-form analysis",
    "primary_topic_id": "<topic-id>",
    "primary_language_id": "<language-id>"
  }'
```

List magazines:
```bash
curl -X GET http://localhost:3000/magazines \
  -H "x-user-id: <user-id>"
```

Create a draft article:
```bash
curl -X POST http://localhost:3000/magazines/<magazine-id>/articles \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "title": "On sovereign debt and policy risk",
    "body": "Long-form content goes here."
  }'
```

Submit an article:
```bash
curl -X POST http://localhost:3000/articles/<article-id>/submit \
  -H "x-user-id: <user-id>"
```

Publish an article:
```bash
curl -X POST http://localhost:3000/articles/<article-id>/publish \
  -H "x-user-id: <user-id>"
```

List published articles:
```bash
curl -X GET "http://localhost:3000/articles?languageId=<language-id>&topicId=<topic-id>&limit=20&offset=0"
```

Get a published article:
```bash
curl -X GET http://localhost:3000/articles/<article-id>
```

Upsert current user's profile:
```bash
curl -X PUT http://localhost:3000/profiles/me \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{
    "headline": "Energy policy researcher",
    "bio": "Focused on grid reliability and climate economics.",
    "external_links": ["https://example.com"],
    "visibility": "public"
  }'
```

Get a public profile:
```bash
curl -X GET http://localhost:3000/profiles/<user-id>
```

## Running Locally

1) Start PostgreSQL with Docker:
```bash
docker compose -f backend/docker/docker-compose.yml up -d
```

2) Configure environment variables:
```bash
cp .env.example .env
```

3) Install dependencies:
```bash
cd backend
npm install
```

4) Run migrations and start the API:
```bash
npm run migrate
npm run dev
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by the API.
- `PORT`: Port for the Express server (default is 3000 if unset).
- `DEV_USER_ID`: Development-only user id used by the auth stub when no header is provided.

## MVP Scope

Included:
- Real identity users and optional profiles.
- Magazines scoped to a single topic and language.
- Article versioning with explicit lifecycle states.
- Public reading endpoints for published articles.
- Public profile lookup.
- Development auth stub for local testing.

Excluded (intentional):
- Authentication provider or production auth.
- Social graph, likes, or algorithmic feeds.
- Short-form or media-first content.
- Comments, messaging, or notifications.
- Monetization and premium features.

## Future Work

- Organizations and multi-author publications.
- Dedicated frontend reader experience.
- Production authentication and account recovery.
- Conceptual anti-plagiarism tooling.
