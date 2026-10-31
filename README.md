# SupportSense Frontend

React 18 + Vite + Tailwind. Runs today with a built-in **demo backend** (no server needed). Switch to the real FastAPI backend later by editing `.env`.

## Run on Windows (PowerShell)
1. Install Node.js LTS from nodejs.org, then close and reopen PowerShell. Check: `node -v`
2. `cd D:\SupportSense\frontend`
3. `npm install`
4. `npm run dev`  then open http://localhost:5173

## Demo accounts (any non-empty password)
| Role | Email |
|---|---|
| Customer | maya@demo.test (also dev@, sana@, rohan@) |
| Agent | ravi@demo.test |
| Supervisor | priya@demo.test |
| Admin | anuj@demo.test |

Tip: open a customer in one tab and the supervisor in another (same browser). Send 5 angry messages as the customer and the supervisor tab shows a new-alert toast.
Admin > Settings > "Reset demo data" restores the starting data.

## Demo mode is not the trained model
Scores come from a keyword heuristic in the browser and are labelled as such (banner + `is_mock`). Real scores need the backend and the ML team's model.

## Using the real backend
Edit `.env`:
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```
Restart `npm run dev`. The backend must match `API_CONTRACT.md`. Nothing has been tested against a real backend yet.

## Structure
`src/pages` screens, `src/components` UI, `src/services` API calls, `src/hooks` data hooks, `src/realtime` WebSocket/mock events, `src/mock` demo backend (delete when the real one exists).

## Notes
- Recharts 2.x is used (works; may print a deprecation notice).
- Production bundle is about 690 kB (198 kB gzipped).
