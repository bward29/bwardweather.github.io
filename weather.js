let searchTimeout = null;
let lastKnownCoordinates = { lat: null, lon: null };
let pinnedCities = [];
const MAX_PINNED_CITIES = 3;
let map = null;

function getLastKnownCoordinates() {
    return lastKnownCoordinates;
}

function setLastKnownCoordinates(lat, lon) {
    lastKnownCoordinates = { lat, lon };
}

async function handleSearchInput(event) {
    const searchText = event.target.value.trim();
    const resultsDiv = document.getElementById('searchResults');

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (searchText.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        const cities = await CITIES.searchCities(searchText);
        displaySearchResults(cities);
    }, 300);
}

function displaySearchResults(cities) {
    const resultsDiv = document.getElementById('searchResults');

    if (cities.length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    resultsDiv.innerHTML = '';
    cities.forEach(city => {
        let locationDisplay = city.name;
        if (city.geoData && city.geoData.country === 'US' && city.geoData.state) {
            locationDisplay = `${city.name}, ${city.geoData.state}, ${city.geoData.country}`;
        } else {
            locationDisplay = `${city.name}, ${city.geoData.country}`;
        }

        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.setAttribute('role', 'option');
        div.setAttribute('tabindex', '0');
        div.innerHTML = `
            <div class="city-info">
                <span class="city-name">${locationDisplay}</span>
            </div>
            <span class="temperature">${Math.round(city.main.temp)}°F</span>
        `;

        div.onclick = () => selectCity(city);
        div.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                selectCity(city);
            }
        };
        resultsDiv.appendChild(div);
    });
    resultsDiv.style.display = 'block';
}

function addPinnedCity(city) {
    if (pinnedCities.length >= MAX_PINNED_CITIES) {
        alert(`You can only pin up to ${MAX_PINNED_CITIES} cities. Unpin a city to add a new one.`);
        return;
    }

    if (pinnedCities.some(pinned => pinned.id === city.id)) {
        return;
    }

    pinnedCities.push(city);
    displayPinnedCities();
}

function removePinnedCity(index) {
    pinnedCities.splice(index, 1);
    displayPinnedCities();
}

function displayPinnedCities() {
    const pinnedContainer = document.getElementById('pinnedCities');

    pinnedContainer.innerHTML = pinnedCities.map((city, index) => {
        let locationDisplay = city.name;
        if (city.geoData && city.geoData.country === 'US' && city.geoData.state) {
            locationDisplay = `${city.name}, ${city.geoData.state}, US`;
        }

        return `
            <div class="pinned-city">
                <span onclick="getWeatherByCoords(${city.coord.lat}, ${city.coord.lon})" 
                      style="cursor: pointer">
                    ${locationDisplay}
                </span>
                <button onclick="removePinnedCity(${index})" class="unpin-button">
                    Unpin
                </button>
            </div>
        `;
    }).join('');
}

function selectCity(city) {
    const input = document.getElementById('cityInput');
    let displayName = city.name;
    if (city.geoData && city.geoData.country === 'US' && city.geoData.state) {
        displayName = `${city.name}, ${city.geoData.state}, ${city.geoData.country}`;
    } else {
        displayName = `${city.name}, ${city.geoData.country}`;
    }

    input.value = displayName;
    document.getElementById('searchResults').style.display = 'none';
    getWeatherByCoords(city.coord.lat, city.coord.lon);
    addPinnedCity(city);
}

async function getWeatherByCoords(lat, lon) {
    document.getElementById('loading').style.display = 'block';

    try {
        const [currentWeatherResponse, forecastResponse, geoResponse] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`),
            fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}`),
            fetch(`${CONFIG.GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.API_KEY}`)
        ]);

        if (!currentWeatherResponse.ok || !forecastResponse.ok || !geoResponse.ok) {
            throw new Error('API request failed');
        }

        const [currentWeatherData, forecastData, geoData] = await Promise.all([
            currentWeatherResponse.json(),
            forecastResponse.json(),
            geoResponse.json()
        ]);

        currentWeatherData.geoData = geoData[0];
        displayCurrentWeather(currentWeatherData);
        displayForecast(forecastData);
        updateMap(lat, lon);
        setLastKnownCoordinates(lat, lon);
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching weather data. Please try again.');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

async function getWeather() {
    const cityInput = document.getElementById('cityInput').value;
    if (!cityInput) {
        alert('Please enter a city name');
        return;
    }

    document.getElementById('loading').style.display = 'block';

    try {
        const geoResponse = await fetch(
            `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(cityInput)}&limit=1&appid=${CONFIG.API_KEY}`
        );

        if (!geoResponse.ok) {
            throw new Error(`Geocoding error! status: ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();
        if (geoData.length === 0) {
            throw new Error('City not found');
        }

        const location = geoData[0];
        getWeatherByCoords(location.lat, location.lon);

    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching weather data. Please try again.');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayCurrentWeather(data) {
    let locationDisplay = data.name;
    if (data.geoData && data.geoData.country === 'US' && data.geoData.state) {
        locationDisplay = `${data.name}, ${data.geoData.state}`;
    }

    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const weatherIcon = data.weather[0].icon;

    document.getElementById('currentWeatherContent').innerHTML = `
        <div class="forecast-item">
            <div>
                <h3>${locationDisplay}</h3>
                <p>${data.weather[0].description}</p>
                <p>Temperature: ${temp}°F</p>
                <p>Feels like: ${feelsLike}°F</p>
                <p>Humidity: ${data.main.humidity}%</p>
                <p>Wind: ${data.wind.speed} mph</p>
            </div>
            <img class="weather-icon" src="${CONFIG.ICON_URL}/${weatherIcon}@2x.png" 
                 alt="Weather icon showing ${data.weather[0].description}">
        </div>
    `;
}

function displayForecast(data) {
    const forecastDiv = document.getElementById('forecast');
    forecastDiv.innerHTML = '';

    // Group forecast data by day
    const dailyForecasts = {};

    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dateKey = date.toLocaleDateString();

        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                date: date,
                description: forecast.weather[0].description,
                icon: forecast.weather[0].icon,
                temps: [],
                high: -Infinity,
                low: Infinity
            };
        }

        dailyForecasts[dateKey].temps.push(forecast.main.temp);
        dailyForecasts[dateKey].high = Math.max(dailyForecasts[dateKey].high, forecast.main.temp);
        dailyForecasts[dateKey].low = Math.min(dailyForecasts[dateKey].low, forecast.main.temp);
    });

    // Display each day's forecast
    Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
        const highTemp = Math.round(forecast.high);
        const lowTemp = Math.round(forecast.low);

        forecastDiv.innerHTML += `
            <div class="forecast-item">
                <div>
                    <h3>${forecast.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                    <p>${forecast.description}</p>
                    <div class="temperature-range">
                        <span class="high-temp">H: ${highTemp}°F</span>
                        <span class="low-temp">L: ${lowTemp}°F</span>
                    </div>
                </div>
                <img class="weather-icon" src="${CONFIG.ICON_URL}/${forecast.icon}@2x.png" 
                     alt="Weather icon showing ${forecast.description}">
            </div>
        `;
    });
}

function updateMap(lat, lon) {
    if (!lat || !lon) return;

    const layer = document.getElementById('mapLayer').value;
    const mapContainer = document.getElementById('map');

    // Convert coordinates
    const position = ol.proj.fromLonLat([lon, lat]);

    // If map doesn't exist, create it
    if (!map) {
        map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: position,
                zoom: 8
            })
        });
    }

    // Add weather layer
    const weatherLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${CONFIG.API_KEY}`,
            crossOrigin: 'anonymous'
        })
    });

    // Remove any existing weather layers
    map.getLayers().getArray()
        .filter(layer => layer.get('name') === 'weather')
        .forEach(layer => map.removeLayer(layer));

    // Add the new weather layer
    weatherLayer.set('name', 'weather');
    map.addLayer(weatherLayer);

    // Center map on selected location
    map.getView().animate({
        center: position,
        duration: 1000
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('cityInput');
    const searchButton = document.getElementById('searchButton');
    const mapLayerSelect = document.getElementById('mapLayer');

    cityInput.addEventListener('input', handleSearchInput);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getWeather();
        }
    });

    searchButton.addEventListener('click', getWeather);
    mapLayerSelect.addEventListener('change', () => {
        const coords = getLastKnownCoordinates();
        if (coords.lat && coords.lon) {
            updateMap(coords.lat, coords.lon);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });
});