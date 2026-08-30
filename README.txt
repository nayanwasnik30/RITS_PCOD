RIT PCOD Wellness Tracker (Pulse)
==================================

Open wellness-tracker.html directly in a browser, or use the build scripts below.

Quick Start (Development)
-------------------------
1. npx serve . -l 3000
2. Open http://localhost:3000

Build for Production
--------------------
1. npm install
2. npm run build
3. npx serve dist -l 3000

Or use the production server:
1. npm install
2. npm run build
3. npm start
4. Open http://localhost:3000

Project Files
-------------
- wellness-tracker.html: the complete daily tracker (HTML + inline CSS)
- js/pulse.js: all application logic (data, UI, charts, AI, settings)
- js/chart.umd.min.js: Chart.js library for trend charts
- manifest.json: PWA manifest for home-screen install
- sw.js: service worker for offline support
- server.js: Express production server with security headers
- scripts/build.js: build script (minifies JS/HTML/CSS)
- backend/app.py: optional local Flask server

Deploying
---------
Option A — Static hosting (Netlify, Vercel, GitHub Pages):
  1. npm run build
  2. Upload the dist/ folder

Option B — Node server (Railway, Render, Fly.io):
  1. Push code to your repo
  2. Set start command: npm run build && npm start
  3. Set port: 3000

Option C — Docker:
  See the Dockerfile if provided, or build manually.

Features
--------
- Daily tracking: protein, steps, water, sleep, heart rate, weight, exercise, mood
- Wellness score with streak tracking
- Trend charts (7-day, 30-day)
- AI insights (rule-based, free) + Anthropic care coach (BYOK)
- Export/Import JSON & CSV backups
- PWA installable, works offline
- All data stored locally in the browser (no server required)
