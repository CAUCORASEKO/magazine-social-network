# Magazine Social Network — Architecture Overview

## 1. Purpose

Magazine Social Network is a text-first, multilingual editorial platform designed
for long-form professional writing.

The system prioritizes:
- reading over scrolling
- editorial structure over virality
- explicit scope over algorithmic amplification
- real identities over anonymous engagement

This document describes the architectural decisions behind the current system,
the constraints intentionally enforced, and the extension points for future
phases.

---

## 2. Core Principles

The architecture is guided by the following non-negotiable principles:

- **Text-first**: no images, videos, or rich media in the initial stages
- **Long-form content**: articles are primary units, not posts
- **Editorial scope enforcement**: each magazine has exactly one topic and one language
- **Explicit identity**: users are real people with verifiable context
- **Multilingual by design**: UI language and content language are separate
- **Transparency over engagement**: no feeds optimized for virality

Any feature that contradicts these principles is intentionally excluded.

---

## 3. Domain Model

The core domain entities are:

### User
Represents a real, accountable person.
- Immutable core identity (name, email, professional background)
- Used for authentication and authorship
- Not anonymous

### UserProfile
Optional, public-facing professional profile.
- Headline, bio, external links
- Explicit visibility (public/private)
- Does not alter core identity

### Magazine
An editorial channel with strict scope.
- Exactly one topic
- Exactly one language
- Owned by a user
- All published content must match the scope

### Article
Long-form written content.
- Always authored by a user
- Published within a magazine
- Lifecycle-based (draft → submitted → published)
- No media attachments

### Language & Topic
Controlled reference entities.
- Used for enforcement and filtering
- Not user-defined in the MVP

---

## 4. Article Lifecycle

Articles move through explicit states:

- **draft**: created by the author, private
- **submitted**: ready for validation
- **published**: visible to readers
- **rejected**: blocked due to scope or policy
- **archived**: no longer active

Scope enforcement (topic + language) is mandatory and automatic at publish time.
There are no silent failures or shadow moderation.

---

## 5. Backend Architecture

The backend follows a layered structure:

- **Routes**: HTTP endpoints and request wiring
- **Controllers**: validation and orchestration
- **Repositories**: database access and queries
- **Database**: relational schema with explicit constraints

Key characteristics:
- No business logic in routes
- No ORM magic
- Explicit queries and state transitions
- Predictable failure modes

The backend exposes a minimal REST API for:
- reading published content
- managing magazines
- creating and publishing articles
- managing public profiles

---

## 6. Frontend Architecture

The frontend is intentionally minimal and reader-focused.

- Server-side rendered pages
- No infinite scrolling
- No engagement widgets
- No personalization algorithms

Current views:
- Home feed (published articles)
- Article detail page
- Public user profile

The frontend is a consumer of the public API, not a feature driver.

---

## 7. What the System Does NOT Do

The following are intentionally excluded from the current architecture:

- Images, video, audio, embeds
- Likes, reactions, follower counts
- Trending or ranking algorithms
- Comments and messaging
- Monetization or subscriptions
- Job listings
- Automatic translation
- Organization accounts (future phase)

Exclusion is a design choice, not a limitation.

---

## 8. Extension Points (Future Phases)

The current architecture allows future extensions without refactoring:

- Organization-owned magazines
- Verified professional credentials
- Premium visibility or content protection
- Editorial collaboration
- Plagiarism detection workflows
- Moderation appeals
- Language expansion

These are deferred intentionally to preserve clarity and focus.

---

## 9. Architectural Philosophy

This system favors:
- explicit over implicit
- constraints over heuristics
- readability over engagement
- maintainability over speed

The goal is not growth at all costs, but the creation of a serious,
editorial-grade platform for written knowledge.