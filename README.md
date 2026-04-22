# IoTBay Marketplace

IoTBay is a monorepo with two workspaces:

- `web`: React + Vite frontend
- `api`: Flask backend with a SQLite database

## Quick Start

### 1. Toolchain

Download [`mise`](https://mise.en.dev) to install the [`Node.js`](https://nodejs.org/en) and [`uv`](https://docs.astral.sh/uv/) versions used by this project.

```bash
winget install jdx.mise # Windows
brew install mise       # MacOS
```

From the repository root:

```bash
mise install --yes
```

### 2. Environment File

Create `.env` from `.env.example`.

Local development needs only `IOTBAY_API_KEY`. The default value in
`.env.example` matches the quick API check below.

Leave these blank unless you use the integration:

- `IOTBAY_GOOGLE_MAPS_API_KEY`: address suggestions
- `IOTBAY_SMTP_*`: real email sending

### 3. Sync Local Project

Run this once after cloning the repository:

```bash
npm run sync
```

This installs JavaScript dependencies, prepares the API virtual environment,
runs SQLite migrations, and loads seed data.

### 4. Start The App

Run the frontend and backend:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- API routes are prefixed with `/api`

Quick API check:

```bash
curl -H "x-api-key: change-me-local-api-key" http://localhost:5001/api/health
```

Use the `IOTBAY_API_KEY` value from your `.env` file.

## Daily Use

After `git pull`, run:

```bash
npm run sync
```

The Git post-merge and post-rewrite hooks run `npm run sync` after pulls,
merges, and rebases.

## Optional Integrations

### Email Sending

Email sending is optional for local development and uses SMTP to send emails from your own external email to reduce complexity.

- use your email address for `IOTBAY_SMTP_USERNAME` in `.env`
- use your email password for `IOTBAY_SMTP_PASSWORD`.

> **Note:** For Gmail, you must use an app password not your normal Gmail password. [How to create a Google app password](https://support.google.com/accounts/answer/185833?hl=en). Google requires 2-Step Verification before app passwords are available for your account

### Address Suggestions

Address suggestions are also optional for local development and use Google-backed address suggestions and validation.

- create a Google Maps Platform API key
- enable billing on the Google Cloud project
- enable `Places API (New)` and `Address Validation API` for your API key
- put the key into `IOTBAY_GOOGLE_MAPS_API_KEY` in `.env`

## Before Commit

Before committing, run:

```bash
npm run check:all
npm run test
npm run build
```

Use `npm run fix:all` when you want lint and formatting fixes applied.

Pull requests and pushes to `main` run the same checks in GitHub Actions.

## Database Changes

### Migrations

Use migrations for schema changes such as tables, columns, constraints, and
indexes.

Create a migration:

```bash
npm run -w api migrate:new -- add_product_category
```

This creates a numbered file in `api/migrations/`. Add the SQL, then apply it:

```bash
npm run -w api migrate
```

The backend also applies pending migrations on startup.

### Seeding

Shared development seed data lives in `api/db/seed.sql`.

Load the shared seed data into your local database:

```bash
npm run -w api seed
```

Use this after pulling seed changes, or when you want to reset shared local data
to the committed baseline.

After intentionally changing shared fixtures in your local database, update the
seed file:

```bash
npm run -w api seed:dump
```

Review the `api/db/seed.sql` diff before committing it.

## API Testing

Postman can be used to test the API with a GUI: https://www.postman.com/

Create a Postman environment such as `IOTBay Local` with:

```text
baseUrl = http://localhost:5001
```

Then build requests with `{{baseUrl}}/api/...`, for example:

```text
GET {{baseUrl}}/api/health
```
