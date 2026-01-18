# Magazine Social Network

## Overview

Magazine Social Network is a text-first, multilingual editorial platform for professional long-form writing. It provides structured publishing channels with strict topic and language scope to support serious, focused reading and writing.

It is designed for professionals, researchers, and subject-matter experts who need a place to publish long-form analysis without the incentives and noise of engagement-driven social networks.

It intentionally avoids images and video, viral mechanics, anonymous posting, and short-form content.

## Core Concepts

- User: A real identity with name, email, and professional background. Users author articles and own magazines.
- Magazine: An editorial channel with exactly one primary topic and one primary language. Each magazine defines a strict scope.
- Article: Long-form text content that belongs to a magazine and inherits its scope. Articles follow an explicit lifecycle.
- Topic: A controlled taxonomy used to define magazine scope.
- Language: Explicit content language used for scope and discovery, separate from UI language.

## Editorial Model

- One topic per magazine.
- One language per magazine.
- Articles inherit topic and language from their magazine.
- Articles that do not match scope are rejected.

## Article Lifecycle

- Draft: Private working state.
- Submitted: Ready for scope checks and publication.
- Published: Visible to readers.
- Rejected: Blocked due to scope mismatch or policy violation.

Explicit lifecycle states make moderation and editorial decisions transparent and auditable. They also prevent implicit or hidden transitions.

## API Overview

- POST /magazines
- GET /magazines
- POST /magazines/:magazineId/articles
- POST /articles/:articleId/submit
- POST /articles/:articleId/publish

## Example API Calls

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

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL

## Project Status & Roadmap

Implemented:
- Domain model and database schema
- Magazine creation and listing
- Draft article creation
- Article lifecycle endpoints (submit, publish)
- Development auth stub (header-based)

Not implemented yet:
- Real authentication
- Authorization roles and permissions
- Editorial review tools
- Comments or messaging
- Media support
- Translation or multilingual content tooling
- Frontend application
