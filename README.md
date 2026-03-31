# Hilary's Sprout

A gardening-focused weather dashboard that displays daily temperature, cloud cover, and precipitation in a monthly calendar view to help horticulturalists track growing conditions. No API keys required.

**Live Site:** [cjpaulphd.github.io/hilary-sprout](https://cjpaulphd.github.io/hilary-sprout/)

## Features

### Monthly Calendar View

- **Calendar Grid** — Visual day-by-day grid showing high/low temps, cloud cover icons, and precipitation for each day
- **Data Table** — Sortable table view as an alternative to the calendar grid, with columns for date, high, low, cloud cover, and precipitation
- **Monthly Summaries** — Total precipitation, rainy days, average high, and average low with comparison deltas against 10-year historical averages
- **Past Months** — Expandable sections for the previous 6 months, lazy-loaded on demand
- **Forecast Days** — Current 7-day forecast shown with dashed borders, merged with archive data for the current month

### Historical Data

- **10-Year Monthly Averages** — Average high, low, precipitation totals, and rainy days for each month, computed from the past 10 years of data
- **Comparison Stats** — Monthly summaries show how the current month compares to the 10-year average (above/below indicators)

### User Experience

- **Location Search** — Search any city or ZIP code, or use GPS for current location
- **Favorite Locations** — Save and reorder locations from the side menu with drag-and-drop
- **Precipitation Highlighting** — Days with rain are highlighted in green; heavy rain days get stronger highlighting
- **Today Indicator** — Current day is outlined in green for quick reference
- **Dark/Light Theme** — Toggle between dark and light themes, defaults to system preference
- **Unit Toggle** — Switch between °F/°C (precipitation converts between inches and mm)
- **CSV Export** — Export all loaded weather data to a CSV file
- **Share This App** — Share via native device sharing or copy the app URL to clipboard
- **Add to Home Screen** — Installable as a PWA on iOS (step-by-step instruction modal), Android, and desktop browsers
- **Refresh Button** — One-tap weather data refresh with spinning animation
- **Responsive Design** — Scales from mobile to desktop (max 900px)

### Sister App

- **[WeatherWonder](https://cjpaulphd.github.io/weatherwonder/)** — Companion app for detailed forecasts, live radar, NWS alerts, and astronomical data

## Data Sources

All APIs are free and require no API keys:

| Source | Usage |
|--------|-------|
| [Open-Meteo Forecast](https://open-meteo.com/) | 7-day daily forecast (temp high/low, precipitation, cloud cover) |
| [Open-Meteo Archive](https://open-meteo.com/) | Historical daily data for past months and 10-year averages |
| [Open-Meteo Geocoding](https://open-meteo.com/) | Location search by city name |
| [Nominatim](https://nominatim.openstreetmap.org/) | Reverse geocoding for GPS and ZIP code fallback |

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
3. Site is live at `https://<username>.github.io/hilary-sprout/`

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
- **Archive:** `https://archive-api.open-meteo.com/v1/archive`
- **Geocoding:** `https://geocoding-api.open-meteo.com/v1/search`
- **Reverse Geocoding:** `https://nominatim.openstreetmap.org/reverse`

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Optimized for mobile devices with touch interactions and responsive layout.

## Privacy

All favorite locations and preferences are stored locally in your browser via `localStorage`. No personal data is collected or sent to any server. Only anonymous weather API requests are made for the selected location coordinates.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Hilary's Sprout by cjpaulphd**
