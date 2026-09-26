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

struct BusTelemetry {
  const char *routeId;       // Route ID (canonical key)
  String assignedBus;        // Assigned Bus Short Name (updated dynamically from swap engine)
  uint8_t soc;
  const char *status;
  String condition;          // "Good" or "Not Good"
};

// 3. Complete Fleet Database initialized to 100% SoC (6080 defaults to 78%) and "Good" Condition
BusTelemetry fleet[] = {
  {"6080", "BC-7B PSS-NLGH-8thM", 78, "Active", "Good"},
  {"7834", "PSS-NLGDH-8THM", 100, "Active", "Good"},
  {"4759", "270-D PSS-ABG", 100, "Active", "Good"},
  {"4798", "273-B PSS-ABG", 100, "Active", "Good"},
  {"3907", "401-AK ABG-PSS", 100, "Active", "Good"},
  {"3831", "MBS-12 PSS-ANP", 100, "Active", "Good"},
  {"3864", "248-AB", 100, "Active", "Good"},
  {"7143", "MF-32 PSS-CKB", 100, "Active", "Good"},
  {"1626", "401-M PSS-KTS-D31G", 100, "Active", "Good"},
  {"7403", "PSS-TGPL-GGH", 100, "Active", "Good"},
  {"2780", "250-S PSS-GLB", 100, "Active", "Good"},
  {"9636", "252-A PSS-HAL ARDC", 100, "Active", "Good"},
  {"9581", "252-F PSS-HAL ARDC", 100, "Active", "Good"},
  {"7888", "BC-7B PSS-ANDRH-HRHC", 100, "Active", "Good"},
  {"3920", "253-J PSS-HGV", 100, "Active", "Good"},
  {"6551", "252-A PSS-ISROM", 100, "Active", "Good"},
  {"7296", "JHMS-PSS", 100, "Active", "Good"},
  {"3935", "MF-26 PSS-JHMS", 100, "Active", "Good"},
  {"6979", "251E PSS-KMT", 100, "Active", "Good"},
  {"2764", "252 PSS-KMT", 100, "Active", "Good"},
  {"3430", "507-B", 100, "Active", "Good"},
  {"3158", "254-E PSS-KMP", 100, "Active", "Good"},
  {"2787", "251-C PSS-RPS-LGR", 100, "Active", "Good"},
  {"3916", "PSS-NTTF-LGRNBS", 100, "Active", "Good"},
  {"8842", "MBS-17 MHB-HBL-JHV-PSS", 100, "Active", "Good"},
  {"2644", "256-F", 100, "Active", "Good"},
  {"3878", "401-AK PSS-ABG", 100, "Active", "Good"},
  {"2826", "252-L", 100, "Active", "Good"},
  {"8276", "BC-7B BDYH-PSS", 100, "Active", "Good"},
  {"1548", "D22-PSS", 100, "Active", "Good"},
  {"1427", "401-AM", 100, "Active", "Good"},
  {"8543", "507", 100, "Active", "Good"},
  {"1553", "252", 100, "Active", "Good"},
  {"1621", "252-F", 100, "Active", "Good"},
  {"2559", "273", 100, "Active", "Good"},
  {"8178", "G-252 KBS D9 D22-PSS", 100, "Active", "Good"},
  {"1610", "252 LGR-PSS", 100, "Active", "Good"},
  {"9534", "CHAKRA-7", 100, "Active", "Good"},
  {"1428", "401-AM PTH-PSS", 100, "Active", "Good"},
  {"1612", "252-A", 100, "Active", "Good"},
  {"9108", "PSS-RGPS-SMH", 100, "Active", "Good"},
  {"1367", "401-A", 100, "Active", "Good"},
  {"1549", "D9-PSS", 100, "Active", "Good"},
  {"7632", "500-D MRHB-HBL-PSS", 100, "Active", "Good"},
  {"9535", "CHAKRA-7A", 100, "Active", "Good"},
  {"2786", "250-SB PSS-SVG", 100, "Active", "Good"},
  {"8592", "273 SDN-PSS", 100, "Active", "Good"},
  {"2770", "250-F PSS-SSHL", 100, "Active", "Good"},
  {"2767", "250-E PSS-TMH", 100, "Active", "Good"},
  {"3951", "265-A PSS-TEPL", 100, "Active", "Good"},
  {"2861", "253-D PSS-TRN", 100, "Active", "Good"},
  {"9132", "273 VSD-RJB-PSS", 100, "Active", "Good"},
  {"3629", "265-D PSS-VGN", 100, "Active", "Good"},
  {"8781", "401-A PSS-SGP-YHK", 100, "Active", "Good"}
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
    main { width: min(100%, 520px); background: white; border: 1px solid var(--line); border-radius: 14px; padding: 28px; box-shadow: 0 12px 35px #19324a14; }
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
    <p>Select your route ID and update telemetry. The assigned bus name is dynamically fetched from the cloud swap engine.</p>
    <form id="telemetry-form">
      <label for="bus-search">Search Route / Bus</label>
      <input type="text" id="bus-search" placeholder="Type route or bus name (e.g. 401, 252, 1367)..." autocomplete="off" style="padding: 11px; border: 1px solid #b9c8d6; border-radius: 8px; margin-bottom: 6px;">

      <label for="bus-select">Select Route / Assigned Bus (<span id="bus-count">54</span> buses available)</label>
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
            bus.bus_id.toLowerCase().includes(q) || 
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
        `<option value="${bus.origIndex}">Route ${bus.bus_id}: ${bus.route} (${bus.soc}%)</option>`
      ).join('');

      if (prevVal !== "" && busSelect.querySelector(`option[value="${prevVal}"]`)) {
        busSelect.value = prevVal;
      } else if (filtered.length === 1) {
        busSelect.value = String(filtered[0].origIndex);
      }
      updateFormForSelectedBus();
    }

    // Logic 1: display the selection box such that it gets the finally swapped short name for each route ID
    async function loadFleetDropdown() {
      try {
        const response = await fetch('/api/fleet');
        fleetData = await response.json();
        fleetData.forEach((bus, i) => { bus.origIndex = i; });

        // Query the live website for the swap-engine assigned bus names for each routeId
        try {
          const assignRes = await fetch('https://ashok-leyland-bus-tracking.onrender.com/api/bus-assignments');
          const assignData = await assignRes.json();
          if (assignData && assignData.assignments) {
            fleetData.forEach(bus => {
              if (assignData.assignments[bus.bus_id]) {
                bus.route = assignData.assignments[bus.bus_id];
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
      message.textContent = 'Updating cloud and calculating swaps...';
      
      try {
        const response = await fetch('/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ 
            bus: busSelect.value, 
            soc: slider.value,
            condition: conditionSelect.value 
          })
        });
        const result = await response.json();
        if (response.ok) {
          message.style.color = "green";
          const idx = parseInt(busSelect.value, 10);
          if (fleetData[idx]) {
            fleetData[idx].soc = slider.value;
            fleetData[idx].condition = conditionSelect.value;
            if (result.assignedBus) {
              fleetData[idx].route = result.assignedBus;
            }
          }
          message.textContent = `Route ${result.routeId} updated! Assigned: ${result.assignedBus}` + (result.blocked ? " (⛔ Blocked: Range < Distance)" : "");
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
        <thead><tr><th>Route ID</th><th>Assigned Bus</th><th>Live SoC</th><th>Battery Status</th><th>Condition</th><th>Assigned Action</th></tr></thead>
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
        bus.bus_id.toLowerCase().includes(filterText) || 
        bus.route.toLowerCase().includes(filterText)
      );

      fleet.innerHTML = filtered.map(bus => {
        const state = stateFor(Number(bus.soc));
        const condBadge = bus.condition === 'Good' ? 'active' : 'blocked';
        
        let action = state.action;
        if (bus.condition === 'Not Good') {
           action = '<strong>URGENT: Route to Maintenance Depot</strong>';
        }

        return `<tr>
          <td><strong>${bus.bus_id}</strong></td>
          <td>${bus.route}</td>
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
        renderTable();
        updated.textContent = 'Updated ' + new Date().toLocaleTimeString();
      } catch (error) {
        updated.textContent = 'Unable to reach gateway';
      }
    }
    
    searchInput.addEventListener('input', renderTable);
    refreshFleet();
    setInterval(refreshFleet, 2000);
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
    json += fleet[i].routeId;
    json += "\",\"route\":\"";
    json += fleet[i].assignedBus;
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
  if (!server.hasArg("bus") || !server.hasArg("soc") || !server.hasArg("condition")) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"Missing required parameters\"}");
    return;
  }

  const int busIndex = server.arg("bus").toInt();
  const int soc = server.arg("soc").toInt();
  String condition = server.arg("condition");

  if (busIndex < 0 || busIndex >= static_cast<int>(FLEET_SIZE) || soc < 0 || soc > 100) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"Invalid parameters\"}");
    return;
  }

  // 1. Update the ESP32's local telemetry for this route ID
  fleet[busIndex].soc = static_cast<uint8_t>(soc);
  fleet[busIndex].condition = condition;
  recalculateStatus(fleet[busIndex]);

  // 2. Persist to Non-Volatile Storage (NVS Flash) by route ID
  String socKey = "s_" + String(fleet[busIndex].routeId);
  String condKey = "c_" + String(fleet[busIndex].routeId);
  prefs.putUChar(socKey.c_str(), static_cast<uint8_t>(soc));
  prefs.putString(condKey.c_str(), condition);

  // Safe printing — avoids printf buffer overflow and corrupted characters
  Serial.print("[NVS Saved] Route ");
  Serial.print(fleet[busIndex].routeId);
  Serial.print(" -> SoC: ");
  Serial.print(soc);
  Serial.print("%, Condition: ");
  Serial.println(condition);

  String assignedBus = fleet[busIndex].assignedBus;
  bool blocked = false;

  // 3. Forward to Render Cloud API using ONLY routeId (Logic 1)
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Required for Render HTTPS certificates
    secureClient.setTimeout(15);

    HTTPClient http;
    http.begin(secureClient, RENDER_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); // 15-second timeout to handle Render cold-starts safely

    String jsonPayload = "{\"routeId\":\"" + String(fleet[busIndex].routeId) + 
                         "\",\"soc\":" + String(soc) + 
                         ",\"condition\":\"" + fleet[busIndex].condition + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode == 200) {
      String responseBody = http.getString();
      Serial.print("[Render Success] HTTP 200 for Route ");
      Serial.println(fleet[busIndex].routeId);

      // Parse assignedBusShortName from swap engine response
      int keyIdx = responseBody.indexOf("\"assignedBusShortName\":\"");
      if (keyIdx != -1) {
        int startVal = keyIdx + 24;
        int endVal = responseBody.indexOf("\"", startVal);
        if (endVal != -1) {
          assignedBus = responseBody.substring(startVal, endVal);
          fleet[busIndex].assignedBus = assignedBus;
          prefs.putString(("b_" + String(fleet[busIndex].routeId)).c_str(), assignedBus);
          Serial.print("[Swapped Bus Assigned] -> ");
          Serial.println(assignedBus);
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
  String resp = "{\"message\":\"Telemetry updated successfully for Route " + String(fleet[busIndex].routeId) + 
                "\",\"routeId\":\"" + String(fleet[busIndex].routeId) + 
                "\",\"assignedBus\":\"" + assignedBus + 
                "\",\"blocked\":" + (blocked ? "true" : "false") + "}";
  server.send(200, "application/json", resp);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

void setup() {
  Serial.begin(115200);

  // 1. Restore saved SoC, condition, and swapped bus names from ESP32 Flash Memory (NVS)
  prefs.begin("bussoc", false);
  for (size_t i = 0; i < FLEET_SIZE; ++i) {
    String socKey = "s_" + String(fleet[i].routeId);
    String condKey = "c_" + String(fleet[i].routeId);
    String busKey = "b_" + String(fleet[i].routeId);
    if (prefs.isKey(socKey.c_str())) {
      fleet[i].soc = prefs.getUChar(socKey.c_str(), fleet[i].soc);
    }
    if (prefs.isKey(condKey.c_str())) {
      fleet[i].condition = prefs.getString(condKey.c_str(), fleet[i].condition);
    }
    if (prefs.isKey(busKey.c_str())) {
      fleet[i].assignedBus = prefs.getString(busKey.c_str(), fleet[i].assignedBus);
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
