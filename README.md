# IOTBay Marketplace

IOTBay is a monorepo with two workspaces:

- `web`: React + Vite frontend
- `api`: Flask backend with a SQLite database

## Quick Start

### 1. Install Prerequisites

- Install `Node.js` (includes `npm`): https://nodejs.org/en/download
- Install `Python`: https://www.python.org/downloads/
- Install `uv`: https://docs.astral.sh/uv/getting-started/installation/

Confirm the toolchains are available:

```bash
node -v
npm -v
python3 --version
uv --version
```

### 2. Create Your Local Environment File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then open `.env` and set the values you need:

- `IOTBAY_API_KEY`: required for local API access
- `IOTBAY_GOOGLE_MAPS_API_KEY`: optional, only needed for address suggestions
- `IOTBAY_SMTP_*` and `IOTBAY_SENDER`: optional, only needed if you want real emails to send

The app can still run locally without the optional email or address integrations.

### 3. Run First-Time Setup

Run these commands once after cloning the repository:

```bash
npm install
npm run -w api venv
npm run -w api deps
npm run -w api db:migrate
```

What these commands do:

- `npm install`: installs all JavaScript dependencies for the monorepo
- `npm run -w api venv`: creates the backend virtual environment at `api/.venv`
- `npm run -w api deps`: installs Python packages from `api/requirements.txt`
- `npm run -w api db:migrate`: applies any unapplied database migrations

If you are not sure whether your machine is set up correctly, just run all four commands again.

### 4. Start The App

Run the frontend and backend in separate terminals:

```bash
# Terminal 1
npm run -w api dev

# Terminal 2
npm run -w web dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- API routes are prefixed with `/api`

Quick API check:

```bash
curl http://localhost:5001/api/health
```

## Daily Use

### After Pulling

After `git pull`, the safest manual reset is:

```bash
npm install
npm run -w api deps
npm run -w api db:migrate
```

You do not need to run all three every single time. Use this rule:

- if any `package.json` or `package-lock.json` changed, run `npm install`
- if `api/requirements.txt` changed, run `npm run -w api deps`
- if anything in `api/migrations/` changed, run `npm run -w api db:migrate`

### Automatic Sync After Pull

Husky now runs these automatically after merge-based pulls and rebases.

It checks what changed and then runs only what is needed:

- `package.json` or `package-lock.json`, it runs `npm install`
- `api/requirements.txt`, it runs `npm run -w api venv` and `npm run -w api deps`
- `api/migrations/*.sql`, it runs `npm run -w api venv` and `npm run -w api db:migrate`

This is only a convenience. If something still looks wrong after pulling, run the three manual commands above.

### Usual Workflow

```bash
git pull
npm run -w api dev
npm run -w web dev
```

If the pull changed dependencies or migrations and the hooks did not already handle it, run:

```bash
npm install
npm run -w api deps
npm run -w api db:migrate
```

## Optional Integrations

### Email Sending

Email sending is optional for local development.

If you want registration emails and password reset emails to work, fill in the SMTP values in `.env`.

For Gmail:

- use your Gmail address for `IOTBAY_SENDER` and `IOTBAY_SMTP_USERNAME`
- use an app password for `IOTBAY_SMTP_PASSWORD`, not your normal Gmail password
- Google typically requires 2-Step Verification before app passwords are available

Google account security:
- https://myaccount.google.com/security

For other providers such as Outlook, use that provider's SMTP host, port, username, and either its normal SMTP password flow or an app password if the provider requires one.

### Address Suggestions

Address suggestions are also optional for local development.

If you want Google-backed address suggestions to work:

- create a Google Maps Platform API key
- enable billing on the Google Cloud project
- enable `Places API (New)` for the project
- make sure the key is allowed to use the Places API
- put the key into `IOTBAY_GOOGLE_MAPS_API_KEY` in `.env`

Official docs:

- Places API (New): https://developers.google.com/maps/documentation/places/web-service/op-overview
- Places API usage and billing: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing

Google Maps pricing changes over time, so check the official pricing page instead of assuming an old free tier number still applies.

## If You Get Stuck

If you hit setup or runtime errors, run these steps in order:

1. `npm install`
2. `npm run -w api venv`
3. `npm run -w api deps`
4. `npm run -w api db:migrate`

That fixes most local setup problems:

- missing JavaScript packages
- missing Python packages
- stale API virtual environment
- unapplied database migrations

## Before Commit

Before committing, run:

```text
npm run -w web fix:all   # Frontend quality gate
  npm run typecheck       # Detects TypeScript type errors
  npm run eslint:fix      # Finds and fixes JS issues
  npm run stylelint:fix   # Finds and fixes CSS issues
  npm run prettier:fix    # Applies consistent code formatting

npm run -w api fix:all      # Backend quality gate
  npm run typecheck       # Runs Pyright static typing
  npm run lint:fix      # Finds and fixes Python issues
  npm run format:fix    # Applies consistent code formatting

npm run -w api test            # Runs backend unit tests
```

## Database Changes

A schema change means changing database structure, for example:

- creating a table
- adding or removing a column
- changing a constraint
- adding an index

It does not mean changing row data.

Create a migration file with:

```bash
npm run -w api db:migrate:new -- <migration_name>
```

For example:

```bash
npm run -w api db:migrate:new -- add_product_category
```

This creates a file at `api/migrations/<number>_<migration_name>.sql`.

After writing the SQL, apply it with:

```bash
npm run -w api db:migrate
```

Load shared seed data:

```bash
npm run -w api db:seed:load
```

Update the shared seed file from your local database:

```bash
npm run -w api db:seed:dump
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
