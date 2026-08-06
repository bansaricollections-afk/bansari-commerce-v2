# AI Development Guide

This repository is developed with assistance from multiple AI systems.

Every AI working on this project must follow these rules.

---

# Core Rules

Never rewrite working code.

Never redesign UI unless requested.

Never introduce duplicate business logic.

Never introduce duplicate adapters.

Never introduce duplicate normalization.

Never modify unrelated files.

---

# Iteration Rules

Maximum 3 files per iteration.

Explain the implementation plan first.

Wait for approval.

After implementation run

```bash
npm run build

npx tsc --noEmit
```

Fix every error before stopping.

---

# Architecture Rules

Database

↓

DbType

↓

Adapter

↓

Domain Model

↓

Service

↓

UI

Never skip layers.

---

# Browser / Server Rules

Server reads remain server-side.

Browser writes remain browser-side.

Never import server-only modules into client components.

---

# Git Rules

One logical feature.

One commit.

Passing build.

Passing TypeScript.

---

# Current Architecture

Product

product-adapter.ts

↓

product.service.ts

↓

admin-product.service.ts

Future

Order

order-adapter.ts

↓

order.service.ts

↓

admin-order.service.ts

---

# AI Workflow

Architecture

↓

Implementation

↓

Review

↓

Commit

---

# Goal

Build a production-ready ecommerce platform with clean architecture and maintainable code.

Quality is preferred over speed.
