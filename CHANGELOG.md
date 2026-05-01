# Changelog

All notable changes to Venus Budget App are documented here.

## [1.1.0] — 2026-05-01

### Fixed

- **Password Show/Hide toggle** — replaced `span[role=button]` with a real `<button type="button">` on both login and register pages; fixes unresponsive toggle on Chrome/Safari macOS

### Added in 1.1.0

- **CasaOS app store YAML** (`casaos-app.yml`) — one-file install for CasaOS with PostgreSQL + app service, host-mounted data volumes, and pre-install tips for secret rotation

---

## [1.0.0] — 2026-05-01

### Added in 1.0.0

- **Authentication** — email/password login with NextAuth.js, JWT sessions
- **Team-based login themes** — `?team=finance|engineering|marketing|ops` URL parameter
- **Dark/Light/System theme** — reads OS preference, persists in localStorage, toggle in sidebar/bottom nav
- **Dashboard** — overall balance from all accounts, monthly summary, cash flow chart (1M/3M/6M/12M toggle, daily for ≤3M), spending by category (bar) + by group (pie)
- **Accounts** — computed balance from transactions (opening balance + income - expenses), breakdown tooltip
- **Transactions** — full CRUD, category dropdown grouped by group + filtered by type, drag-and-drop sort
- **Categories** — group support, drag-and-drop reorder/move between groups, soft delete with trash + restore
- **Budgets** — grouped by category group, edit/delete (future months only), unlock current month with comment, copy from any month to multiple target months, already-budgeted categories excluded from Set Budget
- **Forecasting** — 3-tab redesign (Total/Income/Spent), date picker for any future month, linear regression projection, per-account and per-category forecasts
- **Import** — CSV and SMS transaction import
- **Recurring rules** — recurring transaction engine
- **PWA** — service worker, offline support, manifest

### Technical

- Next.js 16 + React 19 + TypeScript
- Ant Design 6 (dark/light theme via ConfigProvider)
- PostgreSQL + Prisma ORM
- @dnd-kit drag-and-drop
- Recharts for all charts
- Docker multi-stage build with standalone output
- CasaOS-compatible production docker-compose with host-mounted data volumes
