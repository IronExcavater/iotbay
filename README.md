# IOTBay Marketplace

IOTBay is a monorepo with two workspaces:

- `web`: React + Vite frontend
- `api`: Flask backend with a SQLite database

## Quick Start

### 1. Install Prerequisites

- Install `Node.js` (includes `npm`): https://nodejs.org/en/download
- Install `uv`: https://docs.astral.sh/uv/getting-started/installation/

### 2. Environment File

Create a copy of `.env.example` to `.env`. Open `.env` and set the values you need:

- `IOTBAY_API_KEY`: required for local API access
- `IOTBAY_GOOGLE_MAPS_API_KEY`: optional, only needed for address suggestions
- `IOTBAY_SMTP_*`: optional, only needed if you want real emails to send

### 3. Sync Local Project

Run these commands once after cloning the repository:

```bash
npm run sync
```

What this does:

- installs all JavaScript dependencies for the monorepo
- runs workspace sync scripts, including the API virtual environment, SQLite migrations and seed data

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

After `git pull`, the safest manual reset is:

```bash
npm run sync
```

You do not need to run the full sync every single time. Use this rule:

- if any `package.json` changed, run `npm install`
- if `api/pyproject.toml` changed, run `npm run -w api sync`
- if anything in `api/migrations/*` changed, run `npm run -w api migrate`
- if you want to reset shared local data, run `npm run -w api seed`

The Git post-merge and post-rewrite hooks run `npm run sync` after pulls,
merges, and rebases. `npm install` also runs workspace sync scripts through
`postinstall`, skipping workspaces that do not define `sync`.

For workspace-wide optional scripts, use `--if-present`; for example,
`npm run sync --workspaces --if-present`.

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

```text
npm run check:all     # Frontend and backend read-only quality gate
npm test              # Runs workspace test scripts
npm run build         # Builds all buildable workspaces

npm run -w web fix:all    # Frontend quality gate
  npm run typecheck       # Runs TypeScript static typing
  npm run eslint:fix      # Finds and fixes JS issues
  npm run stylelint:fix   # Finds and fixes CSS issues
  npm run prettier:fix    # Applies consistent code formatting

npm run -w api fix:all    # Backend quality gate
  npm run typecheck       # Runs Pyright static typing
  npm run ruff:fix        # Finds and fixes Python issues

npm run -w api test       # Runs backend unit tests
```

Pull requests and pushes to `main` run the same checks in GitHub Actions.

## Database Changes

### Migrations

A schema change means changing database structure, for example:

- creating a table
- adding or removing a column
- changing a constraint
- adding an index

It does not mean changing row data.

Create a migration file with:

```bash
npm run -w api migrate:new -- <migration_name>
```

For example:

```bash
npm run -w api migrate:new -- add_product_category
```

This creates a file at `api/migrations/<number>_<migration_name>.sql`.

After writing the SQL, apply it with:

```bash
npm run -w api migrate
```

### Seeding

Database seeding is the automated process of populating a database with initial, reproducible and structured data without needing manual data entry.

Load shared seed data:

```bash
npm run -w api seed
```

Update the shared seed file from your local database:

```bash
npm run -w api seed:dump
```

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
