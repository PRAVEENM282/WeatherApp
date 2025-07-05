const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const currentWeather = document.getElementById('current-weather');
const forecast = document.getElementById('forecast');
const geoBtn = document.getElementById('geo-btn');
const unitToggle = document.getElementById('unit-toggle');
const unitLabel = document.getElementById('unit-label');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');

let unit = 'celsius'; // or 'fahrenheit'

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  fetchWeatherByCity(city);
});

gioBtnHandler();
unitToggleHandler();

function gioBtnHandler() {
  if (!geoBtn) return;
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('Geolocation not supported.');
      return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      fetchWeatherByCoords(latitude, longitude);
    }, () => {
      showError('Unable to get your location.');
    });
  });
}

function unitToggleHandler() {
  if (!unitToggle) return;
  unitToggle.addEventListener('click', () => {
    unit = unit === 'celsius' ? 'fahrenheit' : 'celsius';
    unitLabel.textContent = unit === 'celsius' ? '°C' : '°F';
    unitToggle.classList.toggle('active', unit === 'fahrenheit');
    // Re-fetch weather for last searched city or location
    const lastCity = cityInput.value.trim();
    if (lastCity) {
      fetchWeatherByCity(lastCity);
    } else if (window.lastCoords) {
      fetchWeatherByCoords(window.lastCoords.lat, window.lastCoords.lon);
    }
  });
}

async function fetchWeatherByCity(city) {
  showLoading();
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results || !geoData.results.length) {
      showError('City not found.');
      return;
    }
    const { latitude, longitude, name, country } = geoData.results[0];
    window.lastCoords = { lat: latitude, lon: longitude };
    fetchWeatherByCoords(latitude, longitude, name, country);
  } catch (err) {
    showError('Error loading weather.');
  }
}

async function fetchWeatherByCoords(lat, lon, name, country) {
  showLoading();
  try {
    const tempUnit = unit === 'celsius' ? 'celsius' : 'fahrenheit';
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=${tempUnit}&windspeed_unit=kmh&timezone=auto`);
    const weatherData = await weatherRes.json();
    renderWeather(weatherData, name, country);
    setDynamicBackground(weatherData.current_weather.weathercode);
  } catch (err) {
    showError('Error loading weather.');
  }
}

function renderWeather(data, name, country) {
  hideLoading();
  if (!data.current_weather) {
    showError('Weather data unavailable.');
    return;
  }
  const cw = data.current_weather;
  const loc = name && country ? `${name}, ${country}` : '';
  currentWeather.innerHTML = `
    <div class="weather-card">
      <div class="icon">${weatherIcon(cw.weathercode)}</div>
      <h2>${loc}</h2>
      <div class="temp">${cw.temperature}&deg;${unit === 'celsius' ? 'C' : 'F'}</div>
      <div class="desc">${weatherDesc(cw.weathercode)}</div>
      <div>Wind: ${cw.windspeed} km/h</div>
    </div>
  `;
  // Forecast
  forecast.innerHTML = data.daily.time.map((date, i) => `
    <div class="weather-card">
      <div class="icon">${weatherIcon(data.daily.weathercode[i])}</div>
      <div><b>${new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}</b></div>
      <div class="desc">${weatherDesc(data.daily.weathercode[i])}</div>
      <div>${data.daily.temperature_2m_max[i]}&deg; / ${data.daily.temperature_2m_min[i]}&deg;${unit === 'celsius' ? 'C' : 'F'}</div>
    </div>
  `).join('');
}

function showLoading() {
  loading.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  currentWeather.innerHTML = '';
  forecast.innerHTML = '';
}
function hideLoading() {
  loading.classList.add('hidden');
}
function showError(msg) {
  hideLoading();
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
  currentWeather.innerHTML = '';
  forecast.innerHTML = '';
}

function weatherDesc(code) {
  const map = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    56: 'Freezing Drizzle', 57: 'Freezing Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain',
    66: 'Freezing Rain', 67: 'Freezing Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow',
    77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers',
    85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };
  return map[code] || 'Unknown';
}

function weatherIcon(code) {
  // FontAwesome icons for weather codes
  if ([0, 1].includes(code)) return '<i class="fa-solid fa-sun"></i>';
  if ([2].includes(code)) return '<i class="fa-solid fa-cloud-sun"></i>';
  if ([3].includes(code)) return '<i class="fa-solid fa-cloud"></i>';
  if ([45, 48].includes(code)) return '<i class="fa-solid fa-smog"></i>';
  if ([51, 53, 55, 56, 57].includes(code)) return '<i class="fa-solid fa-cloud-rain"></i>';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return '<i class="fa-solid fa-cloud-showers-heavy"></i>';
  if ([66, 67].includes(code)) return '<i class="fa-solid fa-cloud-meatball"></i>';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '<i class="fa-solid fa-snowflake"></i>';
  if ([95, 96, 99].includes(code)) return '<i class="fa-solid fa-bolt"></i>';
  return '<i class="fa-solid fa-question"></i>';
}

function setDynamicBackground(code) {
  document.body.className = '';
  if ([0, 1].includes(code)) document.body.classList.add('sunny');
  else if ([2, 3].includes(code)) document.body.classList.add('cloudy');
  else if ([45, 48].includes(code)) document.body.classList.add('foggy');
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) document.body.classList.add('rainy');
  else if ([66, 67].includes(code)) document.body.classList.add('rainy');
  else if ([71, 73, 75, 77, 85, 86].includes(code)) document.body.classList.add('snowy');
  else if ([95, 96, 99].includes(code)) document.body.classList.add('thunderstorm');
  else document.body.classList.add('clear');
}

// Optionally, fetch weather for user's location on load
document.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      fetchWeatherByCoords(latitude, longitude);
    });
  }
}); 