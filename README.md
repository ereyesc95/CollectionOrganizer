# RecordStack

Desktop-ready app to manage your vinyl and CD collection: import from Excel, filter by media/animation/canvas/autographs, browse as list or cover grid, and add new records to SQLite.

## Quick start

### 1. Install backend dependencies

```powershell
cd "c:\Users\reyedu01\AI Projects\Collection Organizer"
python -m pip install -r backend\requirements.txt
```

### 2. Import your spreadsheet (first time)

```powershell
python run.py --import-only
```

This reads `Collection.xlsx` into `data/collection.db`.

### 3. Run the app (development)

**Terminal A — API:**

```powershell
python run.py --no-browser
```

**Terminal B — UI:**

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Set covers folder

In the app, click **Covers folder** and paste the path where your cover images live. Filenames must match the **Album** column exactly (e.g. `AFI, 2006. On the Arrow.jpg`).

## Production build (single server)

```powershell
cd frontend
npm install
npm run build
cd ..
python run.py
```

Opens **http://recordstack.localhost:8000** with API + built UI (friendly local name; no domain purchase). `127.0.0.1` still works. Optional shorter name: run `setup-local-url.ps1` as Administrator for **http://recordstack.local:8000**.

## Features

- **Import** from `Collection.xlsx` (updates by cover key)
- **Faceted filters**: media (CD/LP split), animation, canvas, autographs, pending
- **List** and **cover grid** views
- **Add / edit / delete** records with album string parse preview
- **SQLite** database at `data/collection.db`

## Project layout

```
backend/app/     FastAPI, models, import, album parser
frontend/src/    React UI
data/            SQLite database
Collection.xlsx  One-time import source
run.py           Launcher + first-run import
```
