<!--
Sync Impact Report
- Version change: N/A -> 1.0.0
- Modified principles:
  - Template principle 1 -> I. Telegram-Native Experience
  - Template principle 2 -> II. Playable Core Before Expansion
  - Template principle 3 -> III. Local-First MVP, Explicit Durability Boundaries
  - Template principle 4 -> IV. Evidence-Driven Verification
  - Template principle 5 -> V. Lean Architecture, Explicit Contracts
- Added sections:
  - Product & Platform Constraints
  - Delivery Workflow
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated - .specify/templates/plan-template.md
  - ✅ updated - .specify/templates/spec-template.md
  - ✅ updated - .specify/templates/tasks-template.md
  - ✅ reviewed, no command templates present - .specify/templates/commands/*.md
- Follow-up TODOs:
  - None
-->
# Pika CarJam Constitution

## Core Principles

### I. Telegram-Native Experience
All user-facing changes MUST preserve the product as a Telegram Mini App first and
a web app second. Features that touch launch, sharing, haptics, fullscreen,
portrait usage, safe fallback behavior outside Telegram, or bot handoff MUST be
designed and validated in that context. Rationale: the product succeeds only if
it feels native inside Telegram while remaining workable for local development.

### II. Playable Core Before Expansion
Work that strengthens the puzzle loop, controls, feedback, retry flow, or level
clarity MUST take priority over monetization, referral growth mechanics, or
infrastructure expansion. Features that do not directly improve gameplay or
support replayable sessions MUST include an explicit justification in the plan.
Rationale: the repository's stated MVP is a polished single-player Car Jam
experience, and secondary systems exist only to support that outcome.

### III. Local-First MVP, Explicit Durability Boundaries
The default architecture MUST remain the current Next.js app, in-app API routes,
and local or lightweight storage until security, durability, or scale demands
more. Any new external backend, database, queue, or hosted service MUST be
justified in the implementation plan, and any temporary storage MUST be clearly
labeled as development-only or MVP-only behind a replaceable boundary. Rationale:
the project intentionally avoids premature platform expansion.

### IV. Evidence-Driven Verification
Every change MUST include verification proportionate to risk using the strongest
available evidence: existing lint/build scripts, targeted manual acceptance
scenarios, and automated tests when covered logic exists or new automated checks
are introduced. Specifications MUST define independently testable user stories and
acceptance scenarios before implementation. Rationale: this repository is still
evolving quickly, so disciplined verification is required even when test coverage
is incomplete.

### V. Lean Architecture, Explicit Contracts
Changes MUST prefer small modules, existing app and API boundaries, and explicit
data contracts over speculative abstractions. New dependencies, services,
cross-cutting frameworks, or hidden side effects MUST be justified in plan
complexity tracking, and gameplay, storage, and API rules MUST be represented in
clear code or documentation. Rationale: the fastest path to a maintainable MVP is
simple structure with visible contracts.

## Product & Platform Constraints

- The primary product MUST remain a kid-friendly, touch-first parking puzzle for
  Telegram users on mobile-sized screens.
- The application MUST stay deliverable as a Next.js Mini App plus Telegram bot
  without requiring a separate backend for MVP scope.
- Referral, rewards, and monetization work MUST NOT block or degrade the core play
  loop, retry flow, or puzzle clarity.
- Storage decisions MUST state whether data is local-only, development-only,
  MVP-persistent, or production-ready.
- User-visible interactions MUST target responsive mobile play and avoid regressions
  that make the primary flow feel cluttered, confusing, or sluggish.

## Delivery Workflow

1. Every feature spec MUST define prioritized user stories, edge cases, measurable
   success criteria, and a short constitution alignment note covering Telegram
   impact, gameplay value, storage choice, and planned verification.
2. Every implementation plan MUST pass the Constitution Check before design work
   proceeds and MUST document any justified complexity, new services, or durable
   storage additions.
3. Every task list MUST group work by independently testable user story and MUST
   include verification tasks for each story, using automated tests when present
   and manual validation steps when automation is absent.
4. Changes to gameplay rules, bot copy, launch behavior, or persistence semantics
   MUST update the relevant documentation in the same change set or be called out
   explicitly as follow-up work.

## Governance

This constitution overrides conflicting local process notes and templates.
Amendments MUST be made in the same change set as any required updates to
dependent templates or runtime guidance. Compliance review MUST happen during
planning and again during implementation or review, with any exception documented
in the plan's complexity tracking section.

Versioning follows semantic versioning for governance:

- MAJOR: remove or redefine a principle in a backward-incompatible way.
- MINOR: add a principle, add a mandatory section, or materially expand guidance.
- PATCH: clarify wording, tighten examples, or make non-semantic refinements.

`README.md` and `GAME_PLAN.md` are supporting guidance documents. If either
conflicts with this constitution, the constitution wins until those documents are
updated.

**Version**: 1.0.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
