const API_BASE = "https://trip-cost-api-9bxx.onrender.com";

const fromInput = document.getElementById("fromInput");
const toInput = document.getElementById("toInput");

const fromResults = document.getElementById("fromResults");
const toResults = document.getElementById("toResults");

const fuelPriceInput = document.getElementById("fuelPrice");
const efficiencyInput = document.getElementById("efficiency");
const swapButton = document.getElementById("swapButton");

const selectedInfo = document.getElementById("selectedInfo");

let selectedFrom = null;
let selectedTo = null;

const map = L.map("map").setView([-37.8136, 144.9631], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let fromMarker = null;
let toMarker = null;
let routeLine = null;

async function fetchSuburbs(query) {
  const res = await fetch(
    `${API_BASE}/search_suburbs?q=${encodeURIComponent(query)}`
  );
  return await res.json();
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function getRoadRoute(lat1, lon1, lat2, lon2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.routes && data.routes.length > 0) {
    return {
      distanceKm: data.routes[0].distance / 1000,
      geometry: data.routes[0].geometry
    };
  }

  return null;
}

function updateMap(lat1, lon1, lat2, lon2, geometry) {
  if (fromMarker) map.removeLayer(fromMarker);
  if (toMarker) map.removeLayer(toMarker);
  if (routeLine) map.removeLayer(routeLine);

  fromMarker = L.marker([lat1, lon1]).addTo(map).bindPopup("From");
  toMarker = L.marker([lat2, lon2]).addTo(map).bindPopup("To");

  if (geometry && geometry.coordinates) {
    const latLngs = geometry.coordinates.map(coord => [coord[1], coord[0]]);
    routeLine = L.polyline(latLngs, { weight: 5 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  } else {
    const bounds = L.latLngBounds([
      [lat1, lon1],
      [lat2, lon2]
    ]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function handleInput(inputEl, resultsEl, setSelected) {
  inputEl.addEventListener("input", async () => {
    const query = inputEl.value.trim();

    if (query.length < 2) {
      resultsEl.innerHTML = "";
      return;
    }

    const suburbs = await fetchSuburbs(query);

    resultsEl.innerHTML = "";

    suburbs.forEach((suburb) => {
      const item = document.createElement("div");
      item.textContent = `${suburb.suburb_name} (${suburb.postcode || ""})`;

      item.addEventListener("click", async () => {
        inputEl.value = suburb.suburb_name;
        setSelected(suburb);
        resultsEl.innerHTML = "";
        await updateDisplay();
      });

      resultsEl.appendChild(item);
    });
  });
}

async function updateDisplay() {
  if (selectedFrom && selectedTo) {
    const lat1 = Number(selectedFrom.lat);
    const lon1 = Number(selectedFrom.lon);
    const lat2 = Number(selectedTo.lat);
    const lon2 = Number(selectedTo.lon);

    let distanceKm = null;
    let routeGeometry = null;

    const roadRoute = await getRoadRoute(lat1, lon1, lat2, lon2);

    if (roadRoute) {
      distanceKm = roadRoute.distanceKm;
      routeGeometry = roadRoute.geometry;
    } else {
      distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
    }

    const fuelPrice = Number(fuelPriceInput.value);
    const efficiency = Number(efficiencyInput.value);

    let costText = "";

    if (fuelPrice > 0 && efficiency > 0) {
      const fuelUsed = distanceKm / efficiency;
      const cost = fuelUsed * fuelPrice;

      costText = `
        <div><strong>Estimated Fuel Used:</strong> ${fuelUsed.toFixed(2)} L</div>
        <div><strong>Estimated Cost:</strong> $${cost.toFixed(2)}</div>
      `;
    }

    selectedInfo.innerHTML = `
      <div><strong>From:</strong> ${selectedFrom.suburb_name}</div>
      <div><strong>To:</strong> ${selectedTo.suburb_name}</div>
      <div><strong>Road distance:</strong> ${distanceKm.toFixed(2)} km</div>
      ${costText || `<div class="info-placeholder">Enter fuel price and efficiency to estimate cost.</div>`}
    `;

    updateMap(lat1, lon1, lat2, lon2, routeGeometry);
  } else {
    selectedInfo.innerHTML = `<div class="info-placeholder">Select suburbs to see trip details.</div>`;
  }
}

handleInput(fromInput, fromResults, (val) => {
  selectedFrom = val;
});

handleInput(toInput, toResults, (val) => {
  selectedTo = val;
});

fuelPriceInput.addEventListener("input", updateDisplay);
efficiencyInput.addEventListener("input", updateDisplay);

swapButton.addEventListener("click", async () => {
  const oldFrom = selectedFrom;
  const oldTo = selectedTo;

  selectedFrom = oldTo;
  selectedTo = oldFrom;

  fromInput.value = selectedFrom ? selectedFrom.suburb_name : "";
  toInput.value = selectedTo ? selectedTo.suburb_name : "";

  fromResults.innerHTML = "";
  toResults.innerHTML = "";

  await updateDisplay();
});