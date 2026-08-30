# Landlord

A rental management SaaS built to replace the paper ledger, scattered payment notes, and stressful rent tracking that many landlords still rely on.

## The story

This project started from a very simple problem: a landlord was still writing rent records in a book, tracking payments by memory, and trying to keep everything organized without a proper system. I built this software because I saw firsthand how broken and stressful that process was.

What began as a practical tool for one landlord quickly grew into something bigger: a general-purpose property and rent management platform for anyone managing tenants, units, and payments. The idea was simple — give each user their own account, their own data, and a clear view of everything that matters.

The product is not just a digital notebook. It is a system for managing properties, tenants, rent, deposits, service charges, and payment history in one place. It was designed to help landlords reduce admin work, avoid errors, and make decisions with confidence instead of relying on memory or paper records.

The initial version was built from real frustration and practical need. It was not created in a lab or idealized in a pitch deck — it was built because the problem actually existed. That made it honest, useful, and easy to imagine as a product.

## Why this matters

In many places, especially in Kenya, property management still runs informally. Landlords keep records in handwritten books, use WhatsApp messages, or rely on personal memory. That may work for a while, but it breaks down as soon as the portfolio grows or the number of tenants increases.

This product aims to change that by giving small landlords and property managers a better way to:

- track units and occupancy
- store tenant details
- record rent and deposits
- monitor payment balances
- calculate what is due and what is still pending
- access a clearer picture of the business without manual bookkeeping

## Product vision

This is designed as a SaaS platform for people who are not necessarily software companies, but who need software that feels reliable, affordable, and practical.

The vision is to help landlords run their rental operations with less chaos and more clarity. Instead of scattered notes, mismatched records, and manual calculations, they get a system that keeps everything in one place.

## Who it serves

This platform is built for:

- independent landlords
- small property managers
- family-run rental businesses
- caretakers and building managers
- anyone managing multiple units or tenants
- small housing operators who need a simple digital system

It is especially useful for people who do not need enterprise software, but do need a system that is secure, organized, and easy to use.

## Key product features

- property and unit management
- house type and rental categorization
- tenant profiles with contact and move-in information
- payment tracking for rent and deposits
- balance calculation for overdue or unpaid amounts
- service charges for recurring costs
- dashboard view for occupancy and financial insights
- multi-tenant account structure with isolated data

## System design and architecture

The application is built with modern web technologies and a clear SaaS-oriented data model.

### Core data model

The database is designed around a multi-tenant structure:

- Organization: the root container for a landlord or property management account
- OrgMember: ties users to organizations and roles
- HouseType: category for different property types
- Unit: each physical rental unit
- Tenant: tenant identity and housing relationship
- Payment: rent and deposit entries, balances, due dates, and payment status
- Service: recurring charges such as water, garbage, or maintenance fees
- User: account identity, auth data, and role information
- AuditLog: operational log of important actions

This structure supports controlled ownership, better reporting, and future scaling beyond a single landlord.

### Design principles applied

- multi-tenancy: each organization owns its own data
- role separation: users can belong to organizations with different responsibilities
- data isolation: records are scoped to the organization and owner
- clear domain organization: properties, payments, tenants, and services are separated cleanly
- query-based reporting: indexes on entities such as payment status, due date, tenant, and period
- reliability: cascade deletes and consistent relationship design reduce orphaned records
- scalability: the schema is prepared for more landlords, units, and tenants without redesigning the system

## Login and security

The authentication layer is implemented with NextAuth and includes several important safeguards.

### Authentication features

- email and password authentication
- Google sign-in support
- password hashing using bcrypt
- email verification before access is granted
- rate limiting for failed login attempts by IP and email
- JWT-based sessions with refreshable user identity
- role-based access management
- password-change invalidation for active sessions
- safe redirect handling after login

### Security principles

- brute-force protection through rate limiting
- hashed credentials instead of plaintext storage
- restricted session behavior when the user password changes
- per-user and per-organization account boundaries
- no broad cross-user access by default

This is important because a rental system often contains sensitive personal and financial data. Trust is a product requirement, not an extra feature.

## How it works

A typical flow looks like this:

1. A user signs up for an account.
2. A default organization is created for them.
3. They add house types and rental units.
4. They define tenant profiles and assign them to a unit.
5. They record rent and deposit information.
6. They monitor outstanding balances and payment statuses.
7. They access a dashboard that gives a cleaner view of their rental business.

The product is designed to reduce manual effort while keeping the workflow familiar to landlords who may not be highly technical.

## Kenya-specific context

This product is especially relevant in Kenya because many small landlords and property managers still rely on informal systems:

- handwritten ledgers
- WhatsApp payment confirmations
- memory-based tenant tracking
- inconsistent rent records
- manual reconciliation at the end of the month

These methods are common because they are simple, but they are also unreliable. As the number of tenants grows, the cost of poor record-keeping increases. The system is meant to reduce that cost and make property management more predictable.

The opportunity in Kenya is not only technical — it is also about trust, affordability, and usability. A lot of local users need tools that are simple enough to understand and practical enough to use every day.

## Why this is not a completely new idea

The important lesson in this project is that the problem is real, but not unique. Many people have already built rent management and property tracking tools. That is not a flaw — it is evidence that the market exists.

The real question is not whether the idea exists. The real question is whether the product solves it in a better way for a specific audience.

In this case, the opportunity is to build something that is:

- simpler for everyday landlords
- more affordable for smaller operators
- more grounded in local workflows
- easier to trust and adopt in the real world

That is where product differentiation can come from.

## Why this project matters to me

This project is a reminder that many businesses begin from a personal frustration, not a polished strategy. It started with a real pain point and a desire to fix it. That is often how meaningful products begin.

It is also a reminder that building software is only part of the story. The bigger challenge is turning a useful tool into a product people trust, pay for, and adopt consistently.

## Getting started

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Tech stack

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth
- Tailwind CSS
- bcrypt for password hashing

## Project status

This project is a working rental management platform prototype and SaaS foundation focused on practical property management workflows.

## License

This project is currently a personal product prototype and is not yet formally licensed for commercial use.
