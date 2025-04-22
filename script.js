const apiKey = "9f49d2b1241fc0b00a6d30ca3f78166e";
const apiBaseUrl = "https://api.openweathermap.org/data/2.5";

const darkModeToggle = document.querySelector(".dark-mode-toggle");
const toggleLabel = document.querySelector(".toggle-switch-label");
const searchInput = document.querySelector(".search-bar input");
const locationButton = document.querySelector(".location");
const timeElement = document.querySelector(".current-time");
const dateElement = document.querySelector(".current-date");

const cityInfo = document.querySelector(".city-name");
const currentTemp = document.querySelector(".current-temp");
const feelsLike = document.querySelector(".feels-like");
const sunriseBox = document.querySelector(".sunrise");
const sunsetBox = document.querySelector(".sunset");
const weatherIconImg = document.querySelector("#weather-icon");
const weatherDescription = document.querySelector(".weather-description");

const humidityEl = document.querySelector("#humidity");
const windEl = document.querySelector("#wind");
const pressureEl = document.querySelector("#pressure");
const uvEl = document.querySelector("#uv");

const dailyContainer = document.querySelector("#daily-forecast");
const hourlyContainer = document.querySelector("#hourly-forecast");

darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("light-mode", darkModeToggle.checked);
  toggleLabel.textContent = darkModeToggle.checked ? "Light Mode" : "Dark Mode";
});

function updateDateTime() {
  const now = new Date();
  timeElement.textContent = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  dateElement.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
setInterval(updateDateTime, 1000);
updateDateTime();

searchInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    const city = searchInput.value.trim();
    if (city) {
      updateWeather(city);
      updateForecast(city);
    }
  }
});

locationButton.addEventListener("click", async function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const city = await getCityFromLocation(lat, lon);
        if (city) {
          updateWeather(city);
          updateForecast(city);
        }
      } catch (error) {
        alert("Error getting weather for your location.");
      }
    });
  } else {
    alert("Geolocation not supported by your browser.");
  }
});

async function getCityFromLocation(lat, lon) {
  try {
    const response = await fetch(
      `${apiBaseUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    const data = await response.json();
    return data.name;
  } catch (error) {
    return null;
  }
}

async function WeatherData(city) {
  try {
    const response = await fetch(
      `${apiBaseUrl}/weather?q=${city}&units=metric&appid=${apiKey}`
    );
    if (!response.ok) throw new Error("City not found");
    return await response.json();
  } catch (error) {
    alert(error.message);
    return null;
  }
}

function getReadableTime(unixTime) {
  const date = new Date(unixTime * 1000);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;
  if (minutes < 10) minutes = "0" + minutes;

  return `${hours}:${minutes}${ampm}`;
}

async function updateWeather(city) {
  const weatherData = await WeatherData(city);
  if (!weatherData) return;

  cityInfo.textContent = weatherData.name;
  currentTemp.textContent = `${Math.round(weatherData.main.temp)}°C`;
  feelsLike.textContent = `Feels like: ${Math.round(
    weatherData.main.feels_like
  )}°C`;

  const sunriseTime = getReadableTime(weatherData.sys.sunrise);
  const sunsetTime = getReadableTime(weatherData.sys.sunset);

  sunriseBox.innerHTML = `<img src="public/images/sunrise.png" alt="sunrise"> Sunrise ${sunriseTime}`;
  sunsetBox.innerHTML = `<img src="public/images/sunset.png" alt="sunset"> Sunset ${sunsetTime}`;

  const iconCode = weatherData.weather?.[0]?.icon;
  const description = weatherData.weather?.[0]?.description;

  if (iconCode && description) {
    weatherIconImg.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIconImg.alt = description;
    weatherDescription.textContent =
      description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    weatherIconImg.src = "";
    weatherDescription.textContent = "No weather info";
  }

  humidityEl.textContent = `${weatherData.main.humidity}%`;
  windEl.textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`;
  pressureEl.textContent = `${weatherData.main.pressure} hPa`;

  try {
    const uvIndex = await getUVIndex(
      weatherData.coord.lat,
      weatherData.coord.lon
    );
    uvEl.textContent = uvIndex;
  } catch {
    uvEl.textContent = "N/A";
  }
}

async function getUVIndex(lat, lon) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/uvi?appid=${apiKey}&lat=${lat}&lon=${lon}`
  );
  if (!response.ok) throw new Error("UV Index not available");
  const data = await response.json();
  return data.value;
}

async function updateForecast(city) {
  const response = await fetch(
    `${apiBaseUrl}/forecast?q=${city}&appid=${apiKey}&units=metric`
  );
  const data = await response.json();

  dailyContainer.innerHTML = "";
  hourlyContainer.innerHTML = "";

  const dailyMap = new Map();
  data.list.forEach((entry) => {
    const date = new Date(entry.dt_txt);
    const day = date.toDateString();
    if (date.getHours() === 12 && !dailyMap.has(day)) {
      dailyMap.set(day, entry);
    }
  });

  let count = 0;
  for (let [day, forecast] of dailyMap.entries()) {
    if (count >= 5) break;
    const dateLabel = new Date(forecast.dt_txt).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });

    dailyContainer.innerHTML += `
      <div class="forecast-card-daily">
        <img src="https://openweathermap.org/img/wn/${
          forecast.weather[0].icon
        }@2x.png" alt="">
        <div>${Math.round(forecast.main.temp)}°C</div>
        <div>${dateLabel}</div>
      </div>
    `;
    count++;
  }

  data.list.slice(0, 5).forEach((forecast) => {
    const time = new Date(forecast.dt_txt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    hourlyContainer.innerHTML += `
      <div class="forecast-card-hourly">
        <div><strong>${time}</strong></div>
        <img src="https://openweathermap.org/img/wn/${
          forecast.weather[0].icon
        }@2x.png" alt="">
        <div>${Math.round(forecast.main.temp)}°C</div>
           <img src="public/images/arrow.png" alt="Wind direction"  class="wind-arrow" style="transform: rotate(${
             forecast.wind.deg
           }deg); width: 40px; height: 40px;">
        <div>${Math.round(forecast.wind.speed * 3.6)} km/h</div>
      </div>
    `;
  });
}

updateWeather("New York");
updateForecast("New York");

window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const city = await getCityFromLocation(lat, lon);
      if (city) {
        updateWeather(city);
        updateForecast(city);
      } else {
        updateWeather("New York");
        updateForecast("New York");
      }
    });
  } else {
    updateWeather("New York");
    updateForecast("New York");
  }
});
