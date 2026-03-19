# IOTBay Marketplace

IOTBay is a two-workspace monorepo. The `web` workspace contains the React + Vite frontend, and the `api` workspace contains the Flask backend with a SQLite database.

## Prerequisites

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

## Setup

- Install JavaScript dependencies:

```bash
npm install
```

- Initialise the API virtual environment and install Python dependencies:

```bash
npm run -w api venv
npm run -w api deps
```

- Initialise the backend schema:

```bash
npm run -w api db:migrate
```

## Development

Run both services in separate terminal windows so frontend and backend logs stay isolated and each process can restart independently during development:

```bash
# Terminal 1 (frontend)
npm run -w web dev

# Terminal 2 (backend)
npm run -w api dev
```

- Frontend runs on port `5173`: `http://localhost:5173`
- Backend runs on port `5001`: `http://localhost:5001`
- Backend routes are prefixed with `/api/` (example below)

```bash
curl http://localhost:5001/api/health
```

Before committing, run the top-level quality commands below; the indented hierarchy shows what each command executes:

```text
npm run -w web lint:all   # Frontend quality gate
  npm run typecheck       # Detects TypeScript type errors
  npm run eslint:fix      # Finds and fixes JS issues
  npm run stylelint:fix   # Finds and fixes CSS issues
  npm run prettier:fix    # Applies consistent code formatting

npm run -w api check      # Backend quality gate
  npm run lint            # Finds Python lint issues
  npm run format          # Checks Python formatting state
  npm run test            # Runs backend unit tests
```

## Database

A schema change means changing database structure, for example creating a table, adding or removing a column, changing a constraint, or adding an index; it does not mean changing row data.

To start a schema change, create a migration file:

```bash
npm run -w api db:migrate:new -- <migration_name>
```

For example:

```bash
npm run -w api db:migrate:new -- add_product_category
```

The command creates a new SQL file at `api/migrations/<number>_<migration_name>.sql`; open that file and write the SQL statements for the change, then apply unapplied migrations:

```bash
npm run -w api db:migrate
```

Load shared seed data from `api/db/seed.sql` with:

```bash
npm run -w api db:seed:load
```

When intentionally updating the shared dataset, dump local rows back into `api/db/seed.sql` with:

```bash
npm run -w api db:seed:dump
```

If you need a custom local database file, set `IOTBAY_DATABASE_PATH` per command:

```bash
IOTBAY_DATABASE_PATH=<path_to_sqlite_file> npm run -w api db:migrate
```

## Postman

Postman provides an gui interface to catalog, organise and query `http` requests for API testing and debugging: https://www.postman.com/

Create a Postman environment (for example, `IOTBay Local`) with `baseUrl = http://localhost:5001`, then build requests with `{{baseUrl}}/api/...`; for example:

```text
GET {{baseUrl}}/api/health
```
