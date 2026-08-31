# 🩷 Pulse — Wellness Tracker Summary

## Overview
**Pulse** is a daily wellness tracker web app designed for PCOD/PCOS awareness. It tracks nutrition, movement, hydration, sleep, heart rate, weight, exercise, mood, and energy. Built as a single-page app with localStorage for data persistence and Supabase for authentication.

---

## 🏗 Architecture

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Auth | Supabase (email/password) |
| AI Coach | Anthropic Claude API (BYOK) |
| Storage | localStorage (all data stays in browser) |
| Charts | Chart.js |
| Hosting | GitHub Pages |

---

## 📁 Project Structure

```
RITS_PCOD/
├── index.html              # Redirects to wellness-tracker.html
├── wellness-tracker.html   # Main app (all UI + CSS)
├── js/
│   └── pulse.js            # All app logic
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
├── server.js               # Node server (dev)
├── scripts/
│   └── build.js            # Build script
├── css/
│   └── style.css           # Legacy styles
├── reset-password.html     # Password reset page
├── backend/                # Python backend (legacy)
│   ├── app.py
│   ├── database.py
│   └── requirements.txt
├── Daily_Wellness_Tracker (1).xlsx  # Original spreadsheet
└── SUMMARY.md              # This file
```

---

## 🎨 UI/UX Design

### Branches
| Branch | Version | Purpose |
|--------|---------|---------|
| `main` | v1.0.0008 | Stable/production — original care coach |
| `v2` | v2.0.0001+ | New features — step wizard, Gen Z glass UI |

### v2 Design System — "Gen Z Extreme Glass"
- **Background:** Animated gradient (pink → purple → blue) with floating radial orbs
- **Cards:** 24px backdrop-filter blur, semi-transparent white, white border glow
- **Buttons:** Springy cubic-bezier(.34, 1.56, .64, 1) transitions
- **Colors:** Pink (#C85F87), Purple (#A878B8), Coral (#E783A6), Amber (#D49A58)
- **Font:** Inter (body), Fraunces (headings), IBM Plex Mono (data)

---

## 🧩 Features

### 1. Today Page — Step Wizard
Single card with 9-step navigation (no scrolling):

| Step | Content | Minus | Plus |
|------|---------|-------|------|
| 1/8 | 🍽 Food · Protein (3 meals) | −5g | 6g, 10g, 18g, 20g, 25g, 30g |
| 2/8 | 👣 Steps | −500, −1k | +500, +1k, 2k, 5k, 8k, 10k, 12k |
| 3/8 | 💧 Water | −250ml | +250ml, +500ml, +1 bottle |
| 4/8 | 🌙 Sleep + Quality/Stress | −.5h | 5h, 6h, 6.5h, 7h, 7.5h, 8h, 9h |
| 5/8 | ❤ Heart rate & Weight | manual input | manual input |
| 6/8 | 🏃 Exercise + Type | −15m | 0m, 15m, 30m, 45m, 60m, 90m |
| 7/8 | 🙂 Mood (emoji) + Energy (1-10 slider) | — | — |
| 8/9 | 🩸 Cycle (flow, pain, mood, symptoms, meds, sleep quality) | — | — |
| 9/9 | 📝 Notes | — | — |

**Key behaviors:**
- Auto-saves on every step change (no manual save button)
- Last step shows "Done ✓"
- Visual indicators: emoji + encouraging message per step
- Gradient progress bars with color coding

### 2. Honor System
- Floating 🏆 icon (bottom-right) appears when personal bests exist
- Compares today vs ALL previous days in database
- Tracks: protein, steps, water, sleep, exercise, score
- Click icon → modal popup with records
- Auto-pops when reaching step 6+ (most data filled)
- Each record shows current vs previous value

### 3. Trends Page — Gen Z Card Style
- Hero stat cards: ⚡ Avg Score, 🏆 Best Day, 🔥 Days Logged
- 2-column metric cards with mini charts
- Score trend line chart with pink gradient fill
- Rounded bar charts with bold colors
- Achievement badges system

**Achievement badges:**
- 🔥 Day streak (3+)
- 💎 Week warrior (7+)
- 👑 2 week legend (14+)
- ⭐ Scored 90+
- 💯 Perfect day
- 🥩 Protein master
- 🏃 Step crusher
- 😴 Sleep champion
- 📊 7 day logger
- 📝 30 days logged

### 4. Insights Page
- Rule-based analysis (no API needed)
- Shows: protein %, movement %, rest %, hydration %, active days
- Percentage-based visual descriptions
- Glowing dots with hover scale effect

### 5. Care Coach (v1) / Jarvis (concept)
- Uses Anthropic Claude API (user's own key)
- PCOD-aware wellness coaching
- Chat interface with conversation history
- System prompt includes user's targets and recent data

### 6. Settings
- Protein target (per meal, auto-calculates daily)
- Steps target
- Water target (ml)
- Exercise target (min)
- Sleep target (hrs)
- Heart rate range (min/max)
- Weight goal (optional)
- Height (optional)
- Profile name
- Export/Import backup (JSON)
- Export CSV
- Erase all data

### 7. Authentication
- Supabase email/password auth
- Sign in / Sign up / Forgot password
- Session persistence
- Sign out

---

## 📊 Data Model

### Daily Log (`pulse_data_v1`)
```json
{
  "YYYY-MM-DD": {
    "protein": { "morning": 0, "lunch": 0, "dinner": 0 },
    "steps": 0,
    "waterMl": 0,
    "sleepHrs": 0,
    "sleepQuality": "Good|Fair|Poor|Excellent",
    "stress": "Low|Medium|High",
    "hr": null,
    "weight": null,
    "exerciseMin": 0,
    "exerciseType": "",
    "mood": "Happy|Calm|Tired|Stressed|Low",
    "energy": 6,
    "notes": ""
  }
}
```

### Settings (`pulse_settings_v1`)
```json
{
  "proteinMeal": 50,
  "steps": 8000,
  "waterMl": 2500,
  "exerciseMin": 30,
  "sleepHrs": 7.5,
  "hrMin": 60,
  "hrMax": 100,
  "weightGoal": null,
  "height": null,
  "name": "",
  "cycleLength": 28
}
```

### Cycle Data (inside daily log)
```json
{
  "cycle": {
    "flow": "None|Spotting|Light|Medium|Heavy",
    "pain": 0,
    "mood": "Calm|Irritable|Low|Anxious|Happy|Sad|Tired|Energetic|Headache|Other",
    "symptomSeverity": "None|Mild|Moderate|Severe|Very severe",
    "spotting": "Yes|No",
    "cycleType": "Period|Spotting|Expected|Late|Unusual",
    "medicationTaken": "Yes|No",
    "sleepQuality": "Poor|Fair|Good|Very good"
  }
}
```

### Other localStorage keys
- `pulse_api_key` — Anthropic API key (v1)
- `pulse_signed_in_v1` — Session flag
- `rit_pcod_data` — Legacy data (auto-migrated)

---

## 🔢 Score Calculation

Weighted formula:
| Metric | Weight |
|--------|--------|
| Protein | 28% |
| Steps | 20% |
| Sleep | 22% |
| Water | 15% |
| Exercise | 10% |
| Heart rate | 5% |

Score = Σ(metric_pct × weight) / Σ(weights) × 100

Returns `null` if no data logged.

---

## 🔧 Supabase Config
- URL: `https://ujkupyimtbqzkusiefyb.supabase.co`
- anon key: embedded in pulse.js
- Auth: email/password only

---

## 📝 Commit History (v2 branch)

1. `Start v2 branch — v2.0.0001` — Version bump
2. `v2: Extreme glass UI with Gen Z vibes` — Animated gradient, glassmorphism
3. `Fix: remove duplicate old CSS` — Cleanup
4. `v2: Step wizard Today page + compact header` — Single-card wizard
5. `v2: Gen Z Trends redesign + fix calendar` — Card-style trends, gamified stats
6. `v2: Visual-first UI, auto-defaults on skip` — Emoji indicators, auto-fill
7. `v2: Auto-save, minus buttons, lower defaults` — UX improvements
8. `v2: Add Honor feature` — Personal best comparison
9. `v2: Honor as floating icon + popup modal` — Icon + modal design

---

## 🚀 How to Run

1. **GitHub Pages:** Settings → Pages → Source → select `v2` branch
2. **Local:** `npx serve .` or `python -m http.server`
3. **Login:** Create account or sign in with email/password
4. **First time:** Get free Gemini API key from aistudio.google.com/apikey (optional)

---

## 🎯 Current State (v2)

- ✅ Step wizard (8 steps, auto-save, minus buttons)
- ✅ Honor system (floating icon, popup modal, auto-show)
- ✅ Gen Z glass UI (animated gradient, blur, springy transitions)
- ✅ Visual indicators (emoji + messages, no raw numbers)
- ✅ Trends with achievements
- ✅ Insights with percentage-based descriptions
- ✅ Care coach (Anthropic API, BYOK)
- ✅ Settings with export/import
- ✅ Authentication (Supabase)
- ✅ Calendar navigation (fixed)
- ✅ Cycle tracking (flow, pain, mood, symptoms, medication, cycle length)
- ✅ Cycle summary (Day X of Y, phase, next period estimate)
- ✅ Cycle trend charts (flow + pain over time)
- ✅ Cycle insights (pain avg, flow pattern, medication, sleep quality)

---

*Last updated: August 2026*
