# Bansari Commerce Pro — System Architecture

**Version:** 2.0

**Last Updated:** 2026-07-06

---

# Vision

Bansari Commerce Pro is designed as a production-grade ecommerce platform with clear separation of concerns, reusable services, strong security, and scalable architecture.

---

# Technology Stack

## Frontend

* Next.js 16
* React 19
* TypeScript 5.9
* Tailwind CSS v4
* Zustand

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage

## Payments

* Razorpay

---

# High-Level Architecture

```text
Browser
      │
      ▼
Next.js App Router
      │
      ▼
Application Services
      │
      ▼
Supabase
      │
      ▼
PostgreSQL
```

---

# Layered Architecture

```text
Database

↓

Database Types

↓

Adapter

↓

Domain Model

↓

Application Service

↓

UI Components
```

Each layer has one responsibility.

---

# Product Domain

```text
products

↓

DbProduct

↓

Product Adapter

↓

Product

↓

Product Service

↓

Storefront
```

## Responsibilities

### Database

Stores raw data only.

---

### Adapter

Responsible for:

* Image normalization
* Variant mapping
* Specification mapping
* SEO mapping

No UI logic.

---

### Service

Responsible for:

* Reading products
* Business rules
* Filtering
* Search

No rendering.

---

### UI

Receives Product objects only.

Never consumes raw database rows.

---

# Orders Domain

```text
orders

↓

order_items

↓

DbOrder

↓

Order Adapter

↓

Order

↓

Order Service

↓

Checkout

↓

Admin Orders

↓

Dashboard
```

## Snapshot Strategy

Orders permanently store:

Customer

* Name
* Email
* Phone

Shipping

* Name
* Phone
* Email
* Address
* City
* State
* Postal Code
* Country

Billing

* Same structure

Products

* Name
* Slug
* SKU
* Image
* Unit Price

Historical orders must never depend on current product data.

---

# Checkout Flow

```text
Cart

↓

Server validates prices

↓

Razorpay Order

↓

Payment Verification

↓

Create Order

↓

Create Order Items

↓

Reduce Inventory (Future)

↓

Confirmation
```

The server is responsible for:

* Calculating totals
* Verifying payment
* Creating orders

Never trust client totals.

---

# Authentication

```text
Browser

↓

Supabase Auth

↓

Proxy

↓

Protected Routes
```

Future:

```text
profiles

↓

role

↓

admin

customer
```

---

# Database Standards

Every entity follows:

```text
Table

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
```

---

# Service Standards

Every feature should follow:

```text
entity-adapter.ts

↓

entity.service.ts

↓

admin-entity.service.ts
```

Examples:

Product

```text
product-adapter.ts

↓

product.service.ts

↓

admin-product.service.ts
```

Order

```text
order-adapter.ts

↓

order.service.ts

↓

admin-order.service.ts
```

---

# Security Principles

Never trust:

* Browser prices
* Browser totals
* Browser payment status

Server responsibilities:

* Calculate totals
* Verify payment
* Create order
* Apply business rules

Database responsibilities:

* RLS
* Constraints
* Data integrity

---

# RLS Philosophy

Public

* Read storefront products only

Authenticated

* Customer owns customer data

Admin

* Administrative operations only

Service Role

* Checkout
* Payment
* Inventory
* Internal automation

---

# Current Technical Debt

Intentional and scheduled:

* Orders migration pending
* Order services pending
* Checkout persistence pending
* Inventory engine pending
* Customer accounts pending
* Role system pending
* Analytics pending

---

# Future Domains

* Inventory
* Customers
* Categories
* Coupons
* Reviews
* Analytics
* Notifications
* Audit Logs
* Reporting

Each future domain must follow the same layered architecture.
