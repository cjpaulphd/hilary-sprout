// Hilary's Sprout - Gardening Weather Dashboard
// Uses Open-Meteo API (free, no API key required)

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_API = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

const DEFAULT_LOCATION = {
    name: 'Durham, NC',
    latitude: 35.994,
    longitude: -78.8986
};

const LAST_LOCATION_KEY = 'hilarysprout_last_location';
const FAVORITES_KEY = 'hilarysprout_favorites';
const TEMP_UNIT_KEY = 'hilarysprout_temp_unit';
const THEME_KEY = 'hilarysprout_theme';
const VIEW_MODE_KEY = 'hilarysprout_view_mode';

// Global state
let currentLocation = getLastLocation() || DEFAULT_LOCATION;
let monthlyData = {};       // keyed by "YYYY-MM", each entry has { days: [...], isForecast: {...} }
let historicalAverages = null;
let viewMode = getViewMode(); // 'grid' or 'table'
let expandedMonths = {};    // keyed by "YYYY-MM", true if expanded
let loadingMonths = {};     // keyed by "YYYY-MM", true if currently fetching
let tableSortState = {};    // keyed by "YYYY-MM", { column, ascending }

// ─── localStorage Helpers ────────────────────────────────────────────

function getLastLocation() {
    try {
        const stored = localStorage.getItem(LAST_LOCATION_KEY);
        if (stored) {
            const loc = JSON.parse(stored);
            if (loc.name && loc.latitude && loc.longitude) return loc;
        }
    } catch (e) {}
    return null;
}

function saveLastLocation(location) {
    try {
        localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude
        }));
    } catch (e) {}
}

function getTempUnit() {
    try { return localStorage.getItem(TEMP_UNIT_KEY) || 'F'; } catch (e) { return 'F'; }
}

function saveTempUnit(unit) {
    try { localStorage.setItem(TEMP_UNIT_KEY, unit); } catch (e) {}
}

function getTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function getViewMode() {
    try { return localStorage.getItem(VIEW_MODE_KEY) || 'grid'; } catch (e) { return 'grid'; }
}

function saveViewMode(mode) {
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch (e) {}
}

// ─── Locale Detection ────────────────────────────────────────────────

function detectLocaleDefaults() {
    try {
        if (localStorage.getItem(TEMP_UNIT_KEY) === null) {
            const lang = navigator.language || '';
            const parts = lang.split('-');
            const country = parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : '';
            const imperial = ['US', 'LR', 'MM', 'FM', 'MH', 'PW'];
            localStorage.setItem(TEMP_UNIT_KEY, imperial.includes(country) ? 'F' : 'C');
        }
    } catch (e) {}
}

// ─── Unit Formatting ─────────────────────────────────────────────────

function formatTempValue(celsius) {
    if (celsius == null) return '—';
    const unit = getTempUnit();
    if (unit === 'C') return Math.round(celsius) + '°';
    return Math.round((celsius * 9 / 5) + 32) + '°';
}

function formatTempRaw(celsius) {
    if (celsius == null) return null;
    const unit = getTempUnit();
    if (unit === 'C') return Math.round(celsius);
    return Math.round((celsius * 9 / 5) + 32);
}

function formatPrecipValue(mm) {
    if (mm == null) return '—';
    const unit = getTempUnit();
    if (unit === 'C') return mm.toFixed(1) + ' mm';
    return (mm / 25.4).toFixed(2) + ' in';
}

function formatPrecipRaw(mm) {
    if (mm == null) return 0;
    const unit = getTempUnit();
    if (unit === 'C') return parseFloat(mm.toFixed(1));
    return parseFloat((mm / 25.4).toFixed(2));
}

function precipUnit() {
    return getTempUnit() === 'C' ? 'mm' : 'in';
}

function tempUnitLabel() {
    return getTempUnit() === 'C' ? '°C' : '°F';
}

function formatCloudCover(percent) {
    if (percent == null) return '—';
    const p = Math.round(percent);
    if (p <= 20) return '☀️ ' + p + '%';
    if (p <= 50) return '⛅ ' + p + '%';
    if (p <= 80) return '🌥️ ' + p + '%';
    return '☁️ ' + p + '%';
}

// ─── Favorites ───────────────────────────────────────────────────────

function getFavorites() {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}

function saveFavorites(favorites) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch (e) {}
}

function locationsMatch(a, b) {
    if (a.name && b.name && a.name.toLowerCase() === b.name.toLowerCase()) return true;
    return Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01;
}

function isFavorite(location) {
    return getFavorites().some(f => locationsMatch(f, location));
}

function addFavorite(location) {
    const favorites = getFavorites();
    if (favorites.some(f => locationsMatch(f, location))) {
        showToast('Already in favorites');
        return;
    }
    favorites.push({ name: location.name, latitude: location.latitude, longitude: location.longitude });
    saveFavorites(favorites);
    updateFavoriteButton();
    renderFavoritesList();
}

function removeFavorite(location) {
    saveFavorites(getFavorites().filter(f => !locationsMatch(f, location)));
    updateFavoriteButton();
    renderFavoritesList();
}

function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (!btn) return;
    if (isFavorite(currentLocation)) {
        btn.textContent = '★';
        btn.classList.add('active');
    } else {
        btn.textContent = '☆';
        btn.classList.remove('active');
    }
}

function renderFavoritesList() {
    const list = document.getElementById('favorites-list');
    if (!list) return;
    const favorites = getFavorites();

    if (favorites.length === 0) {
        list.innerHTML = '<p class="no-favorites">No favorites yet. Tap the star next to a location to add it.</p>';
        return;
    }

    list.innerHTML = favorites.map((fav, i) => `
        <div class="favorite-item" draggable="true" data-index="${i}">
            <span class="fav-name">${fav.name}</span>
            <button class="fav-remove" data-index="${i}" aria-label="Remove">&times;</button>
        </div>
    `).join('');

    // Click to select
    list.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-remove')) return;
            const idx = parseInt(item.dataset.index);
            const fav = favorites[idx];
            selectLocation({ name: fav.name.split(',')[0], admin1: fav.name.includes(',') ? fav.name.split(',').slice(1).join(',').trim() : '', latitude: fav.latitude, longitude: fav.longitude });
            closeMenu();
        });
    });

    // Remove buttons
    list.querySelectorAll('.fav-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            removeFavorite(favorites[idx]);
        });
    });

    // Drag and drop reorder
    let dragIdx = null;
    list.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragIdx = parseInt(item.dataset.index);
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            dragIdx = null;
        });
        item.addEventListener('dragover', (e) => e.preventDefault());
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropIdx = parseInt(item.dataset.index);
            if (dragIdx !== null && dragIdx !== dropIdx) {
                const favs = getFavorites();
                const moved = favs.splice(dragIdx, 1)[0];
                favs.splice(dropIdx, 0, moved);
                saveFavorites(favs);
                renderFavoritesList();
            }
        });
    });
}

// ─── Toast ───────────────────────────────────────────────────────────

function showToast(msg, duration) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), duration || 2500);
}

// ─── Theme ───────────────────────────────────────────────────────────

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f5f5' : '#1a1a1a');
}

function updateThemeToggleUI() {
    const label = document.getElementById('theme-toggle-label');
    if (!label) return;
    const theme = getTheme() || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    label.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = getTheme() || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
    updateThemeToggleUI();
}

// ─── Temp Toggle ─────────────────────────────────────────────────────

function updateTempToggleUI() {
    const label = document.getElementById('temp-toggle-label');
    if (!label) return;
    label.textContent = getTempUnit() === 'F' ? '°C' : '°F';
}

function toggleTempUnit() {
    const next = getTempUnit() === 'F' ? 'C' : 'F';
    saveTempUnit(next);
    updateTempToggleUI();
    rerenderAll();
}

// ─── View Mode Toggle ────────────────────────────────────────────────

function updateViewToggleUI() {
    const gridBtn = document.getElementById('view-grid-btn');
    const tableBtn = document.getElementById('view-table-btn');
    if (gridBtn) gridBtn.classList.toggle('active', viewMode === 'grid');
    if (tableBtn) tableBtn.classList.toggle('active', viewMode === 'table');
}

function setViewMode(mode) {
    viewMode = mode;
    saveViewMode(mode);
    updateViewToggleUI();
    rerenderAll();
}

// ─── Location Search / Geocoding ─────────────────────────────────────

const US_STATE_ABBREVS = {
    'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
    'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
    'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
    'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
    'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
    'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
    'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
    'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
    'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
    'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming',
    'dc': 'district of columbia'
};

async function geocodeLocation(query) {
    const trimmed = query.trim();
    const isZip = /^\d{5}(-\d{4})?$/.test(trimmed);

    if (!isZip) {
        let searchName = trimmed;
        let regionFilter = null;
        const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/);
        if (commaMatch) {
            searchName = commaMatch[1].trim();
            regionFilter = commaMatch[2].trim().toLowerCase();
        }

        const params = new URLSearchParams({ name: searchName, count: 10, language: 'en', format: 'json' });
        const response = await fetch(`${GEOCODING_API}?${params}`);
        if (!response.ok) throw new Error('Failed to geocode location');
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            let results = data.results;
            if (regionFilter) {
                const expanded = US_STATE_ABBREVS[regionFilter] || regionFilter;
                const filtered = results.filter(r => {
                    const a = (r.admin1 || '').toLowerCase();
                    const c = (r.country || '').toLowerCase();
                    const cc = (r.country_code || '').toLowerCase();
                    return a === expanded || a.startsWith(expanded) || c.startsWith(expanded) || cc === regionFilter;
                });
                if (filtered.length > 0) results = filtered;
            }
            return results;
        }
    }

    // Fallback to Nominatim for ZIP codes or no results
    const nomParams = new URLSearchParams({ q: trimmed, format: 'json', limit: 5, addressdetails: 1 });
    if (isZip) nomParams.set('countrycodes', 'us');
    const nomResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${nomParams}`,
        { headers: { 'User-Agent': 'HilarySprout (gardening-weather-app)' } }
    );
    if (!nomResponse.ok) throw new Error('Failed to geocode location');
    const nomData = await nomResponse.json();

    if (!nomData || nomData.length === 0) throw new Error('Location not found');

    return nomData.map(r => ({
        name: r.address ? (r.address.city || r.address.town || r.address.village || r.address.hamlet || r.display_name.split(',')[0]) : r.display_name.split(',')[0],
        admin1: r.address ? (r.address.state || '') : '',
        country: r.address ? (r.address.country || '') : '',
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon)
    }));
}

function selectLocation(result) {
    currentLocation = {
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}`,
        latitude: result.latitude,
        longitude: result.longitude
    };
    updateLocationDisplay();
    saveLastLocation(currentLocation);
    monthlyData = {};
    historicalAverages = null;
    expandedMonths = {};
    loadWeather();
}

function showDisambiguation(results) {
    const container = document.getElementById('disambiguation-results');
    container.innerHTML = '<p class="disambiguation-title">Multiple locations found:</p>';
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'disambiguation-item';
        let label = result.name;
        if (result.admin1) label += `, ${result.admin1}`;
        if (result.country) label += `, ${result.country}`;
        const fav = isFavorite(result);
        item.innerHTML = `<span>${label}</span>${fav ? '<span class="disambiguation-fav-star">★</span>' : ''}`;
        item.addEventListener('click', () => {
            selectLocation(result);
            document.getElementById('location-modal').classList.add('hidden');
        });
        container.appendChild(item);
    });
    container.classList.remove('hidden');
}

async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const params = new URLSearchParams({ lat: latitude, lon: longitude, format: 'json' });
                    const resp = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?${params}`,
                        { headers: { 'User-Agent': 'HilarySprout (gardening-weather-app)' } }
                    );
                    const data = await resp.json();
                    const name = data.address ? (data.address.city || data.address.town || data.address.village || 'Current Location') : 'Current Location';
                    const state = data.address ? (data.address.state || '') : '';
                    resolve({ name, admin1: state, latitude, longitude });
                } catch (e) {
                    resolve({ name: 'Current Location', admin1: '', latitude, longitude });
                }
            },
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 10000 }
        );
    });
}

function updateLocationDisplay() {
    const el = document.getElementById('location-name');
    if (el) el.textContent = currentLocation.name;
    updateFavoriteButton();
}

// ─── Menu ────────────────────────────────────────────────────────────

function openMenu() {
    document.getElementById('menu-panel').classList.remove('hidden');
    document.getElementById('menu-overlay').classList.remove('hidden');
    renderFavoritesList();
}

function closeMenu() {
    document.getElementById('menu-panel').classList.add('hidden');
    document.getElementById('menu-overlay').classList.add('hidden');
}

// ─── Date Helpers ────────────────────────────────────────────────────

function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function monthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function parseDate(str) {
    return new Date(str + 'T00:00:00');
}

function todayStr() {
    const d = new Date();
    return fmtDate(d);
}

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Data Fetching ───────────────────────────────────────────────────

async function fetchForecastData(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'cloud_cover_mean'].join(','),
        temperature_unit: 'celsius',
        precipitation_unit: 'mm',
        timezone: 'auto',
        forecast_days: 7
    });
    const response = await fetch(`${FORECAST_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch forecast data');
    return response.json();
}

async function fetchHistoricalData(lat, lon, startDate, endDate) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'cloud_cover_mean'].join(','),
        temperature_unit: 'celsius',
        precipitation_unit: 'mm',
        timezone: 'auto',
        start_date: startDate,
        end_date: endDate
    });
    const response = await fetch(`${ARCHIVE_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical data');
    return response.json();
}

async function fetchHistoricalAverages(lat, lon) {
    const now = new Date();
    const endYear = now.getFullYear() - 1;
    const startYear = endYear - 9;

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'].join(','),
        temperature_unit: 'celsius',
        precipitation_unit: 'mm',
        timezone: 'auto',
        start_date: `${startYear}-01-01`,
        end_date: `${endYear}-12-31`
    });

    const response = await fetch(`${ARCHIVE_API}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch historical averages');
    const data = await response.json();

    // Aggregate by month across all years
    const monthly = {};
    for (let m = 0; m < 12; m++) {
        monthly[m] = { highs: [], lows: [], precipTotals: [], rainyDays: [] };
    }

    // Group daily data by year-month
    const yearMonthData = {};
    for (let i = 0; i < data.daily.time.length; i++) {
        const d = parseDate(data.daily.time[i]);
        const m = d.getMonth();
        const ym = d.getFullYear() + '-' + m;

        if (!yearMonthData[ym]) yearMonthData[ym] = { highs: [], lows: [], precip: 0, rainyDays: 0 };
        const entry = yearMonthData[ym];

        const hi = data.daily.temperature_2m_max[i];
        const lo = data.daily.temperature_2m_min[i];
        const pr = data.daily.precipitation_sum[i] || 0;

        if (hi != null) entry.highs.push(hi);
        if (lo != null) entry.lows.push(lo);
        entry.precip += pr;
        if (pr > 0) entry.rainyDays++;
    }

    // Average across years for each month
    for (const [ym, d] of Object.entries(yearMonthData)) {
        const m = parseInt(ym.split('-')[1]);
        if (d.highs.length > 0) monthly[m].highs.push(d.highs.reduce((a, b) => a + b, 0) / d.highs.length);
        if (d.lows.length > 0) monthly[m].lows.push(d.lows.reduce((a, b) => a + b, 0) / d.lows.length);
        monthly[m].precipTotals.push(d.precip);
        monthly[m].rainyDays.push(d.rainyDays);
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const result = [];
    for (let m = 0; m < 12; m++) {
        result.push({
            month: m,
            avgHigh: avg(monthly[m].highs),
            avgLow: avg(monthly[m].lows),
            avgPrecip: avg(monthly[m].precipTotals),
            avgRainyDays: Math.round(avg(monthly[m].rainyDays))
        });
    }
    return result;
}

// ─── Data Merge ──────────────────────────────────────────────────────

function processDailyData(apiData, forecastDates) {
    const days = {};
    const daily = apiData.daily;
    for (let i = 0; i < daily.time.length; i++) {
        const dateStr = daily.time[i];
        days[dateStr] = {
            date: dateStr,
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i],
            precip: daily.precipitation_sum[i] || 0,
            cloud: daily.cloud_cover_mean ? daily.cloud_cover_mean[i] : null,
            isForecast: forecastDates ? forecastDates.has(dateStr) : false
        };
    }
    return days;
}

function mergeIntoMonthlyData(dayEntries) {
    for (const [dateStr, entry] of Object.entries(dayEntries)) {
        const d = parseDate(dateStr);
        const key = monthKey(d.getFullYear(), d.getMonth());
        if (!monthlyData[key]) monthlyData[key] = {};
        // Forecast data takes priority over archive for same day
        if (!monthlyData[key][dateStr] || entry.isForecast) {
            monthlyData[key][dateStr] = entry;
        }
    }
}

function getMonthDays(year, month) {
    const key = monthKey(year, month);
    const data = monthlyData[key] || {};
    const numDays = daysInMonth(year, month);
    const result = [];
    for (let d = 1; d <= numDays; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        result.push(data[dateStr] || { date: dateStr, high: null, low: null, precip: null, cloud: null, isForecast: false });
    }
    return result;
}

// ─── Load Weather ────────────────────────────────────────────────────

async function loadWeather() {
    const { latitude: lat, longitude: lon } = currentLocation;
    const now = new Date();
    const currentMonthEl = document.getElementById('current-month-content');
    const summaryEl = document.getElementById('current-month-summary');
    const avgEl = document.getElementById('averages-content');

    if (currentMonthEl) currentMonthEl.innerHTML = '<div class="loading">Loading weather data...</div>';
    if (summaryEl) summaryEl.innerHTML = '';
    if (avgEl) avgEl.innerHTML = '<div class="loading">Loading historical averages...</div>';

    const titleEl = document.getElementById('current-month-title');
    if (titleEl) titleEl.textContent = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

    updateLocationDisplay();
    updateLastUpdated();

    try {
        // Fetch forecast and current month's archive in parallel
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const yesterdayStr = fmtDate(yesterday);

        const promises = [fetchForecastData(lat, lon)];
        // Only fetch archive if there are past days in the current month
        if (yesterday.getDate() >= 1 && yesterday.getMonth() === now.getMonth()) {
            promises.push(fetchHistoricalData(lat, lon, monthStart, yesterdayStr));
        }

        const results = await Promise.all(promises);
        const forecastData = results[0];
        const archiveData = results[1];

        // Process forecast
        const forecastDates = new Set(forecastData.daily.time);
        const forecastDays = processDailyData(forecastData, forecastDates);
        mergeIntoMonthlyData(forecastDays);

        // Process archive for current month
        if (archiveData) {
            const archiveDays = processDailyData(archiveData, null);
            mergeIntoMonthlyData(archiveDays);
        }

        // Render current month
        renderCurrentMonth();
        renderPastMonthHeaders();

    } catch (err) {
        console.error('Error loading weather:', err);
        if (currentMonthEl) currentMonthEl.innerHTML = '<div class="loading">Failed to load weather data. Please try again.</div>';
    }

    // Fetch 10-year averages in background
    fetchHistoricalAverages(lat, lon).then(avgs => {
        historicalAverages = avgs;
        renderHistoricalAverages();
    }).catch(err => {
        console.error('Error loading averages:', err);
        if (avgEl) avgEl.innerHTML = '<div class="loading">Failed to load historical averages.</div>';
    });
}

async function loadMonthData(year, month) {
    const key = monthKey(year, month);
    if (loadingMonths[key]) return;
    loadingMonths[key] = true;

    const { latitude: lat, longitude: lon } = currentLocation;
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = daysInMonth(year, month);
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
        const data = await fetchHistoricalData(lat, lon, startDate, endDate);
        const days = processDailyData(data, null);
        mergeIntoMonthlyData(days);
    } catch (err) {
        console.error(`Error loading ${key}:`, err);
    }

    loadingMonths[key] = false;
}

function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    const now = new Date();
    el.textContent = `Updated ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

// ─── Rendering: Calendar Grid ────────────────────────────────────────

function renderMonthGrid(container, year, month) {
    const days = getMonthDays(year, month);
    const today = todayStr();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

    let html = '<div class="calendar-grid">';
    // Header row
    DAY_NAMES.forEach(d => { html += `<div class="calendar-header">${d}</div>`; });

    // Leading empty cells
    for (let i = 0; i < firstDow; i++) {
        html += '<div class="calendar-cell empty"></div>';
    }

    // Day cells
    days.forEach(day => {
        const hasData = day.high != null;
        const isToday = day.date === today;
        const isForecast = day.isForecast;
        const hasPrecip = day.precip != null && day.precip > 0;
        const heavyPrecip = day.precip != null && day.precip > 5;

        let cls = 'calendar-cell';
        if (!hasData) cls += ' empty-data';
        if (isToday) cls += ' today';
        if (isForecast) cls += ' forecast';
        if (hasPrecip) cls += heavyPrecip ? ' precip-day-heavy' : ' precip-day';

        html += `<div class="${cls}">`;
        const dayNum = parseDate(day.date).getDate();
        html += `<div class="cell-day">${dayNum}</div>`;

        if (hasData) {
            html += `<div class="cell-temp"><span class="hi">${formatTempValue(day.high)}</span>/<span class="lo">${formatTempValue(day.low)}</span></div>`;
            html += `<div class="cell-cloud">${formatCloudCover(day.cloud)}</div>`;
            if (hasPrecip) {
                html += `<div class="cell-precip">${formatPrecipValue(day.precip)}</div>`;
            }
        }
        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

// ─── Rendering: Data Table ───────────────────────────────────────────

function renderMonthTable(container, year, month) {
    const days = getMonthDays(year, month);
    const today = todayStr();
    const key = monthKey(year, month);
    const sort = tableSortState[key] || { column: 'date', ascending: true };

    const sortedDays = [...days].sort((a, b) => {
        let va, vb;
        switch (sort.column) {
            case 'date': va = a.date; vb = b.date; break;
            case 'high': va = a.high ?? -999; vb = b.high ?? -999; break;
            case 'low': va = a.low ?? -999; vb = b.low ?? -999; break;
            case 'cloud': va = a.cloud ?? -1; vb = b.cloud ?? -1; break;
            case 'precip': va = a.precip ?? -1; vb = b.precip ?? -1; break;
            default: va = a.date; vb = b.date;
        }
        if (va < vb) return sort.ascending ? -1 : 1;
        if (va > vb) return sort.ascending ? 1 : -1;
        return 0;
    });

    const arrow = (col) => {
        if (sort.column !== col) return '';
        return `<span class="sort-arrow">${sort.ascending ? '▲' : '▼'}</span>`;
    };

    let html = `<table class="data-table">
        <thead><tr>
            <th data-col="date">Date${arrow('date')}</th>
            <th data-col="high">High${arrow('high')}</th>
            <th data-col="low">Low${arrow('low')}</th>
            <th data-col="cloud">Cloud${arrow('cloud')}</th>
            <th data-col="precip">Precip${arrow('precip')}</th>
        </tr></thead><tbody>`;

    sortedDays.forEach(day => {
        const hasData = day.high != null;
        const isToday = day.date === today;
        const hasPrecip = day.precip != null && day.precip > 0;
        const heavyPrecip = day.precip != null && day.precip > 5;

        let cls = '';
        if (isToday) cls += ' today-row';
        if (day.isForecast) cls += ' forecast-row';
        if (hasPrecip) cls += heavyPrecip ? ' precip-row-heavy' : ' precip-row';

        const d = parseDate(day.date);
        const dateLabel = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;

        html += `<tr class="${cls.trim()}">`;
        html += `<td>${dateLabel}</td>`;
        html += `<td><span class="hi">${hasData ? formatTempValue(day.high) : '—'}</span></td>`;
        html += `<td><span class="lo">${hasData ? formatTempValue(day.low) : '—'}</span></td>`;
        html += `<td>${hasData ? formatCloudCover(day.cloud) : '—'}</td>`;
        html += `<td>${hasPrecip ? `<span class="precip-val">${formatPrecipValue(day.precip)}</span>` : (hasData ? '0' : '—')}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Sort click handlers
    container.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (sort.column === col) {
                sort.ascending = !sort.ascending;
            } else {
                sort.column = col;
                sort.ascending = true;
            }
            tableSortState[key] = sort;
            renderMonthTable(container, year, month);
        });
    });
}

// ─── Rendering: Month Summary ────────────────────────────────────────

function renderMonthSummary(container, year, month) {
    const days = getMonthDays(year, month);
    const withData = days.filter(d => d.high != null);
    if (withData.length === 0) {
        container.innerHTML = '';
        return;
    }

    const totalPrecip = withData.reduce((sum, d) => sum + (d.precip || 0), 0);
    const rainyDays = withData.filter(d => d.precip > 0).length;
    const avgHigh = withData.reduce((sum, d) => sum + d.high, 0) / withData.length;
    const avgLow = withData.reduce((sum, d) => sum + d.low, 0) / withData.length;

    container.innerHTML = `
        <div class="summary-stat">
            <div class="stat-value">${formatPrecipValue(totalPrecip)}</div>
            <div class="stat-label">Total Precip</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${rainyDays}</div>
            <div class="stat-label">Rainy Days</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${formatTempValue(avgHigh)}</div>
            <div class="stat-label">Avg High</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${formatTempValue(avgLow)}</div>
            <div class="stat-label">Avg Low</div>
        </div>
    `;
}

// ─── Render Current Month ────────────────────────────────────────────

function renderCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const container = document.getElementById('current-month-content');
    const summaryEl = document.getElementById('current-month-summary');

    if (!container) return;

    if (viewMode === 'grid') {
        renderMonthGrid(container, year, month);
    } else {
        renderMonthTable(container, year, month);
    }

    if (summaryEl) renderMonthSummary(summaryEl, year, month);
}

// ─── Past Months ─────────────────────────────────────────────────────

function getPastMonths() {
    const now = new Date();
    const months = [];
    for (let i = 1; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return months;
}

function renderPastMonthHeaders() {
    const container = document.getElementById('past-months-container');
    if (!container) return;
    container.innerHTML = '';

    getPastMonths().forEach(({ year, month }) => {
        const key = monthKey(year, month);
        const isExpanded = expandedMonths[key];

        const toggle = document.createElement('button');
        toggle.className = 'past-month-toggle' + (isExpanded ? ' expanded' : '');
        toggle.innerHTML = `<span>${MONTH_NAMES[month]} ${year}</span><span class="toggle-arrow">&#x25B8;</span>`;

        const content = document.createElement('div');
        content.className = 'past-month-content' + (isExpanded ? ' visible' : '');
        content.id = `month-content-${key}`;

        if (isExpanded && monthlyData[key]) {
            renderPastMonthContent(content, year, month);
        } else if (isExpanded) {
            content.innerHTML = '<div class="loading">Loading...</div>';
        }

        toggle.addEventListener('click', () => toggleMonthExpand(year, month, toggle, content));

        container.appendChild(toggle);
        container.appendChild(content);
    });
}

async function toggleMonthExpand(year, month, toggleEl, contentEl) {
    const key = monthKey(year, month);
    expandedMonths[key] = !expandedMonths[key];

    toggleEl.classList.toggle('expanded');
    contentEl.classList.toggle('visible');

    if (expandedMonths[key]) {
        // Lazy load data if not already loaded
        if (!monthlyData[key] || Object.keys(monthlyData[key]).length === 0) {
            contentEl.innerHTML = '<div class="loading">Loading...</div>';
            await loadMonthData(year, month);
        }
        renderPastMonthContent(contentEl, year, month);
    }
}

function renderPastMonthContent(container, year, month) {
    const contentDiv = document.createElement('div');
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'month-summary';

    if (viewMode === 'grid') {
        renderMonthGrid(contentDiv, year, month);
    } else {
        renderMonthTable(contentDiv, year, month);
    }
    renderMonthSummary(summaryDiv, year, month);

    container.innerHTML = '';
    container.appendChild(contentDiv);
    container.appendChild(summaryDiv);
}

// ─── Historical Averages ─────────────────────────────────────────────

function renderHistoricalAverages() {
    const container = document.getElementById('averages-content');
    if (!container || !historicalAverages) return;

    let html = '<div class="averages-grid">';
    historicalAverages.forEach(m => {
        html += `<div class="avg-card">
            <div class="avg-month">${MONTH_NAMES[m.month]}</div>
            <div class="avg-row"><span class="avg-label">Avg High</span><span class="avg-value hi">${formatTempValue(m.avgHigh)}</span></div>
            <div class="avg-row"><span class="avg-label">Avg Low</span><span class="avg-value lo">${formatTempValue(m.avgLow)}</span></div>
            <div class="avg-row"><span class="avg-label">Precip</span><span class="avg-value precip">${formatPrecipValue(m.avgPrecip)}</span></div>
            <div class="avg-row"><span class="avg-label">Rainy Days</span><span class="avg-value">${m.avgRainyDays}</span></div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ─── Re-render on unit/view change ───────────────────────────────────

function rerenderAll() {
    renderCurrentMonth();
    // Re-render any expanded past months
    getPastMonths().forEach(({ year, month }) => {
        const key = monthKey(year, month);
        if (expandedMonths[key]) {
            const el = document.getElementById(`month-content-${key}`);
            if (el) renderPastMonthContent(el, year, month);
        }
    });
    renderHistoricalAverages();
}

// ─── CSV Export ──────────────────────────────────────────────────────

function exportCSV() {
    const unit = getTempUnit();
    const tLabel = unit === 'C' ? '°C' : '°F';
    const pLabel = unit === 'C' ? 'mm' : 'in';

    const headers = ['Date', 'Day', `High (${tLabel})`, `Low (${tLabel})`, 'Cloud Cover (%)', `Precipitation (${pLabel})`];
    const rows = [headers.join(',')];

    // Collect all loaded months sorted chronologically
    const keys = Object.keys(monthlyData).sort();
    keys.forEach(key => {
        const data = monthlyData[key];
        const sortedDates = Object.keys(data).sort();
        sortedDates.forEach(dateStr => {
            const d = data[dateStr];
            const dt = parseDate(dateStr);
            const day = DAY_NAMES_FULL[dt.getDay()];
            const hi = formatTempRaw(d.high) ?? '';
            const lo = formatTempRaw(d.low) ?? '';
            const cloud = d.cloud != null ? Math.round(d.cloud) : '';
            const precip = d.precip != null ? formatPrecipRaw(d.precip) : '';
            rows.push([dateStr, day, hi, lo, cloud, precip].join(','));
        });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const locName = currentLocation.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `hilary-sprout-${locName}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV exported');
}

// ─── PWA Install ─────────────────────────────────────────────────────

let deferredInstallPrompt = null;

function initInstallButton() {
    const btn = document.getElementById('install-btn');
    if (!btn) return;

    // Already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
        btn.classList.add('hidden');
        return;
    }

    // Chrome/Android install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        btn.classList.remove('hidden');
    });

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => {
            document.getElementById('ios-install-modal').classList.remove('hidden');
        });
    } else {
        btn.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const result = await deferredInstallPrompt.userChoice;
                if (result.outcome === 'accepted') btn.classList.add('hidden');
                deferredInstallPrompt = null;
            }
        });
    }
}

// ─── Event Listeners & Init ──────────────────────────────────────────

function initEventListeners() {
    // Menu
    document.getElementById('menu-btn').addEventListener('click', openMenu);
    document.getElementById('close-menu').addEventListener('click', closeMenu);
    document.getElementById('menu-overlay').addEventListener('click', closeMenu);
    document.getElementById('menu-change-location').addEventListener('click', () => {
        closeMenu();
        document.getElementById('location-modal').classList.remove('hidden');
        document.getElementById('location-input').focus();
    });

    // Location search
    const searchBtn = document.getElementById('location-search-btn');
    const searchInput = document.getElementById('location-input');
    const errorEl = document.getElementById('search-error');
    const disambEl = document.getElementById('disambiguation-results');

    async function doSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        errorEl.classList.add('hidden');
        disambEl.classList.add('hidden');
        searchBtn.disabled = true;
        searchBtn.textContent = '...';

        try {
            const results = await geocodeLocation(query);
            if (results.length === 1) {
                selectLocation(results[0]);
                document.getElementById('location-modal').classList.add('hidden');
            } else {
                showDisambiguation(results);
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Search failed';
            errorEl.classList.remove('hidden');
        }
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    // GPS
    document.getElementById('gps-btn').addEventListener('click', async () => {
        try {
            const loc = await getCurrentLocation();
            selectLocation(loc);
            document.getElementById('location-modal').classList.remove('hidden');
        } catch (err) {
            showToast('Could not get location');
        }
    });

    // Close modals
    document.getElementById('close-location-modal').addEventListener('click', () => {
        document.getElementById('location-modal').classList.add('hidden');
    });
    document.getElementById('location-modal').addEventListener('click', (e) => {
        if (e.target.id === 'location-modal') {
            document.getElementById('location-modal').classList.add('hidden');
        }
    });

    const iosModal = document.getElementById('ios-install-modal');
    if (iosModal) {
        document.getElementById('close-ios-modal').addEventListener('click', () => iosModal.classList.add('hidden'));
        iosModal.addEventListener('click', (e) => { if (e.target === iosModal) iosModal.classList.add('hidden'); });
    }

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('spinning');
        monthlyData = {};
        historicalAverages = null;
        expandedMonths = {};
        loadWeather().finally(() => btn.classList.remove('spinning'));
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Temp toggle
    document.getElementById('temp-toggle').addEventListener('click', toggleTempUnit);

    // View mode toggle
    document.getElementById('view-grid-btn').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('view-table-btn').addEventListener('click', () => setViewMode('table'));

    // Export
    document.getElementById('export-btn').addEventListener('click', exportCSV);

    // Favorite button
    document.getElementById('favorite-btn').addEventListener('click', () => {
        if (isFavorite(currentLocation)) {
            removeFavorite(currentLocation);
        } else {
            addFavorite(currentLocation);
        }
    });

    // Month navigation (prev/next) - navigate through current display
    // These scroll to past months or show a toast if at boundary
    document.getElementById('month-prev').addEventListener('click', () => {
        const pastContainer = document.getElementById('past-months-container');
        if (pastContainer && pastContainer.children.length > 0) {
            // Find first collapsed month and expand it, or scroll to first expanded
            const firstToggle = pastContainer.querySelector('.past-month-toggle:not(.expanded)');
            if (firstToggle) {
                firstToggle.click();
                firstToggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                pastContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    document.getElementById('month-next').addEventListener('click', () => {
        showToast('Forecast data only available for current week');
    });
}

// ─── Service Worker ──────────────────────────────────────────────────

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.error('SW registration failed:', err);
        });
    }
}

// ─── App Init ────────────────────────────────────────────────────────

function init() {
    detectLocaleDefaults();
    updateThemeToggleUI();
    updateTempToggleUI();
    updateViewToggleUI();
    updateLocationDisplay();
    initEventListeners();
    initInstallButton();
    registerServiceWorker();
    loadWeather();
}

document.addEventListener('DOMContentLoaded', init);
