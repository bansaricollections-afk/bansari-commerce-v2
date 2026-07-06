# Bansari Commerce Pro — AI Context

**Version:** 2.0

**Last Updated:** 2026-07-06

---

# Project Overview

Bansari Commerce Pro is a production-grade ecommerce platform for **Bansari Collections**.

Objectives:

* Clean Architecture
* Production-ready code
* High maintainability
* Strong security
* Excellent performance
* Scalable domain-driven structure

---

# Technology Stack

## Frontend

* Next.js 16
* React 19
* TypeScript 5.9
* Tailwind CSS v4

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage

## Payments

* Razorpay

## State

* Zustand

## Routing

* App Router

---

# Mandatory Development Rules

These rules are mandatory.

* Never rewrite working code.
* Never redesign UI unless requested.
* Work in small iterations.
* Maximum 3 files per iteration.
* Explain the implementation plan before coding.
* Wait for approval before modifying code.
* The repository is always the source of truth.
* Never assume previous chat implementations exist unless present in the repository.

Every iteration must finish with:

```bash
npm run build
npx tsc --noEmit
```

Fix every issue before stopping.

---

# Completed Milestones

## Infrastructure

Completed

* Next.js 16
* React 19
* TypeScript 5.9
* Tailwind CSS v4
* App Router
* Supabase
* Razorpay
* Zustand
* Git

Status

✅ Complete

---

## Storefront

Completed

* Product Grid
* Product Detail
* Featured Products
* Complete Look
* Wishlist
* Search
* Supabase Product Integration

Status

✅ Complete

---

## Product Domain

Completed

* Unified Product Service
* Shared Product Architecture
* Shared Normalization
* Browser / Server separation
* Product CRUD
* Build Passing
* TypeScript Passing

The Product domain is considered complete.

Do not refactor it further unless required by a future feature.

Status

✅ Complete

---

# Current Milestone

## Orders Foundation

Architecture

✅ Approved

Schema

✅ Approved

Security Model

✅ Approved

Payment Lifecycle

✅ Approved

Order Lifecycle

✅ Approved

Snapshot Strategy

✅ Approved

Current Iteration

Generate a single Supabase migration implementing:

* orders
* order_items

No UI.

No services.

No checkout changes.

No dashboard changes.

---

# Approved Orders Design

Orders

* UUID primary key
* Nullable auth.users reference
* Unique order number
* Customer snapshot
* Structured shipping snapshot
* Structured billing snapshot
* Billing same as shipping
* Currency
* Subtotal
* Discount
* Shipping fee
* Tax
* Grand total
* Payment method
* Payment provider
* Payment reference
* Razorpay order id
* Razorpay payment id
* Payment status
* Order status
* Notes
* payment_verified_at
* paid_at
* cancelled_at
* delivered_at
* deleted_at
* created_at
* updated_at

Order Items

* UUID primary key
* order_id FK
* product_id FK (nullable)
* product_name
* product_slug
* product_sku
* product_image
* variant_color
* variant_size
* unit_price
* quantity
* line_total
* created_at
* updated_at

---

# Architecture Principles

Every domain follows:

Database

↓

Db Type

↓

Adapter

↓

Domain Model

↓

Service

↓

UI

Never duplicate:

* adapters
* normalization
* business logic

---

# Browser / Server Separation

Server reads

↓

service.ts

Browser writes

↓

admin-service.ts

Never import server-only modules into client components.

---

# Security Principles

Never trust:

* client prices
* client totals
* client payment status

Server must:

* recalculate totals
* verify payments
* create orders

RLS is the last line of defense, not the first.

---

# Current Technical Debt

Known items (intentional):

* Orders schema not yet implemented
* Checkout still trusts client amount
* Order creation not yet coupled to payment verification
* No inventory decrement
* No customer account system
* No role-based authorization

These are planned and should not be worked around.

---

# Development Workflow

Architecture

↓

Approval

↓

Implementation

↓

Build

↓

Review

↓

Commit

---

# Git Strategy

Small commits.

One logical feature.

Passing build.

Passing TypeScript.

No mixed refactoring and feature commits.

---

# Current Status

Infrastructure ✅

Storefront ✅

Product Domain ✅

Orders Architecture ✅

Orders Migration ⏳

Order Service ⏳

Checkout Integration ⏳

Dashboard Integration ⏳

Inventory ⏳

Customers ⏳

Categories ⏳

Coupons ⏳

Reviews ⏳

Analytics ⏳

Production Hardening ⏳
