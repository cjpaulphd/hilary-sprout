# Hilary's Sprout

A gardening-focused weather dashboard that displays daily temperature, cloud cover, and precipitation in a monthly calendar view to help horticulturalists track growing conditions. No API keys required.

**Live Site:** [hilary-sprout.weatherwonder.app](https://hilary-sprout.weatherwonder.app/)

## Features

### Monthly Calendar View

- **Calendar Grid** — Visual day-by-day grid showing high/low temps, cloud cover icons, and precipitation for each day
- **Data Table** — Sortable table view as an alternative to the calendar grid, with columns for date, high, low, cloud cover, and precipitation
- **Monthly Summaries** — Total precipitation, wet days, average high, and average low. For the current month these are month-to-date (completed days only) and compared against the ten-year average for the same day-of-month span (`10yr MTD avg`); completed past months compare against the complete-month ten-year average (`10yr avg`)
- **Past Months** — Expandable sections for the previous 6 months, lazy-loaded on demand
- **Forecast Days** — Current 7-day forecast shown with dashed borders, merged with recent modeled history for the current month

### Historical Data

- **10-Year Monthly Averages** — Average high, low, precipitation totals, and wet days for each month, computed from the past 10 complete years
- **Comparison Stats** — Monthly summaries show how the current period compares to the ten-year average (like-for-like: month-to-date vs. month-to-date, complete month vs. complete month)

### Data Notes

- **Location-Timezone Aware** — "Today," the current month, prior-month headings, and "yesterday" are all computed in the selected location's local time, not the browser's
- **Wet-Day Threshold** — The 🌧️ button sets the minimum daily precipitation (rain plus the water equivalent of frozen precipitation) required to count as a wet day; the same threshold is applied consistently to current summaries, past-month summaries, and ten-year averages
- **Missing Values Preserved** — Null/missing daily values are never converted to zero; they are excluded from totals and averages so partial coverage does not understate results

### User Experience

- **Location Search** — Search any city or ZIP code, or use GPS for current location
- **Favorite Locations** — Save and reorder locations from the side menu with drag-and-drop
- **Precipitation Highlighting** — Wet days (above the threshold) are highlighted in green; days with 5 mm or more precipitation get stronger highlighting
- **Today Indicator** — Current day is outlined in green for quick reference
- **Dark/Light Theme** — Toggle between dark and light themes, defaults to system preference
- **Unit Toggle** — Switch between °F/°C (precipitation converts between inches and mm)
- **CSV Export** — Export all loaded weather data to a CSV file
- **Share This App** — Share via native device sharing or copy the app URL to clipboard
- **Add to Home Screen** — Installable as a PWA on iOS (step-by-step instruction modal), Android, and desktop browsers
- **Refresh Button** — One-tap weather data refresh with spinning animation
- **Responsive Design** — Scales from mobile to desktop (max 900px)

### Sister App

- **[WeatherWonder](https://www.weatherwonder.app/)** — Companion app for detailed forecasts, live radar, NWS alerts, and astronomical data

## Data Sources

All APIs are free and require no API keys:

| Source | Usage |
|--------|-------|
| [Open-Meteo Forecast](https://open-meteo.com/en/docs) | Future dates — 7-day Best Match forecast (temp high/low, precipitation, cloud cover) |
| [Open-Meteo Historical Forecast](https://open-meteo.com/en/docs/historical-forecast-api) | Recent past — completed current-month days and the previous 6 months (modeled history, not point measurements) |
| [Open-Meteo Historical Weather](https://open-meteo.com/en/docs/historical-weather-api) | Ten-year reanalysis baseline (ERA5-Land requested first, falling back to the default model) |
| [Open-Meteo Geocoding](https://open-meteo.com/) | Location search by city name |
| [Nominatim](https://nominatim.openstreetmap.org/) | Reverse geocoding for GPS and ZIP code fallback |

Recent past cells and the ten-year baseline use different Open-Meteo model products, so they are modeled estimates rather than instrument observations, and comparisons are meant for practical context rather than measurement-grade climate anomalies.

## Quick Start

Open `index.html` in any modern web browser. No build step or server required.

For local development:

```
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Deployment (GitHub Pages)

This project is deployed via GitHub Pages from the `main` branch:

1. Push changes to `main`
2. In GitHub repo Settings > Pages, set source to "Deploy from a branch" > `main` > `/ (root)`
3. Site is live at `https://hilary-sprout.weatherwonder.app/`

## Project Structure

```
hilary-sprout/
├── index.html      # HTML structure and modal dialogs
├── app.js          # All application logic, API calls, and rendering
├── styles.css      # Dark/light theme styling and responsive layout
├── manifest.json   # PWA web app manifest
├── sw.js           # Service worker for offline shell caching
├── icon.svg        # Sprout-themed app icon
├── LICENSE         # MIT License
├── CLAUDE.md       # AI assistant project context
└── README.md       # This file
```

## API Endpoints

- **Forecast:** `https://api.open-meteo.com/v1/forecast`
- **Historical Forecast:** `https://historical-forecast-api.open-meteo.com/v1/forecast`
- **Archive (Historical Weather):** `https://archive-api.open-meteo.com/v1/archive`
- **Geocoding:** `https://geocoding-api.open-meteo.com/v1/search`
- **Reverse Geocoding:** `https://nominatim.openstreetmap.org/reverse`

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Optimized for mobile devices with touch interactions and responsive layout.

## Privacy

All favorite locations and preferences are stored locally in your browser via `localStorage`. No personal data is collected or sent to any server. Only anonymous weather API requests are made for the selected location coordinates.

This site uses [GoatCounter](https://www.goatcounter.com/) for privacy-friendly, anonymous usage statistics. GoatCounter does not use cookies, does not collect personal or identifiable data, and is fully GDPR/CCPA compliant without requiring a consent banner. The statistics collected are limited to anonymous page views and aggregate counts (browser type, screen size, country from IP — the IP itself is not stored).

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Hilary's Sprout by cjpaulphd**
