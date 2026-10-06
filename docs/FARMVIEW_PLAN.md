# FarmView — AfriAgriFed's map & order-tracking build

Agriculture-only, Namibia-only (Oshana region first) map inside the AfriAgriFed
app. Inspired by [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view)
(MIT) but **not a fork of it**: nothing for the user to install, no separate
server, no Cesium.

## Why not embed God's Eye View itself

| God's Eye View | What AfriAgriFed needs |
| --- | --- |
| Vanilla JS + Vite + CesiumJS (multi-MB, heavy WebGL) | Fast on a mid-range phone over a weak connection |
| Own dev server with server-side proxies; Node 24+, `npm ci` | Zero install for users — it is a page in the existing React app |
| Flights, military, ships, satellites, cameras, radio, ALPR… | Weather, soil, rain, floods, fires, crop suitability, farms, orders |

So FarmView is built on **MapLibre GL JS** (lazy-loaded, only fetched when the
user opens the map) with keyless data sources. GEV's *ideas* (layer panel,
HUD-style readouts, keyless-first, keys as upgrades) are reused; if any GEV code
is copied it goes in `THIRD_PARTY_NOTICES` with its MIT notice.

## Checklist

### Phase 0 — Foundations
- [x] Base on the local `ui-overhaul-and-commerce` branch (superset of the live GitHub branch)
- [x] Add `maplibre-gl`; lazy-load the route (main bundle +1.5 kB gz; map chunk ~211 kB gz loads only on `/farm-map`)
- [x] `src/farmview/` module: config, data clients, crop rules
- [x] Nav entry "Farm Map" (Insights) + protected route `/farm-map`

### Phase 1 — Map (keyless MVP) — renamed from "Farm Map"; route `/map`
- [x] Namibia-locked map; **all 14 current regions** (labelled, tap to highlight), verified against official areas (within 0.5%, Zambezi -1.9%) and 16 towns; the previous regions file was pre-2013 and has been replaced
- [x] Oshana boundary is **correct**: an earlier note here said its southern strip toward Etosha looked wrong. That was my mistake: the polygon's area (8,692 km²) matches the official 8,647 km²
- [x] Basemaps: satellite / streets
- [x] Weather at any tapped spot: now + 7-day forecast (Open-Meteo), region name, nearest town
- [x] National forecast grid (ECMWF IFS 0.25°, 195 points, 48 h): rain, temperature, **animated wind**, smooth colour fields clipped to Namibia, time slider + play
- [x] Live Meteosat/MTG satellite layers: clouds (infrared), storm clouds, lightning, true colour — each labelled observed vs forecast with its age
- [x] Climate normals from NASA POWER feeding crop suitability and rain-onset month
- [x] Flood outlook (Open-Meteo flood API) — shown only when elevated
- [x] Crop suitability on tap (unit-tested rule engine, "indicative only")
- [ ] Review crop thresholds with MAWLR extension officers (launch checklist §4)
- [ ] Add more towns/villages from OSM place data
- [ ] Soil data (ISRIC SoilGrids) so suitability can become a map layer
- [ ] "Clouds only" transparent infrared layer (currently grey satellite tiles)
- [x] Fire hotspots (NASA FIRMS via `server.js`): map layer, "fires within 25 km" for any tapped spot and farm, farmer fire alerts. Needs the free `FIRMS_MAP_KEY`; layer stays hidden without it
- [x] Server-side cache: grid fetched once an hour for all visitors, point forecasts and flood cached, stale-if-error, per-visitor rate limit, keys kept on the server

### Phase 1b — Farmer tools (built; not yet exercised against real Firebase)
- [x] Farmers (account type *farmer*) add a farm by tapping its location: name, size, crops, notes — private to the owner
- [x] Per-farm **input log**: seed, fertiliser, pesticide, herbicide, water, labour, feed, veterinary, equipment, other; quantity, unit, cost (N$), crop/animal, note
- [x] Cost summary by type, delete record / delete farm
- [x] Security rules for `farms` and `farmInputs` (owner-only; only farmer accounts create) — untested in the emulator
- [ ] Rain at my farm since planting (Open-Meteo archive)
- [ ] Field boundaries (draw a polygon) and area from the drawing
- [ ] Farms visible to buyers on the map (opt-in, rounded to ~1 km)

### Phase 2 — Order tracking
- [x] Order status model: `paid → confirmed → dispatched → in_transit → delivered` (+ `cancelled`, admin-only) — `src/orderStatus.js`, 14 unit tests
- [x] Firestore rules: seller advances *their own* orders to in_transit; only the buyer confirms delivery; history is append-only and names who acted; admin unchanged — written in `firestore.rules`
- [ ] **Deploy the rules** (`firebase deploy --only firestore:rules`) and test them with the emulator — not machine-tested yet (no Java / Firebase CLI on the dev machine)
- [x] **Non-map tracker** `/track-orders`: stepper with times, buying/selling tabs, in-progress/completed filter, optional note, history — buyer + seller views
- [x] In-app notifications on every status change and on a new paid order (existing `notifications.js`)
- [x] My Orders shows lifecycle labels and a Track link
- [ ] Map tab: pickup (farm) → delivery place pins, status colour — needs "Pin my farm" first
- [ ] Harden order creation: orders are written by the buyer's browser after the payment redirect, so a user could fabricate a "paid" order. Create them server-side from the Flutterwave webhook in `server.js`
- [ ] Cancel / refund flow (needs a refund path through Flutterwave)

### Phase 3 — Focus cut
- [ ] Nothing from GEV that is not agriculture is carried over (no flights, military, ships, satellites, cameras, radio, ALPR, cockpit, FLIR styles, voice-agent tools…)
- [ ] Single AfriAgriFed visual language (theme tokens), mobile-first layout

### Phase 4 — Performance
- [ ] Route-level code splitting; MapLibre only on `/farm-map`
- [ ] All weather/climate calls cached (memory + `localStorage`, TTL) and de-duplicated
- [ ] Grid sampling capped; no per-frame work; no WebGL 3D terrain by default
- [ ] Bundle-size check before/after (`npm run build`)

### Phase 5 — Registration emails (from the concept note)
- [ ] Welcome email on registration (server-side, `server.js`)
- [ ] **Recommend: send a "set your password" link, not the password itself** (emailing passwords is unsafe)
- [ ] Follow-up email with the how-to / video link

### Phase 6 — Ship
- [ ] Tests for crop-rule engine + order-status transitions
- [ ] README + `.env.example` updated (names only, never values)
- [ ] Rules deployed (`firebase deploy --only firestore:rules`)

## API keys

**None of Phase 1's core features need a key** — it all runs keyless in development.
Keys are for fires, production-grade tiles/weather, and email. Put every key in
`D:\Desktop\afriagrfed-main\.env` (git-ignored). **Never paste keys into chat,
source files, or commits.** Restart `npm start` / `node server.js` after editing `.env`.

| # | Key | Needed for | Get it | Put in `.env` | Where used |
| - | --- | --- | --- | --- | --- |
| 1 | NASA FIRMS map key (free) | Fire hotspots | firms.modaps.eosdis.nasa.gov/api/map_key | `FIRMS_MAP_KEY=` | server-side only (`server.js` proxy) |
| 2 | MapTiler key (free tier, paid for commercial) | Production satellite/terrain tiles | cloud.maptiler.com → API keys; restrict by HTTP referrer | `REACT_APP_MAPTILER_KEY=` | browser (referrer-restricted) |
| 3 | Open-Meteo commercial key | Weather/soil/flood **once you launch** | open-meteo.com → pricing | `OPEN_METEO_API_KEY=` | server-side proxy |
| 4 | Email provider (Resend or SendGrid) | Registration emails | resend.com / sendgrid.com | `EMAIL_API_KEY=`, `EMAIL_FROM=` | server-side only |

**Licensing flag:** Open-Meteo's free tier and the public OSM/Esri tile servers are
for non-commercial / light use. AfriAgriFed takes a commission, so treat #2 and #3
as **required before public launch** (verify each provider's current terms).

Existing keys (Firebase, Cloudinary, Flutterwave) are unchanged.
