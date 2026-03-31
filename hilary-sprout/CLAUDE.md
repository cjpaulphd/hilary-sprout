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

- **Open-Meteo Forecast** (`api.open-meteo.com/v1/forecast`) — 7-day daily forecast (temp high/low, precipitation, cloud cover)
- **Open-Meteo Archive** (`archive-api.open-meteo.com/v1/archive`) — historical daily data for past 6 months and 10-year averages
- **Open-Meteo Geocoding** (`geocoding-api.open-meteo.com/v1/search`) — location search
- **Nominatim** (`nominatim.openstreetmap.org`) — reverse geocoding for GPS, ZIP code fallback

## Important Patterns

### Temperature Conversion
All temps from Open-Meteo arrive in Celsius. Conversion: `Math.round((celsius * 9/5) + 32)` via `formatTempValue()`.

### Precipitation Conversion
All precipitation from Open-Meteo arrives in millimeters. Conversion to inches: `(mm / 25.4).toFixed(2)` via `formatPrecipValue()`.

### Date Parsing
Open-Meteo returns daily dates as `"YYYY-MM-DD"` strings. JavaScript's `new Date("YYYY-MM-DD")` parses these as **UTC midnight**, which shifts to the previous day in US timezones. Always append `"T00:00:00"` when parsing daily dates to force local time interpretation.

### Data Flow
1. On load/location change: fetch 7-day forecast + current month's archive data
2. Past months are lazy-loaded when the user expands a collapsed month section
3. 10-year historical averages are fetched once per location and cached
4. Forecast and archive data are merged for the current month (forecast takes priority for overlapping days)

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
- **Add a new data field to calendar cells**: Add the parameter to `fetchForecastData()` / `fetchHistoricalData()`, then render it in `renderMonthGrid()` and `renderMonthTable()`
- **Modify theme colors**: Edit CSS variables in `:root` and `[data-theme="light"]` selectors in `styles.css`
