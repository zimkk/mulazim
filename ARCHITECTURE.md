# Personal Project Tracker — Architecture


## Table of Contents

- [1. Product Overview](#1-product-overview)
- [2. Core Requirements](#2-core-requirements)
- [3. Technology Stack](#3-technology-stack)
- [4. High-Level Architecture](#4-high-level-architecture)
- [5. Architectural Principles](#5-architectural-principles)
- [6. Desktop Architecture](#6-desktop-architecture)
- [7. Frontend Architecture](#7-frontend-architecture)
- [8. State Management](#8-state-management)
- [9. Supabase Architecture](#9-supabase-architecture)
- [10. Authentication](#10-authentication)
- [11. Security Model](#11-security-model)
- [12. Database Model](#12-database-model)
- [13. Database Tables](#13-database-tables)
- [14. Database Relationships](#14-database-relationships)
- [15. Project Health](#15-project-health)
- [16. Stale Project Detection](#16-stale-project-detection)
- [17. Dashboard](#17-dashboard)
- [18. Dashboard Layout](#18-dashboard-layout)
- [19. Work Recommendation Queue](#19-work-recommendation-queue)
- [20. Clients Screen](#20-clients-screen)
- [21. Projects Screen](#21-projects-screen)
- [22. Project Detail Screen](#22-project-detail-screen)
- [23. Task Management](#23-task-management)
- [24. Daily Workflow](#24-daily-workflow)
- [25. Activity Tracking](#25-activity-tracking)
- [26. Future GitHub Integration](#26-future-github-integration)
- [27. Future Calendar Integration](#27-future-calendar-integration)
- [28. Future Notifications](#28-future-notifications)
- [29. Future AI Layer](#29-future-ai-layer)
- [30. Supabase Data Flow](#30-supabase-data-flow)
- [31. Local Storage](#31-local-storage)
- [32. Offline Behavior](#32-offline-behavior)
- [33. Application Update Architecture](#33-application-update-architecture)
- [34. Versioning](#34-versioning)
- [35. GitHub Actions Release Pipeline](#35-github-actions-release-pipeline)
- [36. Windows Distribution](#36-windows-distribution)
- [37. Update UX](#37-update-ux)
- [38. Update Security](#38-update-security)
- [39. Update Failure Handling](#39-update-failure-handling)
- [40. Database Migrations](#40-database-migrations)
- [41. Repository Structure](#41-repository-structure)
- [42. Application Modules](#42-application-modules)
- [43. Error Handling](#43-error-handling)
- [44. Loading UX](#44-loading-ux)
- [45. Empty States](#45-empty-states)
- [46. Search and Filtering](#46-search-and-filtering)
- [47. Keyboard-first UX](#47-keyboard-first-ux)
- [48. Visual Design Direction](#48-visual-design-direction)
- [49. Performance](#49-performance)
- [50. Environment Configuration](#50-environment-configuration)
- [51. Backup and Data Ownership](#51-backup-and-data-ownership)
- [52. Multi-Device Flow](#52-multi-device-flow)
- [53. Reinstall Flow](#53-reinstall-flow)
- [54. Development and Release Workflow](#54-development-and-release-workflow)
- [55. MVP Scope](#55-mvp-scope)
- [56. Explicitly Out of MVP](#56-explicitly-out-of-mvp)
- [57. Phase 2](#57-phase-2)
- [58. Phase 3](#58-phase-3)
- [59. Long-Term Architecture](#59-long-term-architecture)
- [60. Core Product Philosophy](#60-core-product-philosophy)
- [61. Non-Negotiable Requirements](#61-non-negotiable-requirements)
- [62. Definition of Success](#62-definition-of-success)
- [63. Architecture Decision Summary](#63-architecture-decision-summary)

> **Document:** Complete architecture and product specification for the Personal Project Tracker.
> **Status:** Architecture baseline for implementation.

## 1. Product Overview

This project is a **personal, cloud-first desktop project and task tracking application** for a developer who works on many things simultaneously:

- Freelance work for approximately 8–10 clients
- Client websites and ongoing maintenance
- Company/internal tasks that need to be handled alongside freelance work
- Personal software projects

The application's primary purpose is simple:

> Give one person a reliable place to see every active piece of work and make sure nothing gets forgotten, neglected, or left behind while working on something else.

This is **not intended to be a Jira, Linear, ClickUp, or enterprise project-management clone**. It should remain fast, minimal, personal, and low-maintenance.

---

## 2. Core Requirements

### 2.1 Personal desktop application

The application should be a real desktop application rather than a browser-only web application.

Initial target:

- Windows
- Installable application
- Normal desktop application behavior
- `.exe`/Windows installer distribution

The architecture should leave room for macOS/Linux later without making them a requirement for the MVP.

### 2.2 Cloud-based data

The application must use a cloud database rather than SQLite as its primary data store.

The desired workflow is:

```text
Install application on Computer A
        ↓
Login
        ↓
Cloud data loads
```

Then:

```text
Install application on Computer B
        ↓
Login with same account
        ↓
Same clients/projects/tasks appear
```

No manual database copying should be required.

### 2.3 One-time installation + automatic updates

This is one of the most important product requirements.

The user should install the application once. Normal future application changes should not require manually downloading and reinstalling the application.

Desired workflow:

```text
Developer changes application
        ↓
Push code to GitHub
        ↓
GitHub Actions builds release
        ↓
Release is published
        ↓
Installed application checks for update
        ↓
"Update Available"
        ↓
User clicks Install Update
        ↓
Update downloads
        ↓
Update installs
        ↓
Application restarts
        ↓
New version is running
```

A future option may support silent/background updates, but the initial UX should provide a clear update notification and one-click installation.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2 |
| Native layer | Rust |
| Frontend | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Client/UI state | Zustand |
| Server state | TanStack Query |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Authorization | PostgreSQL Row Level Security |
| Backend platform | Supabase |
| Source control | GitHub |
| CI/CD | GitHub Actions |
| Release hosting | GitHub Releases |
| Desktop updates | Tauri Updater |
| Initial platform | Windows |
| Primary data store | Cloud PostgreSQL |
| Local database | Not required for MVP |

---

## 4. High-Level Architecture

```text
                              USER
                               │
                               ▼
                  ┌──────────────────────────┐
                  │      Tauri Desktop App   │
                  │                          │
                  │  React + TypeScript UI   │
                  │                          │
                  │  Dashboard               │
                  │  Clients                 │
                  │  Projects                │
                  │  Tasks                   │
                  │  Activity                │
                  │  Settings                │
                  └────────────┬─────────────┘
                               │
                         Tauri / IPC
                               │
                  ┌────────────▼─────────────┐
                  │      Tauri / Rust        │
                  │                          │
                  │  Native desktop APIs     │
                  │  Notifications           │
                  │  Update integration      │
                  │  Secure native actions   │
                  └────────────┬─────────────┘
                               │
                               │ HTTPS
                               ▼
                  ┌──────────────────────────┐
                  │        Supabase          │
                  │                          │
                  │  Supabase Auth           │
                  │  PostgreSQL              │
                  │  Row Level Security      │
                  │  Realtime (future)       │
                  └──────────────────────────┘

                   APPLICATION DISTRIBUTION

                  ┌──────────────────────────┐
                  │         GitHub           │
                  │                          │
                  │  Repository              │
                  │  GitHub Actions          │
                  │  Releases                │
                  │  Signed Artifacts        │
                  └────────────┬─────────────┘
                               │
                         Tauri Updater
                               │
                               ▼
                  ┌──────────────────────────┐
                  │    Installed App         │
                  │                          │
                  │ Check → Download →       │
                  │ Install → Restart        │
                  └──────────────────────────┘
```

---

## 5. Architectural Principles

### 5.1 Simple first

The application should solve the user's actual problem before adding sophisticated features.

The first question the application should answer is:

> What do I need to work on, and what am I currently neglecting?

### 5.2 Cloud-first

Supabase PostgreSQL is the source of truth for user data.

### 5.3 Desktop-first

The application is designed as a native-feeling desktop utility rather than a website wrapped in a shell.

### 5.4 Update-once

Application installation and application data are separate concerns.

Updating/reinstalling the application must not remove the user's cloud data.

### 5.5 Automation-friendly

The data model should make future integrations possible without requiring a rewrite.

### 5.6 AI later

AI should enhance structured project/task data later. It should not be required for the basic tracking system to work.

### 5.7 Low maintenance

This is a personal tool maintained by a single developer, so unnecessary infrastructure and abstractions should be avoided.

---

## 6. Desktop Architecture

### 6.1 Tauri 2

Tauri 2 is the desktop framework.

Responsibilities include:

- Desktop application packaging
- Window management
- Native OS integration
- Native notifications
- Secure native functionality
- Updater integration
- Windows installer generation

The frontend remains responsible for most application UI and application-level workflows.

### 6.2 React + TypeScript

React is responsible for:

- Screens
- Components
- Forms
- Client-side interactions
- Dashboard presentation
- Project/task management
- Authentication UI

TypeScript should be used throughout the frontend with strict type checking enabled.

### 6.3 Rust

Rust should remain relatively small in the MVP.

Use Rust/Tauri commands when functionality genuinely requires native capabilities.

Do not move normal CRUD/business logic into Rust without a reason.

---

## 7. Frontend Architecture

Recommended structure:

```text
src/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── clients/
│   ├── projects/
│   ├── tasks/
│   └── activity/
│
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Clients.tsx
│   ├── ClientDetail.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   └── Settings.tsx
│
├── hooks/
├── lib/
│   ├── supabase.ts
│   ├── queries/
│   ├── mutations/
│   └── utils/
│
├── stores/
├── services/
├── types/
├── App.tsx
└── main.tsx
```

The exact directory structure can evolve, but feature boundaries should remain clear.

---

## 8. State Management

### Server state

Use **TanStack Query** for data coming from Supabase.

Example:

```text
React Component
      ↓
TanStack Query
      ↓
Supabase
      ↓
PostgreSQL
```

Use query invalidation after mutations rather than manually maintaining duplicated copies of server data.

### Client/UI state

Use **Zustand** only for local application state such as:

- Sidebar state
- Modal state
- Temporary UI preferences
- Selected filters
- Short-lived UI state

Do not put the entire database into a global Zustand store.

---

## 9. Supabase Architecture

Supabase is the cloud backend.

It provides:

- Authentication
- PostgreSQL database
- Row Level Security
- API access
- Optional Realtime capabilities in the future

The MVP does not require a separate custom API server.

The desktop client can communicate with Supabase using the official Supabase client.

---

## 10. Authentication

The application should support authenticated user accounts.

Initial authentication can use:

- Email/password

Future options:

- Google OAuth
- Magic links

Authentication flow:

```text
Application starts
      ↓
Check Supabase session
      ↓
┌───────────────┐
│ Session exists│
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
Dashboard   Login
             │
             ▼
         Authenticate
             │
             ▼
         Dashboard
```

The application should persist the authenticated session using the appropriate Supabase/Tauri-supported storage mechanism.

---

## 11. Security Model

### 11.1 Row Level Security

RLS is mandatory.

Every user-owned record must be associated with the authenticated user's ID.

Example concept:

```sql
user_id uuid references auth.users(id)
```

Policies should enforce:

```sql
auth.uid() = user_id
```

Frontend filtering is **not** a security boundary.

### 11.2 Service-role key

Never ship the Supabase service-role key inside the desktop application.

The application should use the public/anonymous key and rely on Supabase Auth + RLS for user authorization.

Any privileged operation should happen in a secure backend/edge function if it becomes necessary.

---

## 12. Database Model

The core relationship is:

```text
User
 │
 ├── Clients
 │     │
 │     └── Projects
 │            │
 │            └── Tasks
 │
 ├── Projects (personal/company)
 │       │
 │       └── Tasks
 │
 └── Activity Logs
```

The project `type` field allows client, company, personal, and maintenance work to coexist without requiring separate systems.

---

## 13. Database Tables

### 13.1 profiles

```text
profiles
--------
id
 display_name
 avatar_url
 created_at
 updated_at
```

`id` corresponds to the authenticated Supabase user.

---

### 13.2 clients

```text
clients
-------
id
user_id
name
company_name
email
notes
status
created_at
updated_at
```

Suggested statuses:

```text
active
inactive
archived
```

---

### 13.3 projects

```text
projects
--------
id
user_id
client_id
name
description
type
status
priority
deadline
last_activity_at
created_at
updated_at
```

#### Project type

```text
client
company
personal
maintenance
other
```

#### Project status

```text
active
on_hold
completed
archived
```

#### Project priority

```text
low
medium
high
urgent
```

`client_id` is nullable.

Examples:

```text
Client website
    type = client
    client_id = Client A

Company internal work
    type = company
    client_id = null

Personal project
    type = personal
    client_id = null
```

---

### 13.4 tasks

```text
tasks
-----
id
user_id
project_id
title
description
status
priority
due_date
completed_at
estimated_minutes
actual_minutes
created_at
updated_at
```

#### Task status

```text
todo
in_progress
blocked
done
cancelled
```

#### Task priority

```text
low
medium
high
urgent
```

---

### 13.5 activity_logs

```text
activity_logs
-------------
id
user_id
project_id
task_id
activity_type
description
metadata
created_at
```

Examples:

```text
task_created
task_completed
task_updated
project_updated
status_changed
note_added
manual_activity
```

`metadata` can be JSON/JSONB for integration-specific information.

---

## 14. Database Relationships

Recommended relationships:

```text
profiles.id
    │
    ├── clients.user_id
    ├── projects.user_id
    ├── tasks.user_id
    └── activity_logs.user_id

clients.id
    │
    └── projects.client_id

projects.id
    │
    ├── tasks.project_id
    ├── activity_logs.project_id
    └── activity_logs.task_id (indirectly related through task)
```

All foreign keys should be indexed where appropriate.

Common query columns such as `user_id`, `project_id`, `status`, `due_date`, and `last_activity_at` should be considered for indexes as the dataset grows.

---

## 15. Project Health

Project health is a central feature because the application's purpose is to prevent work from silently being neglected.

Suggested states:

```text
Healthy
Attention Needed
Stale
Overdue
Completed
On Hold
```

Health should be derived rather than stored permanently unless there is a later performance reason to cache it.

Potential inputs:

- Project status
- Open task count
- Overdue tasks
- Due date
- Priority
- Last activity

Example:

```text
Urban Crust Website

Last activity: 8 days ago
Open tasks: 4
Overdue tasks: 1

Health: ATTENTION NEEDED
```

---

## 16. Stale Project Detection

This is one of the most important pieces of the application.

Example default thresholds:

```text
0–2 days    Active
3–6 days    Normal
7–13 days   Attention Needed
14+ days    Stale
```

These should eventually become configurable.

A project explicitly marked `on_hold` should not generate normal stale warnings.

The system should avoid treating inactivity as automatically negative because some projects naturally have gaps.

---

## 17. Dashboard

The dashboard is the application's primary screen.

Its job is to answer:

> What needs my attention right now?

Recommended hierarchy:

1. Overdue tasks
2. Tasks due today/soon
3. High/urgent priority work
4. Stale projects
5. Attention-needed projects
6. In-progress work
7. Recent activity

Avoid meaningless dashboards full of statistics.

---

## 18. Dashboard Layout

Conceptually:

```text
┌─────────────────────────────────────────────┐
│ Good evening                                │
│                                             │
│ Today's Focus                               │
│                                             │
│ [Task 1] [Task 2] [Task 3]                 │
│                                             │
│ Needs Attention                             │
│                                             │
│ Client A        8 days inactive             │
│ Client B        1 overdue task              │
│ Project C       Deadline tomorrow           │
│                                             │
│ Active Projects                             │
│                                             │
│ Client A       4 tasks       Healthy        │
│ Client B       2 tasks       Attention      │
│ Personal       6 tasks       Active         │
└─────────────────────────────────────────────┘
```

The exact visual design can evolve, but the information hierarchy should remain.

---

## 19. Work Recommendation Queue

A lightweight deterministic system should rank what deserves attention.

Example:

```text
Recommended Focus

1. Fix Client A checkout
   High priority
   Due today

2. Review company deployment
   Urgent
   Due tomorrow

3. Update Client B website
   Attention needed
   Last activity: 9 days ago
```

The MVP does not require AI for this.

A score can be calculated using:

```text
Priority
Due date
Overdue status
Project health
Task status
Staleness
```

AI can later enhance this ranking.

---

## 20. Clients Screen

The Clients screen represents freelance/client relationships.

Each client should expose:

- Name
- Company
- Contact information
- Notes
- Active projects
- Open tasks
- Last activity

Example:

```text
Clients

Client A
Website + Maintenance
3 active tasks
Last activity: Today

Client B
Website
5 active tasks
Last activity: 4 days ago

Client C
Maintenance
1 active task
Last activity: 12 days ago
```

---

## 21. Projects Screen

The Projects screen should support:

- Create project
- Edit project
- Archive project
- Search
- Filter
- Sort
- Status
- Priority
- Deadline
- Client association

Suggested filters:

```text
All
Active
Needs Attention
Stale
Overdue
Completed
On Hold
```

---

## 22. Project Detail Screen

A project should be understandable from one screen.

Recommended sections:

```text
Project Name
Client
Type
Status
Priority
Deadline
Health
Description

Tasks
-----

Activity
--------

Notes
-----
```

The user should not need to navigate through multiple screens to understand project status.

---

## 23. Task Management

Task creation should be fast.

Required fields:

```text
Title
Project
```

Recommended fields:

```text
Priority
Due date
Status
Description
Estimate
Notes
```

Quick task creation should be available from the dashboard.

---

## 24. Daily Workflow

Typical workflow:

```text
Open application
      ↓
Dashboard
      ↓
Review overdue / attention items
      ↓
Choose today's focus
      ↓
Work
      ↓
Update task/project
      ↓
Activity recorded
      ↓
Continue working
```

The application should require minimal administrative effort.

---

## 25. Activity Tracking

Application actions should automatically create lightweight activity records where useful.

Examples:

```text
Task created
Task completed
Task moved to in-progress
Project updated
Deadline changed
Status changed
```

Manual activity/notes can also be supported.

This activity layer is important for future integrations.

---

## 26. Future GitHub Integration

GitHub integration is intentionally excluded from the MVP but the architecture should support it.

Possible flow:

```text
GitHub Repository
        ↓
Commits
Pull Requests
Issues
Releases
        ↓
Project Activity
```

Example:

```text
Project: Personal App

GitHub activity:
3 commits today
1 PR merged
Last commit: 35 minutes ago
```

GitHub activity can eventually update `last_activity_at` automatically.

---

## 27. Future Calendar Integration

Potential providers:

- Google Calendar
- Outlook Calendar

Possible flow:

```text
Calendar
   ↓
Meetings / deadlines
   ↓
Project timeline
   ↓
Dashboard
```

This should be implemented after the core tracker is stable.

---

## 28. Future Notifications

Potential notification channels:

- Native desktop notifications
- Email
- Telegram
- Push notifications

Example:

```text
Project "Client A Website"
has had no activity for 10 days.
```

Notification preferences should eventually be configurable.

---

## 29. Future AI Layer

AI should be a later layer rather than a core dependency.

Potential functionality:

```text
Daily summary
Weekly summary
Priority recommendations
Task breakdown
Project risk detection
Natural-language task creation
```

Examples:

> What did I work on this week?

> What should I focus on tomorrow?

> Which projects am I neglecting?

AI should operate on structured project/task/activity data.

---

## 30. Supabase Data Flow

### Read

```text
React Component
      ↓
TanStack Query
      ↓
Supabase Client
      ↓
PostgreSQL
      ↓
RLS
      ↓
Data
      ↓
React UI
```

### Mutation

```text
User changes task
      ↓
React form
      ↓
Supabase mutation
      ↓
PostgreSQL
      ↓
RLS
      ↓
Success
      ↓
Invalidate query
      ↓
Updated UI
```

---

## 31. Local Storage

The application does not need SQLite for the MVP.

Small UI preferences can be stored locally, for example:

```text
Theme
Window size
Sidebar state
Last selected project
UI preferences
```

The cloud database remains the source of truth for actual user data.

Do not duplicate the complete PostgreSQL database locally unless a future offline-first requirement justifies it.

---

## 32. Offline Behavior

Full offline-first synchronization is not part of the MVP.

Initial behavior:

```text
Internet available
    ↓
Normal operation

Internet unavailable
    ↓
Show connection state
    ↓
Retry when connection returns
```

A complex offline conflict-resolution engine should not be built until it is actually needed.

---

## 33. Application Update Architecture

The update system is a first-class architectural requirement.

### Components

```text
Developer
   ↓
GitHub Repository
   ↓
GitHub Actions
   ↓
Tauri Build
   ↓
Code Signing
   ↓
GitHub Release
   ↓
Update Metadata + Artifacts
   ↓
Installed Tauri App
```

### Update lifecycle

```text
Application launches
        ↓
Check current version
        ↓
Check configured release/update endpoint
        ↓
Compare versions
        ↓
No update?
    ├── YES → Continue normally
    └── NO  → Show update available
                    ↓
               Download update
                    ↓
               Verify signature
                    ↓
               Install
                    ↓
               Restart
```

The implementation should use the Tauri updater ecosystem rather than creating a custom updater from scratch.

---

## 34. Versioning

Use Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.0.0
1.0.1
1.1.0
2.0.0
```

Guideline:

```text
Bug fix / patch
1.0.0 → 1.0.1

Backward-compatible feature
1.0.1 → 1.1.0

Breaking change
1.1.0 → 2.0.0
```

Application version and release metadata must remain synchronized.

---

## 35. GitHub Actions Release Pipeline

The release pipeline should be tag-driven.

Example:

```text
git tag v1.0.0
        ↓
git push --tags
        ↓
GitHub Actions
        ↓
Install dependencies
        ↓
Build frontend
        ↓
Build Tauri application
        ↓
Sign artifacts
        ↓
Generate updater metadata
        ↓
Create GitHub Release
        ↓
Upload installer + update artifacts
```

Secrets required for signing must be stored in GitHub Actions secrets and never committed to the repository.

---

## 36. Windows Distribution

The initial production target is Windows.

The application should produce a normal Windows installer.

The user installs the application once.

After installation:

```text
Normal app updates
        ↓
Tauri updater
        ↓
No manual reinstall required
```

---

## 37. Update UX

The updater should feel like a normal professional desktop application.

Possible states:

```text
Checking for updates...

No updates available.

Update available
Version 1.2.0

[Install Update]

Downloading update...
██████████░░░ 72%

Installing update...

Restarting...
```

For the initial version, user-confirmed installation is preferred over completely silent updates.

A future setting may allow automatic installation.

---

## 38. Update Security

The updater must verify release authenticity.

Important controls:

- Signed artifacts
- Valid update metadata
- Version verification
- Integrity verification
- Trusted update source

The application must never blindly execute arbitrary downloaded files.

---

## 39. Update Failure Handling

If an update fails:

```text
Existing version remains usable
        ↓
Show update failure
        ↓
Allow retry
```

An unsuccessful update must not intentionally destroy the currently working installation.

---

## 40. Database Migrations

Database schema changes must be version-controlled.

Use Supabase migration files:

```text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_add_activity_logs.sql
    └── 003_add_project_health.sql
```

Before releasing a version that changes the schema:

```text
Application change
        ↓
Database migration
        ↓
Test migration
        ↓
Release application
```

Existing cloud data must remain compatible with newer application versions.

---

## 41. Repository Structure

Recommended structure:

```text
project-tracker/
│
├── .github/
│   └── workflows/
│       └── release.yml
│
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── tasks/
│   │   └── activity/
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Clients.tsx
│   │   ├── ClientDetail.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── Settings.tsx
│   │
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── queries/
│   │   ├── mutations/
│   │   └── utils/
│   │
│   ├── stores/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── src-tauri/
│   ├── src/
│   │   └── main.rs
│   ├── capabilities/
│   ├── icons/
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
├── public/
│
├── ARCHITECTURE.md
├── PROJECT_SPEC.md
├── README.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 42. Application Modules

### Authentication

- Login
- Logout
- Session handling
- Authentication errors
- Protected application state

### Dashboard

- Today's focus
- Overdue tasks
- Due soon
- Attention-needed projects
- Stale projects
- Recent activity

### Clients

- Create
- Edit
- Archive
- View
- Related projects
- Related tasks

### Projects

- Create
- Edit
- Archive
- Status
- Priority
- Deadline
- Health
- Client association

### Tasks

- Create
- Edit
- Complete
- Status
- Priority
- Due date
- Estimates

### Activity

- Activity timeline
- Task activity
- Project activity
- Manual notes

### Settings

- Account
- Theme
- Preferences
- Update settings
- Future integrations

---

## 43. Error Handling

Every asynchronous operation should clearly represent:

```text
Loading
Success
Empty
Error
```

Example:

```text
Unable to load projects.

[Retry]
```

Network errors should not crash the application.

---

## 44. Loading UX

Prefer:

- Skeleton loaders
- Inline loading states
- Optimistic UI where safe
- Local cached query data where useful

Avoid unnecessary full-screen loading screens.

---

## 45. Empty States

Every empty state should tell the user what happened and what to do next.

Example:

```text
No projects yet.

Create your first project to start tracking your work.

[Create Project]
```

---

## 46. Search and Filtering

The MVP should support searching/filtering for:

- Projects
- Clients
- Tasks

Suggested project filters:

```text
Status
Priority
Client
Type
Health
Deadline
```

A global search can be added later.

---

## 47. Keyboard-first UX

Because the target user is a developer, keyboard shortcuts should eventually be supported.

Potential shortcuts:

```text
Ctrl/Cmd + K
Global search

Ctrl/Cmd + N
New task

Ctrl/Cmd + Shift + P
New project

Ctrl/Cmd + /
Show shortcuts
```

These are future enhancements and should not block MVP completion.

---

## 48. Visual Design Direction

The interface should be:

- Minimal
- Professional
- Fast
- Desktop-friendly
- Information-dense without being cluttered
- Easy to scan

Avoid:

- Excessive gradients
- Huge decorative cards
- Unnecessary animations
- Generic "AI dashboard" aesthetics
- Enterprise-management-tool complexity

The UI should feel like a focused personal developer utility.

---

## 49. Performance

The application should remain lightweight.

Principles:

- Lazy-load non-critical screens.
- Avoid unnecessary React re-renders.
- Cache Supabase queries.
- Paginate large activity histories when required.
- Do not load the entire activity database into the dashboard.
- Avoid unnecessary dependencies.
- Keep the Tauri application lightweight.

---

## 50. Environment Configuration

The frontend requires Supabase configuration such as:

```text
Supabase URL
Supabase public/anonymous key
```

These values are not equivalent to the Supabase service-role key.

Never embed privileged server credentials in the desktop application.

Use environment configuration during the build process.

---

## 51. Backup and Data Ownership

Because Supabase PostgreSQL is the source of truth, database backups should be handled by the cloud database infrastructure.

A future application-level export feature may support:

```text
JSON
CSV
Markdown
```

Exportable data:

- Clients
- Projects
- Tasks
- Activity

This gives the user portability and long-term ownership of their data.

---

## 52. Multi-Device Flow

Example:

```text
COMPUTER A
──────────
Install
  ↓
Login
  ↓
Create clients/projects/tasks
  ↓
Data saved to Supabase

             ↓
          Internet
             ↓

COMPUTER B
──────────
Install
  ↓
Login with same account
  ↓
Fetch Supabase data
  ↓
Same clients/projects/tasks
```

No manual migration is necessary.

---

## 53. Reinstall Flow

```text
Uninstall application
        ↓
Install latest version
        ↓
Login
        ↓
Fetch cloud data
        ↓
Continue working
```

Uninstalling the desktop application must not delete cloud data.

---

## 54. Development and Release Workflow

Recommended development workflow:

```text
Feature branch
      ↓
Development
      ↓
Local testing
      ↓
Merge to main
      ↓
Version bump
      ↓
Git tag
      ↓
GitHub Actions
      ↓
Signed release
      ↓
Installed applications update
```

For a personal project, tag-driven releases are sufficient initially.

---

## 55. MVP Scope

The first production-capable release should contain:

### Authentication

- Login
- Logout
- Session persistence

### Clients

- Create
- Edit
- Archive
- View

### Projects

- Create
- Edit
- Archive
- Project type
- Status
- Priority
- Deadline
- Client association
- Health indicator

### Tasks

- Create
- Edit
- Complete
- Status
- Priority
- Due date

### Dashboard

- Today's focus
- Overdue tasks
- Due soon
- Needs attention
- Stale projects
- Recent activity

### Cloud

- Supabase Auth
- Supabase PostgreSQL
- RLS

### Desktop

- Tauri 2
- Windows installer
- Application icon
- Native desktop behavior

### Updates

- GitHub Releases
- GitHub Actions
- Signed artifacts
- Tauri updater
- Update notification
- One-click update/install
- Restart after update

---

## 56. Explicitly Out of MVP

Do not build these before the core application works:

- AI assistant
- GitHub synchronization
- Calendar synchronization
- Telegram integration
- Email integration
- Automatic time tracking
- Team collaboration
- Complex analytics
- Mobile application
- Full offline-first database
- Advanced automation engine

These are future layers.

---

## 57. Phase 2

After the MVP is stable:

```text
GitHub Integration
Calendar Integration
Desktop Notifications
Time Tracking
Global Search
Keyboard Shortcuts
Weekly Summaries
Advanced Activity Tracking
```

---

## 58. Phase 3

After the data/activity layer is reliable:

```text
AI Work Planner
AI Daily Summary
AI Weekly Summary
Natural Language Task Creation
Project Risk Detection
Smart Prioritization
```

---

## 59. Long-Term Architecture

```text
                    ┌─────────────────────┐
                    │     Desktop App     │
                    │                     │
                    │   Tauri 2 + React   │
                    └──────────┬──────────┘
                               │
                        Supabase Client
                               │
                    ┌──────────▼──────────┐
                    │      Supabase       │
                    │                     │
                    │ Auth                │
                    │ PostgreSQL          │
                    │ RLS                 │
                    │ Realtime (optional) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
           GitHub          Calendar        Future APIs
              │                │                │
              └────────────────┼────────────────┘
                               │
                         Activity Layer
                               │
                          AI Layer
                           (later)
```

---

## 60. Core Product Philosophy

### Simple

The user should open the application and understand what needs attention within seconds.

### Personal

This is a personal command center, not a team collaboration platform.

### Cloud-first

User data should be accessible from any supported computer after login.

### Update-once

Install once. Normal future application releases should update through the application.

### Automation-friendly

The data model should support future integrations without rewriting the core.

### AI-later

AI should enhance reliable structured data rather than become the foundation of the product.

### Low maintenance

The application should be straightforward for one developer to maintain.

---

## 61. Non-Negotiable Requirements

The following requirements are considered locked for the architecture:

1. Desktop application.
2. Tauri 2.
3. React + TypeScript frontend.
4. Supabase cloud authentication.
5. Supabase PostgreSQL database.
6. User-specific Row Level Security.
7. Multiple freelance clients.
8. Multiple projects.
9. Company/internal tasks.
10. Personal projects.
11. Task tracking.
12. Project health/staleness visibility.
13. Access from multiple computers.
14. Login-based cloud data restoration.
15. Windows installer.
16. GitHub-based release pipeline.
17. Signed application releases.
18. Built-in automatic update mechanism.
19. No manual reinstall for normal feature/design updates.
20. Simple enough for a single developer to maintain.

---

## 62. Definition of Success

The architecture is successful when this complete workflow works reliably:

```text
1. Developer installs the application.

2. Developer logs in.

3. Existing cloud data automatically appears.

4. Developer creates clients, projects and tasks.

5. Dashboard shows what needs attention.

6. Developer works normally.

7. Task/project activity is recorded.

8. Developer changes application code.

9. Developer pushes changes to GitHub.

10. GitHub Actions builds and signs a new release.

11. Installed application detects the new version.

12. Application shows:
    "Update available."

13. Developer clicks:
    "Install Update."

14. Application downloads and installs the update.

15. Application restarts.

16. New version is running.

17. Existing projects, clients and tasks remain available
    because the data lives in Supabase.
```

The end result should be a **personal project command center that is cloud-backed, multi-device, desktop-native, and self-updating**, while remaining intentionally simple.

---

## 63. Architecture Decision Summary

The final foundation is:

```text
Tauri 2
   +
React
   +
TypeScript
   +
Tailwind CSS
   +
Zustand
   +
TanStack Query
   +
Supabase Auth
   +
Supabase PostgreSQL
   +
PostgreSQL RLS
   +
GitHub
   +
GitHub Actions
   +
GitHub Releases
   +
Tauri Updater
```

The most important architectural separation is:

```text
APPLICATION CODE
       │
       ├── GitHub
       │      └── Releases / Updates
       │
       └── Tauri Desktop App

USER DATA
       │
       └── Supabase
              ├── Auth
              └── PostgreSQL
```

This separation ensures that application updates do not affect the user's actual project data and that the same account can be used from multiple computers.
