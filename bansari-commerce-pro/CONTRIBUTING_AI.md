# Contributing Guide for AI Assistants

**Version:** 2.0

**Last Updated:** 2026-07-06

---

# Purpose

This repository is developed with assistance from multiple AI systems.

Every AI must follow the same engineering standards to maintain a consistent, production-quality codebase.

---

# Source of Truth

The repository is always the source of truth.

Never assume that work discussed in a previous conversation exists unless it is present in the repository.

If documentation and code differ:

1. Report the differences.
2. Treat the repository as authoritative.
3. Wait for approval before correcting documentation.

---

# Development Rules

Always:

* Explain the implementation plan.
* Wait for approval.
* Work in small iterations.
* Modify a maximum of **3 files per iteration** unless explicitly approved.
* Preserve existing working functionality.
* Reuse existing architecture whenever possible.

Never:

* Rewrite working code.
* Redesign UI unless requested.
* Introduce duplicate business logic.
* Introduce duplicate adapters.
* Introduce duplicate normalization logic.
* Modify unrelated files.

---

# Architecture Standards

Every domain should follow:

Database

↓

Database Type

↓

Adapter

↓

Domain Model

↓

Service

↓

UI

Never bypass layers.

---

# Browser / Server Separation

Server responsibilities:

* Database reads
* Business logic
* Payment verification
* Security checks

Browser responsibilities:

* User interaction
* Forms
* Rendering
* Optimistic UI

Never import server-only modules into client components.

---

# Database Standards

Before creating a migration:

* Review existing migrations.
* Reuse existing trigger functions.
* Reuse shared utilities.
* Do not duplicate database functions.

All new tables should include:

* Primary key
* Foreign keys
* Appropriate indexes
* RLS
* Constraints
* created_at
* updated_at

Use UUID primary keys unless there is a compelling reason not to.

---

# Security Standards

Never trust:

* Client prices
* Client totals
* Client payment status
* Client roles

Server must always:

* Recalculate totals
* Verify payments
* Validate authorization

RLS complements application security; it does not replace it.

---

# Build Verification

Every implementation must finish with:

```bash
npm run build
npx tsc --noEmit
```

Resolve all errors before stopping.

---

# Git Standards

One logical feature per commit.

Do not mix refactoring with feature development.

Commit only after:

* Build passes
* TypeScript passes
* Architecture review completed

---

# AI Workflow

Every implementation follows:

1. Repository review
2. Architecture analysis
3. Implementation plan
4. User approval
5. Code changes
6. Build verification
7. Review
8. Commit

Never skip the approval step.

---

# Response Expectations

When implementing a feature, provide:

1. Summary
2. Files to modify
3. Risks
4. Implementation plan

After implementation, provide:

1. Files changed
2. Build results
3. TypeScript results
4. Remaining technical debt

---

# Project Goal

The objective is not simply to build a working ecommerce application.

The objective is to build a maintainable, secure, scalable, production-grade commerce platform that can evolve over time while preserving clean architecture and engineering quality.
