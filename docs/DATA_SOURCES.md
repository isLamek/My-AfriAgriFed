# Where the map's information comes from

Every number on the Map page, its source, how fresh it is, and what it can and
cannot tell you. "Checked" means I tested it against the live service or an
official figure on **2 October 2026**; anything not checked says so.

## Weather and satellite

| Layer | Source | Kind | Freshness / resolution | Licence and credit | Checked |
|---|---|---|---|---|---|
| Wind (animated), temperature, rain | **ECMWF IFS 0.25°** forecast via [Open-Meteo](https://open-meteo.com) | **Forecast** (model) | Hourly for 48 h; model about 25 km; 195-point grid over Namibia | CC BY 4.0 data, "Weather data by Open-Meteo.com". **Free API is non-commercial; commercial use needs a paid plan.** | Live response: 195 locations, 48 hours, no gaps, wind 0–13.9 m/s |
| Weather at a tapped spot | Open-Meteo "best match" global model | Forecast (model estimate for "now") | Hourly, 7 days | as above | Yes |
| Clouds (infrared), storm clouds | **Meteosat-11 SEVIRI** via EUMETSAT EUMETView | **Observed** | New image every 15 min, about 10 min delay | © EUMETSAT. **Free for non-commercial use; commercial use needs EUMETSAT's authorisation.** | Newest frame was 5–10 min old; image shows the Namib coast and clouds |
| Lightning | **MTG-I1 Lightning Imager** (accumulated flash area) via EUMETView | **Observed** | New image every 5 min | © EUMETSAT, same note | Live flashes visible over Hardap/Karas |
| True colour | **MTG-I1 Geo Colour** via EUMETView | Observed (daytime) | Every 10 min | © EUMETSAT, same note | Image checked |
| 30-year rain/temperature averages (crop suitability, rain onset) | **NASA POWER** climatology | Long-term average | About 50 km cells, 30 years | Public domain (NASA) | Oshakati: about 401 mm Nov–Apr, rains start in November |
| River flow outlook | Open-Meteo Flood API (GloFAS) | Forecast (model) | Daily, 7 days | CC BY 4.0, non-commercial free tier | Response checked |
| Fire hotspots | **NASA FIRMS** VIIRS S-NPP and NOAA-20 (about 375 m), fetched by `server.js` | **Observed** (satellite heat detections, not confirmed fires) | Last 48 h, refreshed about every 15 min; satellites pass a few times a day; low-confidence detections are dropped | Free; credit NASA FIRMS (shown on the map) | Parsing and distance logic unit-tested; needs a free `FIRMS_MAP_KEY` |

**How the data reaches the browser.** Forecast, flood and fire requests go through `server.js` (`/api/weather/grid`, `/api/weather/point`, `/api/weather/flood`, `/api/fires`): one cached copy shared by every visitor (grid: 1 h, point forecast: 30 min per ~10 km square, flood: 3 h, fires: 15 min), with the last good copy served for hours if the provider is down. API keys stay on the server; the browser falls back to the public Open-Meteo API only if the backend is unreachable (switch off with `REACT_APP_WEATHER_DIRECT_FALLBACK=false`). Setup: `docs/SETUP_GUIDE.pdf`.

**Forecast vs observed.** Rain, temperature and wind are *forecasts from a
global model*: they cannot see a single thunderstorm over one village. The
satellite layers are *observations* but show cloud and lightning, not rainfall.
There is no weather radar covering Namibia. God's Eye View's radar and
lightning layers use US-only NOAA data, so they cannot be used here.

## Boundaries and places

| Item | Source | How it was checked |
|---|---|---|
| 14 regions (Zambezi; Kavango East and West; ǁKaras and the rest) | OpenStreetMap relations © OpenStreetMap contributors (ODbL), simplified | Area of each region computed on a sphere and compared with the 2023 census table (via Wikipedia "Regions of Namibia"): all within **0.5%** except Zambezi at -1.9%. 16 towns tested: every one falls in the right region. These checks run as automated tests (`src/farmview/regions.test.js`). |
| Towns | Coordinates entered by hand | Each town checked to fall in the correct region; positions are approximate (to a few km). Add smaller settlements from OpenStreetMap place data, not by typing. |
| Basemaps | Esri World Imagery, OpenStreetMap | Credited on the map. Replace with a licensed provider before launch. |

An earlier regions file (geoBoundaries) was **out of date** (pre-2013: one
"Kavango", a "Caprivi", a stray "Cunene" sliver, Kavango 10% too small). It has
been replaced.

## Crop guidance

`src/farmview/cropRules.js` scores seven rain-fed crops from seasonal rainfall
and temperature using broad ranges. It is a **screening aid**, not agronomic
advice: it uses ~50 km climate averages and knows nothing about your soil. It
has been tested for logic but **not reviewed by an agronomist**. See
`docs/LAUNCH_CHECKLIST.md` section 4.

## Farmers' own records

Farms and input records are typed in by the farmer, stored in Firestore under
their account, and visible only to them (and admins for support). Nothing about
them is shared or used on the public map.
