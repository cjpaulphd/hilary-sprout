# Hilary's Sprout - Project Context

## Overview

Hilary's Sprout is a gardening-focused weather dashboard deployed on GitHub Pages. It shows daily temperature, cloud cover, and precipitation in a monthly calendar view to help horticulturalists track growing conditions. It's a single-page app with no build step — just static HTML, CSS, and JavaScript served directly.

## Architecture

- **No framework** — vanilla HTML/CSS/JS, no build tools, no bundler, no package.json
- **All logic in `app.js`** — API fetching, rendering, state management, event handlers
- **No CDN dependencies** — pure vanilla JS, no external libraries
- **State** — global variables (`currentLocation`, `monthlyData`, etc.); favorites persisted in localStorage

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | HTML structure, modal dialogs |
| `app.js` | All application logic |
| `styles.css` | Dark/light theme, calendar grid, data table, responsive layout |
| `manifest.json` | PWA web app manifest |
| `sw.js` | Service worker for offline shell caching |
| `icon.svg` | App icon — sprout-themed |
| `LICENSE` | MIT License |

## APIs Used (no keys required)

Each Open-Meteo product is used for a distinct purpose — do not conflate them:

- **Open-Meteo Forecast** (`api.open-meteo.com/v1/forecast`) — **future dates**: 7-day Best Match forecast (temp high/low, precipitation, cloud cover). Also the source of the location `timezone`.
- **Open-Meteo Historical Forecast** (`historical-forecast-api.open-meteo.com/v1/forecast`) — **recent past**: completed current-month days and the previous 6 months. Primary recent-history source; falls back once to the Archive API on failure.
- **Open-Meteo Archive / Historical Weather** (`archive-api.open-meteo.com/v1/archive`) — **ten-year reanalysis baseline only**. Requests `models=era5_land` first, retrying once without `models` if ERA5-Land returns no usable series. Kept independent from recent Historical Forecast data.
- **Open-Meteo Geocoding** (`geocoding-api.open-meteo.com/v1/search`) — location search
- **Nominatim** (`nominatim.openstreetmap.org`) — reverse geocoding for GPS, ZIP code fallback

Recent past cells and the ten-year baseline are **modeled estimates, not point observations** — never describe non-forecast days as observations, recordings, or gauge readings. Each normalized day record carries a `source` field (`forecast`, `historical-forecast`, or `historical-weather-fallback`) and an `isForecast` flag.

## Important Patterns

### Temperature Conversion
All temps from Open-Meteo arrive in Celsius. Conversion: `Math.round((celsius * 9/5) + 32)` via `formatTempValue()`.

### Precipitation Conversion
All precipitation from Open-Meteo arrives in millimeters. Conversion to inches: `(mm / 25.4).toFixed(2)` via `formatPrecipValue()`. Precipitation includes rain and the water equivalent of frozen precipitation — hence "wet days," not "rainy days."

### Missing Values
Missing/null/nonfinite daily values are **preserved as `null`, never coerced to zero** (`finiteOrNull()`). A genuine zero stays zero. Missing precipitation renders as omitted (grid), an em dash (table), or a blank cell (CSV), and is excluded from totals/averages so partial coverage does not understate results.

### Wet-Day Threshold
The user-set threshold (🌧️ button, mm internally) defines a wet day via `isWetDay(precip)` (strictly greater than the threshold). The same threshold is applied consistently to current summaries, past-month summaries, and ten-year averages. Changing it recomputes aggregates locally from cached daily data — no refetch.

### Location Timezone
All calendar logic ("today," current month, prior-month headings, "yesterday," the MTD cutoff) uses the selected location's local time via `getLocationNow()`, driven by the `timezone` Open-Meteo returns on the forecast response (stored on `currentLocation.timezone` and persisted with the saved location). When the timezone is already known, `loadWeather()` starts the recent-history and ten-year-baseline fetches immediately, in parallel with the forecast; for a first-time location they start as soon as the forecast supplies the timezone (still parallel with each other). The forecast response remains the authority — if its timezone yields a different local date than a stored value, the secondary fetches restart with corrected ranges. A monotonic `currentLoadId` (plus a per-batch identity check) guards against stale responses from a previously selected location.

### Month-to-Date Comparisons
For the current month, summary metrics use only completed (non-forecast) dates, with the cutoff anchored to the **most recent completed day that has data** (recent-history sources lag a day or two behind "yesterday"; anchoring to data keeps both sides of the comparison on an identical span and prevents the summary from blanking during the lag). Each current-month stat shows **two** comparison lines: the ten-year average for the same day-of-month span (`10yr MTD avg`, via `computeMonthToDateAverages()`) and the complete-calendar-month ten-year average (`10yr month avg`) so a gardener can see how much more rain the rest of the month typically brings. Completed past months use complete-month averages (`10yr avg`). The 12 historical-average cards always show complete-month values. When the ten-year baseline finishes loading, `rerenderAll()` refreshes every visible summary — including already-expanded past months — so no period is left without its comparison. `hasUsableDailySeries()` requires usable temperature **and** precipitation before accepting an ERA5-Land response, so a precip-less series triggers the fallback rather than silently dropping rain comparisons.

### Date Parsing
Open-Meteo returns daily dates as `"YYYY-MM-DD"` strings. JavaScript's `new Date("YYYY-MM-DD")` parses these as **UTC midnight**, which shifts to the previous day in US timezones. Always append `"T00:00:00"` when parsing daily dates to force local time interpretation.

### Data Flow
1. On load/location change: the 7-day forecast, completed current-month days (Historical Forecast API), and the ten-year baseline load **in parallel** when the location's timezone is already known; otherwise the forecast goes first (to learn the timezone) and the other two start together the moment it returns. The calendar paints with forecast days as soon as the forecast arrives; completed days fill in when recent history lands
2. Past months (previous 6) are lazy-loaded from the Historical Forecast API when the user expands a collapsed month section
3. The ten-year ERA5-Land baseline is fetched once per location; the raw daily series is cached in `historicalIndex` so threshold changes recompute aggregates locally
4. Forecast and recent-history data are merged for the current month (forecast takes priority for overlapping days)

### localStorage Keys
All keys are prefixed with `hilarysprout_` to avoid conflicts:
- `hilarysprout_last_location` — last used location
- `hilarysprout_favorites` — saved favorite locations
- `hilarysprout_temp_unit` — F or C
- `hilarysprout_theme` — dark or light
- `hilarysprout_view_mode` — grid or table

## Deployment

Hosted on GitHub Pages from the `main` branch root. Push to `main` and the site updates automatically.

## Testing

No automated tests. Manual testing: open index.html in a browser, verify calendar grid renders, try different locations, toggle between grid/table view, check precipitation highlighting, export CSV.

## Common Tasks

- **Change default location**: Update `DEFAULT_LOCATION` at the top of `app.js`
- **Add a new data field to calendar cells**: Add the parameter to `DAILY_FIELDS` / `fetchForecastData()` / `fetchRecentHistory()`, normalize it in `processDailyData()` (preserving missing values as `null`), then render it in `renderMonthGrid()` and `renderMonthTable()`
- **Modify theme colors**: Edit CSS variables in `:root` and `[data-theme="light"]` selectors in `styles.css`
