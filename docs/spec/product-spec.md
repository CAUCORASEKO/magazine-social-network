Magazine Social Network Editorial Focus
No tasks in progress


You are assisting in the development of a product called “Magazine Social Network”.

Context:
Magazine Social Network is a text-first, multilingual social platform designed for professional long-form writing, structured editorial channels, and high-quality reading experiences.

The platform intentionally excludes photos and videos in its initial stages. The focus is on reading, writing, and editorial integrity rather than virality, engagement metrics, or dopamine-driven interactions.

Target users:
- Professionals
- Researchers
- Subject-matter experts
- Advanced students

Core principles:
- Text-first (no images or videos initially)
- Long-form content
- Reading over scrolling
- Editorial channels (“Magazines”) with strict topic and language scope
- Real user identities with optional editorial aliases
- Multilingual by design (UI language + content language separation)
- Author-controlled interactions (comments, messages, reactions are opt-in)
- Quality over growth speed

Content model:
- Users create Magazines (channels)
- Each Magazine has:
  - A single primary topic
  - A primary language
- Articles must match both the topic and language of their Magazine
- Articles outside scope are blocked or flagged

Language handling:
- UI language is user-specific
- Each article has a single explicit language
- Content discovery prioritizes reader language preferences
- No automatic translation by default (optional future feature)

Moderation:
- No illegal, abusive, or harmful content
- Topic and language enforcement is mandatory
- Moderation should be transparent and explainable
- Appeals are a future feature

What the platform is NOT:
- Not a short-form social network
- Not an image/video platform
- Not anonymous
- Not engagement-driven
- Not optimized for virality

Your role:
- Provide architectural guidance, code, data models, or documentation aligned with these principles
- Avoid unnecessary features
- Avoid over-engineering
- Prefer simple, explicit designs
- Favor clarity, maintainability, and scalability
- When uncertain, ask clarifying questions before assuming behavior

When generating code:
- Keep it modular and readable
- Use clear naming aligned with the domain (User, Magazine, Article, Language)
- Avoid premature optimizations
- Prefer explicit constraints over implicit behavior

When suggesting features:
- Always justify them against the core principles
- If a feature contradicts the principles, explicitly warn about it

Goal:
Help incrementally build a serious, professional, text-centric social platform with a strong editorial identity.

Got it. What would you like me to work on next?

Using the Magazine Social Network context, design the initial domain model.

Focus only on:
- User
- Magazine
- Article
- Language

For each entity:
- Describe its purpose
- List its core fields
- Specify relationships and constraints

Do NOT include implementation details or technology choices.
Keep the model minimal and aligned with the product principles.

Here’s a minimal initial domain model aligned with the platform principles.

User

Purpose: Real person who reads, writes, and may run magazines; identity is primary.
Core fields: id, full_name, primary_email, ui_language_id, created_at, status
Relationships: has many magazines (as owner/editor); has many articles (as author); has many editorial aliases (optional, not modeled here)
Constraints: must be a real identity; ui language is required; status gates creation/publishing
Magazine

Purpose: Editorial channel with a strict topic + language scope.
Core fields: id, title, description, primary_topic, primary_language_id, owner_user_id, created_at, status
Relationships: belongs to one user (owner/editor); has many articles
Constraints: primary_topic required and single; primary_language required and single; only owner/editor can publish into it
Article

Purpose: Long-form text content within a magazine’s scope.
Core fields: id, title, body, language_id, magazine_id, author_user_id, created_at, published_at, status
Relationships: belongs to one magazine; belongs to one author (user); has one language
Constraints: language must match magazine’s primary language; topic must match magazine’s primary topic; only one language per article; publication requires explicit status
Language

Purpose: Explicit language identity for UI and content filtering.
Core fields: id, iso_code, name
Relationships: referenced by users (ui_language); magazines (primary_language); articles (language)
Constraints: iso_code unique and required; used for filtering and enforcement
If you want, I can extend this with minimal role/permission notes or a moderation status model.

You are acting as a senior full-stack engineer working on a product called
“Magazine Social Network”.

You MUST follow the product vision and constraints defined below and
progress through the project in structured phases.

====================
PRODUCT VISION
====================

Magazine Social Network is a text-first, multilingual social platform focused on
professional long-form writing, editorial integrity, and high-quality reading.

Core rules:
- No photos or videos (initial stages)
- Long-form written articles only
- Reading over scrolling
- Editorial channels called “Magazines”
- Each Magazine has:
  - exactly one primary topic
  - exactly one primary language
- Articles MUST match both the topic and language of the Magazine
- Articles outside scope are blocked
- Real user identities (name, email, professional background)
- Optional editorial aliases per Magazine
- UI language is separate from content language
- No virality-driven features
- No anonymous posting

Supported languages:
English (default), Spanish, French, Russian, Finnish, Swedish

====================
EXECUTION RULES
====================

1. DO NOT attempt to build everything at once.
2. Progress strictly in phases.
3. Each phase must be minimal, explicit, and reviewable.
4. Avoid over-engineering.
5. Prefer clarity over cleverness.
6. When unsure, make conservative assumptions and state them explicitly.

====================
PHASES TO EXECUTE
====================

PHASE 1 — Domain & Data Model
- Finalize the domain entities:
  User, Magazine, Article, Language, Topic
- Define article lifecycle states
- Define constraints and relationships
- Output: clear domain description (no code yet)

PHASE 2 — Database Schema
- Translate the domain model into a minimal relational schema
- Include primary keys, foreign keys, and constraints
- Output: SQL-like schema (conceptual but precise)

PHASE 3 — Backend Architecture
- Choose a reasonable backend stack
- Define project structure
- Define core services and responsibilities
- Output: folder structure + explanation

PHASE 4 — Core API Design
- Define REST API endpoints for:
  - User registration
  - Magazine creation
  - Article creation and publication
- Include validation and moderation logic
- Output: endpoint definitions (no frontend)

PHASE 5 — Moderation & Enforcement
- Define how topic and language enforcement works
- Define automatic blocking rules
- Define transparency to the user
- Output: moderation flow description

PHASE 6 — MVP Scope Definition
- Explicitly list what is INCLUDED in MVP
- Explicitly list what is EXCLUDED
- Output: MVP boundary document

====================
OUTPUT INSTRUCTIONS
====================

- Start with PHASE 1 only.
- Clearly label the phase.
- Do NOT jump ahead.
- Do NOT include code until the appropriate phase.
- Wait for confirmation before proceeding to the next phase.

====================
GOAL
====================

Build a serious, professional, maintainable foundation for a text-centric
editorial social platform without rushing or bloating the design.

PHASE 1 — Domain & Data Model

Entities

User

Purpose: Real, accountable person who reads and writes; may own or edit magazines.
Core fields: id, full_name, email, professional_background, ui_language_id, created_at, status
Relationships: owns many magazines; authors many articles
Constraints: real identity required (name + email + professional background); UI language required; no anonymous posting
Magazine

Purpose: Editorial channel with a strict topic and language scope.
Core fields: id, title, description, primary_topic_id, primary_language_id, owner_user_id, created_at, status
Relationships: belongs to one owner (user); has many articles; references one topic and one language
Constraints: exactly one primary topic; exactly one primary language; only scoped articles allowed
Article

Purpose: Long-form written content within a magazine’s scope.
Core fields: id, title, body, magazine_id, author_user_id, language_id, topic_id, created_at, published_at, status
Relationships: belongs to one magazine; authored by one user; references one language and one topic
Constraints: language and topic must match the magazine’s primary language/topic; long-form text only; no media
Language

Purpose: Explicit language identity for UI and content separation.
Core fields: id, code, name
Relationships: referenced by users (ui_language), magazines (primary_language), articles (language)
Constraints: code unique; supported set limited to English (default), Spanish, French, Russian, Finnish, Swedish
Topic

Purpose: Controlled taxonomy for editorial scope.
Core fields: id, name, description
Relationships: referenced by magazines (primary_topic) and articles (topic)
Constraints: one primary topic per magazine; article topic must equal magazine topic
Article lifecycle states

Draft: created by author; not visible to readers
Submitted: ready for scope checks; not visible
Published: visible; passes topic + language constraints
Rejected: blocked due to scope violation or policy violation
Archived: previously published; no longer active
If this looks right, confirm and I’ll proceed to PHASE 2.

PHASE 2

PHASE 2 — Database Schema (conceptual SQL)

-- Languages (supported set enforced by application; codes unique)
table languages (
  id               uuid primary key,
  code             varchar not null unique, -- en, es, fr, ru, fi, sv
  name             varchar not null
);

table topics (
  id               uuid primary key,
  name             varchar not null unique,
  description      text
);

table users (
  id               uuid primary key,
  full_name        varchar not null,
  email            varchar not null unique,
  professional_background text not null,
  ui_language_id   uuid not null references languages(id),
  status           varchar not null, -- active, suspended
  created_at       timestamp not null
);

table magazines (
  id               uuid primary key,
  title            varchar not null,
  description      text,
  primary_topic_id uuid not null references topics(id),
  primary_language_id uuid not null references languages(id),
  owner_user_id    uuid not null references users(id),
  status           varchar not null, -- active, archived
  created_at       timestamp not null
);

table articles (
  id               uuid primary key,
  title            varchar not null,
  body             text not null,
  magazine_id      uuid not null references magazines(id),
  author_user_id   uuid not null references users(id),
  language_id      uuid not null references languages(id),
  topic_id         uuid not null references topics(id),
  status           varchar not null, -- draft, submitted, published, rejected, archived
  created_at       timestamp not null,
  published_at     timestamp
);

-- Constraints (conceptual)
-- 1) Article language and topic must match magazine scope
--    articles.language_id = magazines.primary_language_id
--    articles.topic_id    = magazines.primary_topic_id
-- 2) No anonymous posting enforced by users.full_name/email/professional_background not null
Confirm and I’ll proceed to PHASE 3.

PHASE 3.

PHASE 3 — Backend Architecture

Stack choice (minimal, conventional)

Backend: Node.js + TypeScript + Express
Database: PostgreSQL
Why: mature ecosystem, clear HTTP semantics, strong relational constraints, easy to maintain
Project structure

/src
  /config          environment and app config
  /db              connection + migrations
  /models          domain entities (User, Magazine, Article, Language, Topic)
  /repositories    data access (one per entity)
  /services        business logic (User, Magazine, Article)
  /validators      request and domain validation
  /controllers     HTTP handlers
  /routes          route definitions
  /middleware      auth + error handling
  /utils           shared helpers
Core services and responsibilities

UserService: registration, identity validation, UI language assignment
MagazineService: create magazine, enforce topic/language scope, ownership checks
ArticleService: create draft, submit, publish, enforce topic/language match, lifecycle transitions
LanguageService: read-only access to supported languages
TopicService: manage topic catalog (admin-only in future; read-only for MVP)
If this is aligned, confirm and I’ll move to PHASE 4.

PHASE 4

PHASE 4 — Core API Design

User registration

POST /users
Body: full_name, email, professional_background, ui_language_code
Validation: required fields; ui_language_code must be supported; email unique
Result: creates user with status=active
Magazine creation

POST /magazines
Body: title, description, primary_topic_id, primary_language_code
Validation: authenticated user; topic exists; language supported; one topic + one language
Result: creates magazine with owner_user_id = current user
Article creation (draft)

POST /magazines/:magazineId/articles
Body: title, body
Validation: authenticated user; magazine exists; body required; no media
Result: creates article with status=draft; language_id/topic_id inherited from magazine
Article submission (for scope checks)

POST /articles/:articleId/submit
Validation: authenticated author; status=draft; topic/language already bound to magazine
Result: status=submitted
Article publication

POST /articles/:articleId/publish
Validation: authenticated author; status=submitted; topic/language match magazine scope
Moderation: if mismatch or policy violation, set status=rejected
Result: status=published with published_at
If this looks good, confirm and I’ll proceed to PHASE 5.

PHASE 5.

PHASE 5 — Moderation & Enforcement

Scope enforcement (automatic, mandatory)

On article creation: language_id and topic_id are bound from the magazine and cannot be changed by the author.
On submission/publish: verify the article’s language_id and topic_id still match the magazine’s primary_language_id and primary_topic_id.
If mismatch: block publication, set status=rejected.
Content policy enforcement (baseline)

Prohibit illegal, abusive, or harmful content.
Initial enforcement is manual or rule-based (simple keyword/blocklist checks) with a clear rejection reason.
No shadow removals; the author always receives an explicit status and reason.
Transparency to the user

Rejected articles store a rejection_reason code and message.
API returns rejection_reason on read for the author.
For non-authors, rejected articles are not visible.
Moderation flow

Draft → Submitted
Submission triggers scope + policy checks
If passed → Published
If failed → Rejected with explicit reason
Author can edit and resubmit
Confirm and I’ll proceed to PHASE 6.

PHASE 6.

PHASE 6 — MVP Scope Definition

INCLUDED

User registration with real identity fields (name, email, professional background)
UI language selection (from supported set)
Topic catalog (read-only for users)
Magazine creation with exactly one topic and one language
Article draft → submit → publish lifecycle
Automatic enforcement of magazine topic + language scope
Explicit rejection with reason and resubmission flow
Read access to published articles by language preference
EXCLUDED

Images, video, audio, embeds
Anonymous posting or pseudonymous-only accounts
Reactions, likes, follower counts, trending, or virality mechanics
Comments and direct messaging (opt-in interactions deferred)
Automatic translation
Appeals system
Advanced moderation tooling, ML classification, or editorial scoring
Multi-topic or multi-language magazines
Collaborative co-authoring or shared ownership
If you want, I can turn this into a single concise spec document in