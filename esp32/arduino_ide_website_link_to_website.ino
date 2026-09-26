#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>

// 1. Mobile phone hotspot details
const char *WIFI_SSID = "vivo Y56 5G";
const char *WIFI_PASSWORD = "12341234";

// 2. Render Cloud API Endpoints
const char *RENDER_URL = "https://ashok-leyland-bus-tracking.onrender.com/api/telemetry";
const char *ASSIGNMENTS_URL = "https://ashok-leyland-bus-tracking.onrender.com/api/bus-assignments";

WebServer server(80);
Preferences prefs;

// Vehicle-Centric Model: Physical Bus is the fixed entity; Route is dynamically assigned
struct BusTelemetry {
  const char *busName;       // Physical Bus Short Name (canonical fixed key)
  String assignedRoute;      // Assigned Route & Distance (updated dynamically from swap engine)
  uint8_t soc;
  const char *status;
  String condition;          // "Good" or "Not Good"
};

// 3. Complete Fleet Database of 54 Physical Buses
BusTelemetry fleet[] = {
{"BC-7B PSS-NLGH-8thM", "Route 6080 (9.9 km)", 78, "Active", "Good"},
  {"PSS-NLGDH-8THM", "Route 7834 (11.3 km)", 100, "Active", "Good"},
  {"270-D PSS-ABG", "Route 4759 (9.9 km)", 100, "Active", "Good"},
  {"273-B PSS-ABG", "Route 4798 (10.2 km)", 100, "Active", "Good"},
  {"401-AK ABG-PSS", "Route 3907 (9.9 km)", 100, "Active", "Good"},
  {"MBS-12 PSS-ANP", "Route 3831 (7.1 km)", 100, "Active", "Good"},
  {"248-AB", "Route 3864 (10.1 km)", 100, "Active", "Good"},
  {"MF-32 PSS-CKB", "Route 7143 (12.3 km)", 100, "Active", "Good"},
  {"401-M PSS-KTS-D31G", "Route 1626 (8.4 km)", 100, "Active", "Good"},
  {"PSS-TGPL-GGH", "Route 7403 (6.9 km)", 100, "Active", "Good"},
  {"250-S PSS-GLB", "Route 2780 (8.9 km)", 100, "Active", "Good"},
  {"252-A PSS-HAL ARDC", "Route 9636 (30.7 km)", 100, "Active", "Good"},
  {"252-F PSS-HAL ARDC", "Route 9581 (29.2 km)", 100, "Active", "Good"},
  {"BC-7B PSS-ANDRH-HRHC", "Route 7888 (7.6 km)", 100, "Active", "Good"},
  {"253-J PSS-HGV", "Route 3920 (18.6 km)", 100, "Active", "Good"},
  {"252-A PSS-ISROM", "Route 6551 (26.5 km)", 100, "Active", "Good"},
  {"JHMS-PSS", "Route 7296 (5.2 km)", 100, "Active", "Good"},
  {"MF-26 PSS-JHMS", "Route 3935 (4.6 km)", 100, "Active", "Good"},
  {"251E PSS-KMT", "Route 6979 (17.5 km)", 100, "Active", "Good"},
  {"252 PSS-KMT", "Route 2764 (18.6 km)", 100, "Active", "Good"},
  {"507-B", "Route 3430 (36.9 km)", 100, "Active", "Good"},
  {"254-E PSS-KMP", "Route 3158 (13.3 km)", 100, "Active", "Good"},
  {"251-C PSS-RPS-LGR", "Route 2787 (5.7 km)", 100, "Active", "Good"},
  {"PSS-NTTF-LGRNBS", "Route 3916 (5.7 km)", 100, "Active", "Good"},
  {"MBS-17 MHB-HBL-JHV-PSS", "Route 8842 (33 km)", 100, "Active", "Good"},
  {"256-F", "Route 2644 (20.3 km)", 100, "Active", "Good"},
  {"401-AK PSS-ABG", "Route 3878 (9.9 km)", 100, "Active", "Good"},
  {"252-L", "Route 2826 (14.6 km)", 100, "Active", "Good"},
  {"BC-7B BDYH-PSS", "Route 8276 (5.3 km)", 100, "Active", "Good"},
  {"D22-PSS", "Route 1548 (1.5 km)", 100, "Active", "Good"},
  {"401-AM", "Route 1427 (41 km)", 100, "Active", "Good"},
  {"507", "Route 8543 (27.7 km)", 100, "Active", "Good"},
  {"252", "Route 1553 (16.3 km)", 100, "Active", "Good"},
  {"252-F", "Route 1621 (14.2 km)", 100, "Active", "Good"},
  {"273", "Route 2559 (20.3 km)", 100, "Active", "Good"},
  {"G-252 KBS D9 D22-PSS", "Route 8178 (17.4 km)", 100, "Active", "Good"},
  {"252 LGR-PSS", "Route 1610 (5.7 km)", 100, "Active", "Good"},
  {"CHAKRA-7", "Route 9534 (7.4 km)", 100, "Active", "Good"},
  {"401-AM PTH-PSS", "Route 1428 (19.8 km)", 100, "Active", "Good"},
  {"252-A", "Route 1612 (17.8 km)", 100, "Active", "Good"},
  {"PSS-RGPS-SMH", "Route 9108 (9.2 km)", 100, "Active", "Good"},
  {"401-A", "Route 1367 (19.1 km)", 100, "Active", "Good"},
  {"D9-PSS", "Route 1549 (1.6 km)", 100, "Active", "Good"},
  {"500-D MRHB-HBL-PSS", "Route 7632 (32.7 km)", 100, "Active", "Good"},
  {"CHAKRA-7A", "Route 9535 (9.5 km)", 100, "Active", "Good"},
  {"250-SB PSS-SVG", "Route 2786 (13.7 km)", 100, "Active", "Good"},
  {"273 SDN-PSS", "Route 8592 (9.4 km)", 100, "Active", "Good"},
  {"250-F PSS-SSHL", "Route 2770 (12.8 km)", 100, "Active", "Good"},
  {"250-E PSS-TMH", "Route 2767 (11.7 km)", 100, "Active", "Good"},
  {"265-A PSS-TEPL", "Route 3951 (3.2 km)", 100, "Active", "Good"},
  {"253-D PSS-TRN", "Route 2861 (21.5 km)", 100, "Active", "Good"},
  {"273 VSD-RJB-PSS", "Route 9132 (21.6 km)", 100, "Active", "Good"},
  {"265-D PSS-VGN", "Route 3629 (2.5 km)", 100, "Active", "Good"},
  {"401-A PSS-SGP-YHK", "Route 8781 (20.5 km)", 100, "Active", "Good"},
};

const size_t FLEET_SIZE = sizeof(fleet) / sizeof(fleet[0]);

const char DRIVER_PAGE[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EV Bus Driver Terminal</title>
  <style>
    :root { color-scheme: light; --ink: #122033; --muted: #617083; --blue: #1769aa; --line: #dbe4ec; --bg: #f3f7fa; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, sans-serif; }
    main { width: min(100%, 540px); background: white; border: 1px solid var(--line); border-radius: 14px; padding: 28px; box-shadow: 0 12px 35px #19324a14; }
    h1 { margin: 0 0 8px; font-size: clamp(1.6rem, 6vw, 2.2rem); }
    p { color: var(--muted); }
    label { display: block; margin: 22px 0 8px; font-weight: 700; }
    select, input, button { width: 100%; font: inherit; }
    select { padding: 12px; border: 1px solid #b9c8d6; border-radius: 8px; background: white; color: var(--ink); }
    input[type=range] { accent-color: var(--blue); }
    .soc-value { display: block; margin-top: 4px; color: var(--blue); font-size: 2rem; font-weight: 800; text-align: center; }
    button { margin-top: 24px; padding: 13px 16px; border: 0; border-radius: 8px; background: var(--blue); color: white; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    #message { min-height: 24px; margin: 16px 0 0; text-align: center; font-weight: 600; }
    a { color: var(--blue); }
  </style>
</head>
<body>
  <main>
    <h1>Driver Terminal</h1>
    <p>Select your physical bus and update telemetry. The assigned route is dynamically optimized from the cloud swap engine.</p>
    <form id="telemetry-form">
      <label for="bus-search">Search Physical Bus</label>
      <input type="text" id="bus-search" placeholder="Type bus name (e.g. 401-A, MF-26, BC-7B)..." autocomplete="off" style="padding: 11px; border: 1px solid #b9c8d6; border-radius: 8px; margin-bottom: 6px;">

      <label for="bus-select">Select Physical Bus (<span id="bus-count">54</span> buses available)</label>
      <select id="bus-select" name="bus" required>
        <option value="">Loading Fleet Data...</option>
      </select>

      <label for="condition">Bus Condition</label>
      <select id="condition" name="condition">
        <option value="Good">Good (Clean / No issues)</option>
        <option value="Not Good">Not Good (Maintenance Required)</option>
      </select>

      <label for="soc">State of Charge (Battery %)</label>
      <input id="soc" name="soc" type="range" min="0" max="100" value="100">
      <output class="soc-value" id="soc-value" for="soc">100%</output>
      
      <button id="submit" type="submit">Update Telemetry</button>
    </form>
    <p id="message" role="status"></p>
    <p><a href="/dashboard">Open local dashboard backup</a></p>
  </main>
  <script>
    const form = document.getElementById('telemetry-form');
    const slider = document.getElementById('soc');
    const output = document.getElementById('soc-value');
    const message = document.getElementById('message');
    const busSearch = document.getElementById('bus-search');
    const busCount = document.getElementById('bus-count');
    const busSelect = document.getElementById('bus-select');
    const conditionSelect = document.getElementById('condition');
    const submit = document.getElementById('submit');

    let fleetData = [];

    function updateFormForSelectedBus() {
      const idx = busSelect.value;
      if (idx !== "" && fleetData[idx]) {
        const bus = fleetData[idx];
        slider.value = bus.soc;
        output.textContent = bus.soc + '%';
        conditionSelect.value = bus.condition || 'Good';
      }
    }

    function renderDropdown(filterText = '') {
      const q = filterText.trim().toLowerCase();
      const prevVal = busSelect.value;

      const filtered = q
        ? fleetData.filter(bus => 
            (bus.busName && bus.busName.toLowerCase().includes(q)) || 
            (bus.bus_id && bus.bus_id.toLowerCase().includes(q)) || 
            (bus.assignedRoute && bus.assignedRoute.toLowerCase().includes(q)) ||
            (bus.route && bus.route.toLowerCase().includes(q))
          )
        : fleetData;

      if (busCount) {
        busCount.textContent = filtered.length;
      }

      if (filtered.length === 0) {
        busSelect.innerHTML = '<option value="">No matching buses found</option>';
        return;
      }

      busSelect.innerHTML = filtered.map(bus => 
        `<option value="${bus.origIndex}">Bus ${bus.busName || bus.bus_id}: Assigned to ${bus.assignedRoute || bus.route} (${bus.soc}%)</option>`
      ).join('');

      if (prevVal !== "" && busSelect.querySelector(`option[value="${prevVal}"]`)) {
        busSelect.value = prevVal;
      } else if (filtered.length === 1) {
        busSelect.value = String(filtered[0].origIndex);
      }
      updateFormForSelectedBus();
    }

    // Vehicle-Centric: display selection box with physical bus name and dynamically assigned route
    async function loadFleetDropdown() {
      try {
        const response = await fetch('/api/fleet');
        fleetData = await response.json();
        fleetData.forEach((bus, i) => { bus.origIndex = i; });

        // Query the live website for the swap-engine assigned route for each bus
        try {
          const assignRes = await fetch('https://ashok-leyland-bus-tracking.onrender.com/api/bus-assignments');
          const assignData = await assignRes.json();
          if (assignData) {
            fleetData.forEach(bus => {
              const bName = bus.busName || bus.bus_id;
              if (assignData.busAssignments && assignData.busAssignments[bName]) {
                bus.assignedRoute = assignData.busAssignments[bName].assignedRouteDisplay;
              } else if (assignData.assignments && assignData.assignments[bName]) {
                bus.assignedRoute = "Route " + assignData.assignments[bName];
              }
            });
          }
        } catch (e) {
          console.log('Using local assignments');
        }

        renderDropdown(busSearch.value);
      } catch (err) {
        busSelect.innerHTML = `<option value="">Error loading buses</option>`;
      }
    }
    loadFleetDropdown();

    busSearch.addEventListener('input', () => {
      renderDropdown(busSearch.value);
    });

    busSelect.addEventListener('change', updateFormForSelectedBus);
    slider.addEventListener('input', () => output.textContent = slider.value + '%');
    
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      message.style.color = "var(--muted)";
      message.textContent = 'Updating cloud and calculating route swaps...';
      
      try {
        const idx = parseInt(busSelect.value, 10);
        const b = fleetData[idx];
        const bName = b ? (b.busName || b.bus_id) : busSelect.value;

        const response = await fetch('/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ 
            bus: bName,
            busIndex: idx,
            soc: slider.value,
            condition: conditionSelect.value 
          })
        });
        const result = await response.json();
        if (response.ok) {
          message.style.color = "green";
          if (fleetData[idx]) {
            fleetData[idx].soc = slider.value;
            fleetData[idx].condition = conditionSelect.value;
            if (result.assignedRoute) {
              fleetData[idx].assignedRoute = result.assignedRoute;
            }
          }
          message.textContent = `Bus ${result.bus} updated! Assigned: ${result.assignedRoute}` + (result.blocked ? " (⛔ Blocked: Range < Route Distance)" : "");
          // Re-sync all assignments from server so all swapped dropdown items update!
          await loadFleetDropdown();
        } else {
          message.style.color = "red";
          message.textContent = result.error || 'Update failed.';
        }
      } catch (error) {
        message.style.color = "red";
        message.textContent = 'Gateway is unreachable.';
      } finally {
        submit.disabled = false;
      }
    });
  </script>
</body>
</html>
)rawliteral";

const char DASHBOARD_PAGE[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Local Backup Dashboard</title>
  <style>
    :root { --ink: #122033; --muted: #617083; --line: #dbe4ec; --bg: #f3f7fa; --green: #167447; --green-bg: #dff5e8; --yellow: #8a5b00; --yellow-bg: #fff0bf; --red: #a62525; --red-bg: #ffe0e0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px 18px; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, sans-serif; }
    main { width: min(1200px, 100%); margin: auto; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
    .search-bar { padding: 10px; border-radius: 8px; border: 1px solid #b9c8d6; width: 300px; max-width: 100%; font-size: 1rem; margin-top: 10px; }
    .updated { color: var(--muted); font-size: .9rem; margin-top: 10px;}
    .table-wrap { overflow-x: auto; background: white; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 35px #19324a0d; height: 600px; overflow-y: auto;}
    table { width: 100%; border-collapse: collapse; min-width: 780px; }
    th, td { padding: 12px 18px; border-bottom: 1px solid var(--line); text-align: left; }
    th { background: #edf3f7; color: var(--muted); font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; position: sticky; top: 0; z-index: 1;}
    tbody tr:last-child td { border-bottom: 0; }
    .soc { font-weight: 800; }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: .85rem; font-weight: 700; white-space: nowrap; }
    .active { color: var(--green); background: var(--green-bg); }
    .warning { color: var(--yellow); background: var(--yellow-bg); }
    .blocked { color: var(--red); background: var(--red-bg); }
    a { display: inline-block; margin-top: 18px; color: #1769aa; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Live Fleet Dashboard</h1>
        <input type="text" id="dashboard-search" class="search-bar" placeholder="Filter specific bus or route...">
      </div>
      <span class="updated" id="updated">Connecting...</span>
    </header>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Physical Bus</th><th>Assigned Route</th><th>Live SoC</th><th>Battery Status</th><th>Condition</th><th>Assigned Action</th></tr></thead>
        <tbody id="fleet"><tr><td colspan="6">Loading fleet data...</td></tr></tbody>
      </table>
    </div>
    <a href="/">Back to driver terminal</a>
  </main>
  <script>
    const fleet = document.getElementById('fleet');
    const updated = document.getElementById('updated');
    const searchInput = document.getElementById('dashboard-search');
    let latestData = [];

    function stateFor(soc) {
      if (soc > 30) return { status: 'Active / On Route', action: 'Continue assigned route', className: 'active' };
      if (soc > 15) return { status: 'Warning - Low Battery', action: 'Schedule depot charge', className: 'warning' };
      return { status: 'BLOCKED - Send to Depot', action: 'Send to depot charger', className: 'blocked' };
    }

    function renderTable() {
      const filterText = searchInput.value.toLowerCase();
      const filtered = latestData.filter(bus => 
        (bus.busName && bus.busName.toLowerCase().includes(filterText)) || 
        (bus.bus_id && bus.bus_id.toLowerCase().includes(filterText)) || 
        (bus.assignedRoute && bus.assignedRoute.toLowerCase().includes(filterText)) ||
        (bus.route && bus.route.toLowerCase().includes(filterText))
      );

      fleet.innerHTML = filtered.map(bus => {
        const state = stateFor(Number(bus.soc));
        const condBadge = bus.condition === 'Good' ? 'active' : 'blocked';
        
        let action = state.action;
        if (bus.condition === 'Not Good') {
           action = '<strong>URGENT: Route to Maintenance Depot</strong>';
        }

        const busNameDisplay = bus.busName || bus.bus_id;
        const routeDisplay = bus.assignedRoute || bus.route;

        return `<tr>
          <td><strong>${busNameDisplay}</strong></td>
          <td><strong>${routeDisplay}</strong></td>
          <td class="soc">${bus.soc}%</td>
          <td><span class="badge ${state.className}">${state.status}</span></td>
          <td><span class="badge ${condBadge}">${bus.condition}</span></td>
          <td>${action}</td>
        </tr>`;
      }).join('');
    }

    async function refreshFleet() {
      try {
        const response = await fetch('/api/fleet', { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        latestData = await response.json();

        // Sync with Render Cloud assignments and live state so ESP and Website are 100% identical
        try {
          const [assignRes, stateRes] = await Promise.all([
            fetch('https://ashok-leyland-bus-tracking.onrender.com/api/bus-assignments'),
            fetch('https://ashok-leyland-bus-tracking.onrender.com/api/bus-state')
          ]);
          if (assignRes.ok && stateRes.ok) {
            const assignData = await assignRes.json();
            const stateData = await stateRes.json();
            if (assignData) {
              latestData.forEach(bus => {
                const bName = bus.busName || bus.bus_id;
                if (assignData.busAssignments && assignData.busAssignments[bName]) {
                  bus.assignedRoute = assignData.busAssignments[bName].assignedRouteDisplay;
                } else if (assignData.assignments && assignData.assignments[bName]) {
                  bus.assignedRoute = "Route " + assignData.assignments[bName];
                }
                if (stateData && stateData.state && stateData.state[bName]) {
                  const s = stateData.state[bName];
                  if (s.soc !== undefined) bus.soc = s.soc;
                  if (s.condition !== undefined) bus.condition = s.condition;
                }
              });
            }
          }
        } catch (cloudErr) {
          console.log('Using local fleet data fallback');
        }

        renderTable();
        updated.textContent = 'Synced with Cloud ' + new Date().toLocaleTimeString();
      } catch (error) {
        updated.textContent = 'Unable to reach gateway';
      }
    }
    
    searchInput.addEventListener('input', renderTable);
    refreshFleet();
    setInterval(refreshFleet, 5000);
  </script>
</body>
</html>
)rawliteral";

void addCorsHeader() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
}

void recalculateStatus(BusTelemetry &bus) {
  if (bus.soc > 30) {
    bus.status = "Active";
  } else if (bus.soc > 15) {
    bus.status = "Warning";
  } else {
    bus.status = "Blocked";
  }
}

void handleFleetApi() {
  String json = "[";
  for (size_t i = 0; i < FLEET_SIZE; ++i) {
    if (i > 0) json += ",";
    json += "{\"bus_id\":\"";
    json += fleet[i].busName;
    json += "\",\"busName\":\"";
    json += fleet[i].busName;
    json += "\",\"route\":\"";
    json += fleet[i].assignedRoute;
    json += "\",\"assignedRoute\":\"";
    json += fleet[i].assignedRoute;
    json += "\",\"soc\":";
    json += String(fleet[i].soc);
    json += ",\"status\":\"";
    json += fleet[i].status;
    json += "\",\"condition\":\"";
    json += fleet[i].condition;
    json += "\"}";
  }
  json += "]";
  addCorsHeader();
  server.send(200, "application/json", json);
}

void handleUpdate() {
  if ((!server.hasArg("bus") && !server.hasArg("busIndex")) || !server.hasArg("soc") || !server.hasArg("condition")) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"Missing required parameters\"}");
    return;
  }

  int busIndex = -1;
  if (server.hasArg("busIndex")) {
    busIndex = server.arg("busIndex").toInt();
  } else if (server.hasArg("bus")) {
    String bArg = server.arg("bus");
    // Check if it's an integer index or a bus name
    if (bArg.length() <= 3 && bArg.toInt() >= 0 && bArg.toInt() < FLEET_SIZE) {
      busIndex = bArg.toInt();
    } else {
      for (size_t i = 0; i < FLEET_SIZE; ++i) {
        if (bArg.equalsIgnoreCase(fleet[i].busName)) {
          busIndex = i;
          break;
        }
      }
    }
  }

  const int soc = server.arg("soc").toInt();
  String condition = server.arg("condition");

  if (busIndex < 0 || busIndex >= static_cast<int>(FLEET_SIZE) || soc < 0 || soc > 100) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"Invalid parameters\"}");
    return;
  }

  // 1. Update the ESP32's local telemetry for this physical bus
  fleet[busIndex].soc = static_cast<uint8_t>(soc);
  fleet[busIndex].condition = condition;
  recalculateStatus(fleet[busIndex]);

  // 2. Persist to Non-Volatile Storage (NVS Flash) by index (safe from 15-char key limit!)
  String socKey = "s_" + String(busIndex);
  String condKey = "c_" + String(busIndex);
  prefs.putUChar(socKey.c_str(), static_cast<uint8_t>(soc));
  prefs.putString(condKey.c_str(), condition);

  Serial.print("[NVS Saved] Bus ");
  Serial.print(fleet[busIndex].busName);
  Serial.print(" -> SoC: ");
  Serial.print(soc);
  Serial.print("%, Condition: ");
  Serial.println(condition);

  String assignedRoute = fleet[busIndex].assignedRoute;
  bool blocked = false;

  // 3. Forward to Render Cloud API using physical busName
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Required for Render HTTPS certificates
    secureClient.setTimeout(15);

    HTTPClient http;
    http.begin(secureClient, RENDER_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); // 15-second timeout to handle Render cold-starts safely

    String jsonPayload = "{\"bus\":\"" + String(fleet[busIndex].busName) + 
                         "\",\"soc\":" + String(soc) + 
                         ",\"condition\":\"" + fleet[busIndex].condition + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode == 200) {
      String responseBody = http.getString();
      Serial.print("[Render Success] HTTP 200 for Bus ");
      Serial.println(fleet[busIndex].busName);

      // Parse assignedRouteDisplay from swap engine response
      int keyIdx = responseBody.indexOf("\"assignedRouteDisplay\":\"");
      if (keyIdx == -1) keyIdx = responseBody.indexOf("\"assignedRoute\":\"");
      if (keyIdx != -1) {
        int colonIdx = responseBody.indexOf(":", keyIdx);
        int quoteStart = responseBody.indexOf("\"", colonIdx) + 1;
        int quoteEnd = responseBody.indexOf("\"", quoteStart);
        if (quoteStart > 0 && quoteEnd > quoteStart) {
          assignedRoute = responseBody.substring(quoteStart, quoteEnd);
          fleet[busIndex].assignedRoute = assignedRoute;
          prefs.putString(("r_" + String(busIndex)).c_str(), assignedRoute);
          Serial.print("[Swapped Route Assigned] -> ");
          Serial.println(assignedRoute);
        }
      }

      if (responseBody.indexOf("\"blocked\":true") != -1) {
        blocked = true;
        Serial.println("[Status] Blocked for departure: Range < Route Distance");
      }
    } else if (httpResponseCode > 0) {
      Serial.print("[Render Response] HTTP Status: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error pushing to Render: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  } else {
    Serial.println("WiFi Disconnected. Could not reach Render.");
  }

  addCorsHeader();
  String resp = "{\"message\":\"Telemetry updated successfully for Bus " + String(fleet[busIndex].busName) + 
                "\",\"bus\":\"" + String(fleet[busIndex].busName) + 
                "\",\"assignedRoute\":\"" + assignedRoute + 
                "\",\"blocked\":" + (blocked ? "true" : "false") + "}";
  server.send(200, "application/json", resp);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

void setup() {
  Serial.begin(115200);

  // 1. Restore saved SoC, condition, and swapped routes from ESP32 Flash Memory (NVS)
  prefs.begin("bussoc", false);
  for (size_t i = 0; i < FLEET_SIZE; ++i) {
    String socKey = "s_" + String(i);
    String condKey = "c_" + String(i);
    String routeKey = "r_" + String(i);
    if (prefs.isKey(socKey.c_str())) {
      fleet[i].soc = prefs.getUChar(socKey.c_str(), fleet[i].soc);
    }
    if (prefs.isKey(condKey.c_str())) {
      fleet[i].condition = prefs.getString(condKey.c_str(), fleet[i].condition);
    }
    if (prefs.isKey(routeKey.c_str())) {
      fleet[i].assignedRoute = prefs.getString(routeKey.c_str(), fleet[i].assignedRoute);
    }
    recalculateStatus(fleet[i]);
  }
  Serial.println("Fleet telemetry restored from ESP32 NVS flash storage.");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("Connecting to Wi-Fi Hotspot");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected to internet!");
  Serial.print("ESP32 IP Address (Open this on your phone): http://");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html", DRIVER_PAGE); });
  server.on("/driver", HTTP_GET, []() { server.send_P(200, "text/html", DRIVER_PAGE); });
  server.on("/dashboard", HTTP_GET, []() { server.send_P(200, "text/html", DASHBOARD_PAGE); });
  server.on("/api/fleet", HTTP_GET, handleFleetApi);
  server.on("/update", HTTP_POST, handleUpdate);
  server.onNotFound(handleNotFound);
  server.begin();

  Serial.println("ESP32 Gateway is ready and linked to Render.");
}

void loop() {
  server.handleClient();
}
