#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

// Open http://192.168.4.1/ for the driver terminal.
// Open http://192.168.4.1/dashboard for the depot manager dashboard.
const char *AP_SSID = "EV_Bus_Depot";
const char *AP_PASSWORD = "password123";
const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

WebServer server(80);
Preferences prefs;

struct BusTelemetry {
  const char *busId;
  const char *route;
  uint8_t soc;
  const char *status;
};

BusTelemetry fleet[] = {
    {"Bus 101", "500D", 85, "Active"},
    {"Bus 102", "276", 24, "Warning"},
    {"Bus 103", "335E", 10, "Blocked"}
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
    <p>Send the latest battery reading for a bus to the depot gateway.</p>
    <form id="telemetry-form">
      <label for="bus">Bus</label>
      <select id="bus" name="bus">
        <option value="0">Bus 101 - Route 500D</option>
        <option value="1">Bus 102 - Route 276</option>
        <option value="2">Bus 103 - Route 335E</option>
      </select>
      <label for="soc">State of Charge</label>
      <input id="soc" name="soc" type="range" min="0" max="100" value="85">
      <output class="soc-value" id="soc-value" for="soc">85%</output>
      <button id="submit" type="submit">Update Telemetry</button>
    </form>
    <p id="message" role="status"></p>
    <p><a href="/dashboard">Open depot dashboard</a></p>
  </main>
  <script>
    const form = document.getElementById('telemetry-form');
    const slider = document.getElementById('soc');
    const output = document.getElementById('soc-value');
    const message = document.getElementById('message');
    const submit = document.getElementById('submit');
    slider.addEventListener('input', () => output.textContent = slider.value + '%');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      message.textContent = 'Sending...';
      try {
        const response = await fetch('/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ bus: document.getElementById('bus').value, soc: slider.value })
        });
        const result = await response.json();
        message.textContent = response.ok ? result.message : (result.error || 'Update failed.');
      } catch (error) {
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
  <title>EV Bus Depot Dashboard</title>
  <style>
    :root { --ink: #122033; --muted: #617083; --line: #dbe4ec; --bg: #f3f7fa; --green: #167447; --green-bg: #dff5e8; --yellow: #8a5b00; --yellow-bg: #fff0bf; --red: #a62525; --red-bg: #ffe0e0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px 18px; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, sans-serif; }
    main { width: min(1100px, 100%); margin: auto; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.5rem); }
    .updated { color: var(--muted); font-size: .9rem; }
    .table-wrap { overflow-x: auto; background: white; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 35px #19324a0d; }
    table { width: 100%; border-collapse: collapse; min-width: 680px; }
    th, td { padding: 16px 18px; border-bottom: 1px solid var(--line); text-align: left; }
    th { background: #edf3f7; color: var(--muted); font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; }
    tbody tr:last-child td { border-bottom: 0; }
    .soc { font-weight: 800; }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: .85rem; font-weight: 700; white-space: nowrap; }
    .active { color: var(--green); background: var(--green-bg); }
    .warning { color: var(--yellow); background: var(--yellow-bg); }
    .blocked { color: var(--red); background: var(--red-bg); }
    a { display: inline-block; margin-top: 18px; color: #1769aa; }
    @media (max-width: 650px) { header { align-items: start; flex-direction: column; } th, td { padding: 13px 12px; } }
  </style>
</head>
<body>
  <main>
    <header><h1>Depot Fleet Status</h1><span class="updated" id="updated">Connecting...</span></header>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Bus ID</th><th>Route</th><th>Live SoC</th><th>Vehicle Status</th><th>Assigned Action</th></tr></thead>
        <tbody id="fleet"><tr><td colspan="5">Loading fleet data...</td></tr></tbody>
      </table>
    </div>
    <a href="/">Back to driver terminal</a>
  </main>
  <script>
    const fleet = document.getElementById('fleet');
    const updated = document.getElementById('updated');
    function stateFor(soc) {
      if (soc > 30) return { status: 'Active / On Route', action: 'Continue assigned route', className: 'active' };
      if (soc > 15) return { status: 'Warning - Low Battery', action: 'Schedule depot charge', className: 'warning' };
      return { status: 'BLOCKED - Send to Depot Charger', action: 'Send to depot charger', className: 'blocked' };
    }
    async function refreshFleet() {
      try {
        const response = await fetch('/api/fleet', { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const buses = await response.json();
        fleet.innerHTML = buses.map(bus => {
          const state = stateFor(Number(bus.soc));
          return `<tr><td><strong>${bus.bus_id}</strong></td><td>${bus.route}</td><td class="soc">${bus.soc}%</td><td><span class="badge ${state.className}">${state.status}</span></td><td>${state.action}</td></tr>`;
        }).join('');
        updated.textContent = 'Updated ' + new Date().toLocaleTimeString();
      } catch (error) {
        updated.textContent = 'Unable to reach gateway';
      }
    }
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
    json += fleet[i].busId;
    json += "\",\"route\":\"";
    json += fleet[i].route;
    json += "\",\"soc\":";
    json += String(fleet[i].soc);
    json += ",\"status\":\"";
    json += fleet[i].status;
    json += "\"}";
  }
  json += "]";
  addCorsHeader();
  server.send(200, "application/json", json);
}

void handleUpdate() {
  if (!server.hasArg("bus") || !server.hasArg("soc")) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"bus and soc parameters are required\"}");
    return;
  }

  const int busIndex = server.arg("bus").toInt();
  const int soc = server.arg("soc").toInt();
  if (busIndex < 0 || busIndex >= static_cast<int>(FLEET_SIZE) || soc < 0 || soc > 100) {
    addCorsHeader();
    server.send(400, "application/json", "{\"error\":\"bus must be 0-2 and soc must be 0-100\"}");
    return;
  }

  fleet[busIndex].soc = static_cast<uint8_t>(soc);
  recalculateStatus(fleet[busIndex]);

  // Persist to NVS Flash
  String socKey = "s_" + String(busIndex);
  prefs.putUChar(socKey.c_str(), static_cast<uint8_t>(soc));

  addCorsHeader();
  server.send(200, "application/json", "{\"message\":\"Telemetry updated successfully and saved to flash memory\"}");
}

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

void setup() {
  Serial.begin(115200);

  // Restore saved SoC from NVS Flash
  prefs.begin("ev_gateway", false);
  for (size_t i = 0; i < FLEET_SIZE; ++i) {
    String socKey = "s_" + String(i);
    if (prefs.isKey(socKey.c_str())) {
      fleet[i].soc = prefs.getUChar(socKey.c_str(), fleet[i].soc);
    }
    recalculateStatus(fleet[i]);
  }
  Serial.println("Fleet telemetry restored from flash memory.");

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html", DRIVER_PAGE); });
  server.on("/driver", HTTP_GET, []() { server.send_P(200, "text/html", DRIVER_PAGE); });
  server.on("/dashboard", HTTP_GET, []() { server.send_P(200, "text/html", DASHBOARD_PAGE); });
  server.on("/api/fleet", HTTP_GET, handleFleetApi);
  server.on("/update", HTTP_POST, handleUpdate);
  server.onNotFound(handleNotFound);
  server.begin();

  Serial.println("EV Bus Depot gateway is ready.");
  Serial.print("Driver terminal: http://");
  Serial.println(AP_IP);
  Serial.print("Depot dashboard: http://");
  Serial.print(AP_IP);
  Serial.println("/dashboard");
}

void loop() {
  server.handleClient();
}