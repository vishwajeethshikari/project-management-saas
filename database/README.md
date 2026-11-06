# 🗄️ Daily Development Log — Database Architecture

## Update: October 26, 2026 — Initial Relational Schema & Seeding Setup

### Overview
Successfully architected and deployed the foundational SQL schema and mock dataset for the Project Management SaaS platform. This database architecture provides multi-tenant isolation, user authentication modeling, project hierarchy, and Kanban task tracking with foreign key constraints and cascading behavior.

---

### Database Specifications
* **Database Engine:** PostgreSQL
* **Schema Files:** `database/schema.sql` (Data Definition Language) & `database/seed.sql` (Data Manipulation Language)

---

### Key Features & Tables Delivered Today

#### 1. User Authentication & Roles (`users`)
* Configured core user attributes including `id`, `full_name`, `email`, `password_hash`, `role`, and `created_at`.
* Enforced `UNIQUE` constraint on `email` to guarantee account uniqueness.

#### 2. Multi-Tenancy Workspace Structure (`workspaces` & `workspace_members`)
* **`workspaces`:** Defined workspace entities owned by a user (`owner_id`) with `ON DELETE CASCADE`.
* **`workspace_members`:** Built a junction table mapping workspace-to-user access levels with composite unique constraint `UNIQUE(workspace_id, user_id)`.

#### 3. Project Management Scoping (`projects`)
* Structured project grouping tied directly to `workspace_id`.
* Enforced status tracking (`active`, `archived`) and creator references.

#### 4. Kanban Task Workflow (`tasks`)
* Structured complete task entity supporting Kanban stages.
* **Status Enum Constraints:** `CHECK (status IN ('todo', 'in_progress', 'review', 'done'))`.
* **Priority Enum Constraints:** `CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`.
* Integrated assignment routing (`assigned_to`) with `ON DELETE SET NULL` safety checks.

---

### Execution & Seeding Guide

To initialize the database schema locally, run the following SQL scripts in your PostgreSQL client:

```bash
# 1. Run Table Schema
psql -U postgres -d project_saas_db -f database/schema.sql

# 2. Populate Seed Data
psql -U postgres -d project_saas_db -f database/seed.sql