# Bansari Commerce Pro — Architecture Decision Records (ADR)

**Version:** 2.0

**Last Updated:** 2026-07-06

---

# Purpose

This document records important architectural decisions made during the development of Bansari Commerce Pro.

Each ADR explains **what** was decided and **why**.

These decisions should not be changed without careful review.

---

# ADR-001

## Title

Use Adapter Pattern

### Status

Accepted

### Decision

Every database entity must pass through an adapter before reaching the UI.

```
Database Row

↓

Adapter

↓

Domain Model

↓

UI
```

### Reason

* Separation of concerns
* Easier schema evolution
* Cleaner services
* Consistent transformations

---

# ADR-002

## Title

Separate Browser and Server Responsibilities

### Status

Accepted

### Decision

Server

* Business logic
* Database reads
* Security
* Payment verification

Browser

* Forms
* Rendering
* User interaction

### Reason

Avoid importing server-only modules into client components and improve security.

---

# ADR-003

## Title

Single Source of Normalization

### Status

Accepted

### Decision

Normalization logic must exist in one place only.

### Reason

Prevent duplicated mapping logic and long-term maintenance drift.

---

# ADR-004

## Title

Normalized Order Storage

### Status

Accepted

### Decision

Orders use two tables.

```
orders

↓

order_items
```

### Reason

* Reporting
* Inventory
* Analytics
* Scalability

---

# ADR-005

## Title

Snapshot Strategy

### Status

Accepted

### Decision

Orders permanently snapshot:

Customer

* Name
* Email
* Phone

Shipping

* Address
* Contact

Billing

* Address
* Contact

Products

* Name
* Slug
* SKU
* Image
* Price

### Reason

Historical orders must remain accurate even if products or customer data change.

---

# ADR-006

## Title

Server Owns Payment Verification

### Status

Accepted

### Decision

The browser never determines payment success.

The server must verify every payment before creating an order.

### Reason

Prevent payment fraud and ensure data integrity.

---

# ADR-007

## Title

Server Calculates Totals

### Status

Accepted

### Decision

The browser never provides authoritative totals.

The server recalculates:

* Price
* Discounts
* Shipping
* Tax
* Total

### Reason

Prevent client-side manipulation.

---

# ADR-008

## Title

Repository is the Source of Truth

### Status

Accepted

### Decision

The repository always overrides:

* Chat history
* Assumptions
* Documentation

### Reason

Avoid implementing features that exist only in discussion.

---

# ADR-009

## Title

Small Iterations

### Status

Accepted

### Decision

Development proceeds in small, reviewable iterations.

Default limit:

* Maximum 3 files per iteration.

### Reason

Lower risk, easier reviews, simpler debugging.

---

# ADR-010

## Title

Documentation Before Major Features

### Status

Accepted

### Decision

Large architectural changes require updated documentation before implementation.

### Reason

Keep future AI sessions and contributors aligned with the project's direction.

---

# ADR-011

## Title

Security First

### Status

Accepted

### Decision

Every feature must consider:

* Authorization
* Validation
* Least privilege
* Database constraints
* Row Level Security

### Reason

Security is a design requirement, not a later enhancement.

---

# ADR-012

## Title

Production Readiness Over Feature Count

### Status

Accepted

### Decision

The project prioritizes maintainability, correctness, and scalability over rapid feature delivery.

### Reason

A smaller, reliable system is preferable to a larger, fragile one.

---

# Future ADRs

Record all future architectural decisions here, including:

* Inventory strategy
* Customer accounts
* Role-based authorization
* Notifications
* Audit logging
* Analytics architecture
* Deployment architecture
* Backup and recovery
* Multi-payment provider support
* Multi-language support
