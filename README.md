# IOTBay Marketplace

Monorepo with:
- `web`: React + Vite frontend
- `api`: Flask backend

## Local setup

1. Install JavaScript dependencies:
```bash
npm install
```

2. Create Python virtual environment for the API:
```bash
npm run -w api venv:create
```

3. Install API Python dependencies:
```bash
npm run -w api deps:install
```

Note: run `npm run -w api venv:create` first so API scripts can use `.venv/bin/python`.

## Run localhost

Run these in separate terminals:

Frontend (`http://localhost:5173`):
```bash
npm run -w web dev
```

Backend (`http://localhost:5000`):
```bash
npm run -w api dev
```

## Linting and testing

Frontend lint + formatting + typecheck:
```bash
npm run -w web lint:all
```

Backend lint and tests:
```bash
npm run -w api lint
npm run -w api test
```
