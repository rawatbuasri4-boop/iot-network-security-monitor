"use strict";

const ICONS = {
  shield: '<path d="M12 3 4.5 6v5c0 4.5 3.2 7.8 7.5 10 4.3-2.2 7.5-5.5 7.5-10V6z"/><path d="m8.5 11.5 2.2 2.2 4.8-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  devices: '<rect x="3" y="4" width="14" height="11" rx="2"/><path d="M7 19h7m-3-4v4"/><rect x="16" y="10" width="5" height="10" rx="1.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zm0 0v15"/>',
  flask: '<path d="M9 3h6m-5 0v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M7 14h10m-7 3h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5M12 17h.01"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  data: '<path d="M7 3v14m-4-4 4 4 4-4m6 8V7m-4 4 4-4 4 4"/>',
  router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M6 13V7m12 6V7M7 17h.01M11 17h.01M8 5a6 6 0 0 1 8 0M10 8a3 3 0 0 1 4 0"/>',
  cloud: '<path d="M6 18a4.5 4.5 0 0 1-1-8.9 7 7 0 0 1 13-2A5.5 5.5 0 0 1 18.5 18z"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5M12 17.5h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  scan: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M7 12h10M12 7v10"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/><circle cx="9.5" cy="12" r="2.5"/>',
  thermometer: '<path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0M12 8v9"/><circle cx="12" cy="18" r="1"/>',
  plug: '<path d="M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-12 0zm6 10v4"/>',
  unknown: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M10 8a2 2 0 1 1 3 1.7c-.8.4-1 .8-1 1.8M12 15h.01M10 19h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
};

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.devices) + '</svg>';
document.querySelectorAll("[data-icon]").forEach(element => { element.innerHTML = icon(element.dataset.icon); });
document.querySelectorAll(".nav-item").forEach(button => { button.setAttribute("aria-label", button.querySelector(".nav-label").textContent); });

const DEVICE_META = {
  "thermostat-01": { name: "เครื่องวัดอุณหภูมิ", icon: "thermometer", description: "ส่งค่าที่วัดได้ให้บริการออนไลน์" },
  "camera-01": { name: "กล้องวงจรปิด", icon: "camera", description: "ติดต่อบริการและส่งสถานะของกล้อง" },
  "smartplug-01": { name: "ปลั๊กอัจฉริยะ", icon: "plug", description: "ส่งสถานะการทำงานของปลั๊ก" },
  "unknown-01": { name: "อุปกรณ์ไม่รู้จัก", icon: "unknown", description: "ยังไม่อยู่ในรายการที่ผู้ดูแลอนุมัติ" },
};
const ALERT_META = {
  unknown_device: { title: "มีอุปกรณ์ที่ยังไม่อนุมัติ", icon: "unknown" },
  port_scan_pattern: { title: "กล้องลองติดต่อหลายพอร์ต", icon: "scan" },
  traffic_burst: { title: "อุปกรณ์ส่งข้อมูลถี่ผิดปกติ", icon: "activity" },
};
const VIEWS = {
  overview: ["ภาพรวมเครือข่าย", "เห็นว่าอุปกรณ์ไหนกำลังคุยกับใคร และมีอะไรที่ควรตรวจสอบ"],
  devices: ["อุปกรณ์ของฉัน", "ตรวจสอบอุปกรณ์ที่รู้จัก อนุมัติเครื่องใหม่ และดูรายละเอียดการเชื่อมต่อ"],
  alerts: ["ประวัติแจ้งเตือน", "ดูเหตุการณ์ที่ตรวจพบ พร้อมรายละเอียดว่าเกิดจากอุปกรณ์ไหน"],
  help: ["เข้าใจโปรเจกต์นี้", "เริ่มจากภาพใหญ่ แล้วค่อยทำความรู้จักคำศัพท์และวิธีทดลอง"],
};
const SCENARIOS = {
  normal: {
    title: "อุปกรณ์ทำงานเหมือนทุกวัน",
    description: "อุปกรณ์ส่งข้อมูลไปบริการที่ใช้ประจำ ระบบนับจำนวนข้อความและเฝ้าดูพฤติกรรมไปเรื่อย ๆ",
    result: "ไม่มีพฤติกรรมผิดปกติใหม่จากการทดลองนี้",
  },
  new_device: {
    title: "มีเครื่องที่เรายังไม่รู้จัก",
    description: "อุปกรณ์ 192.168.1.99 ส่งข้อมูลเข้ามา ระบบเทียบกับรายการที่รู้จัก แล้วแจ้งให้ผู้ดูแลตรวจสอบ",
    result: "ถ้าเป็นอุปกรณ์ของเรา กด “อนุมัติอุปกรณ์” ด้านล่างได้เลย",
  },
  port_scan: {
    title: "เหมือนลองเปิดประตูหลายบาน",
    description: "กล้องติดต่อ 12 ช่องบริการของเครื่องเดียวกัน เมื่อพบอย่างน้อย 10 TCP Ports ใน 20 วินาที ระบบจะแจ้งเตือน",
    result: "กดที่กล้องสีแดงในแผนผัง เพื่อดูรายละเอียด",
  },
  traffic_burst: {
    title: "ปลั๊กส่งข้อความถี่เกินปกติ",
    description: "ปลั๊กส่งข้อมูลจำลอง 35 ชิ้นในครั้งเดียว เกินเกณฑ์ 25 Packets ใน 10 วินาที จึงเกิดแจ้งเตือน",
    result: "ดูกราฟพุ่งขึ้น และปลั๊กเปลี่ยนเป็นสีแดง",
  },
};

const offlineMode = window.location.protocol === "file:";
let storage = null;
try { storage = window.localStorage; } catch (_) { /* Temporary simulation still works. */ }
const localSimulator = offlineMode ? new OfflineSimulator({ storage }) : null;
let latestState = null;
let currentView = "overview";
let selectedScenario = "normal";
let detailDeviceId = null;
let refreshInFlight = false;
let actionInFlight = false;
let toastTimer;
let previousSample = null;
const rateSamples = Array(40).fill(0);

$("storageLabel").textContent = offlineMode ? "บันทึกการทดลองในเบราว์เซอร์นี้" : "บันทึกการทดลองในคอมพิวเตอร์นี้";
$("deviceDialog").setAttribute("aria-label", "รายละเอียดอุปกรณ์");
$("resetDialog").setAttribute("aria-label", "ยืนยันเริ่มการทดลองใหม่");

function formatNumber(value) { return Number(value || 0).toLocaleString("en-US"); }
function formatBytes(value, html = false) {
  let number = Number(value || 0);
  let unit = "B";
  if (number >= 1048576) { number /= 1048576; unit = "MB"; }
  else if (number >= 1024) { number /= 1024; unit = "KB"; }
  const text = unit === "B" ? String(Math.round(number)) : number.toFixed(1);
  return html ? text + " <small>" + unit + "</small>" : text + " " + unit;
}
function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("th-TH", { hour12: false });
}
function meta(device) {
  return DEVICE_META[device.id] || { name: device.name, icon: "devices", description: "อุปกรณ์ในเครือข่ายจำลอง" };
}
function deviceStatus(device) {
  if (!device.known) return "unknown";
  return device.status === "warning" ? "warning" : "normal";
}
function statusLabel(device) {
  return { unknown: "ยังไม่อนุมัติ", warning: "ควรตรวจสอบ", normal: "รู้จักแล้ว" }[deviceStatus(device)];
}
function statusChip(device) {
  return '<span class="status-chip ' + deviceStatus(device) + '"><span class="dot"></span>' + statusLabel(device) + '</span>';
}
function replaceHTML(id, html) {
  const element = $(id);
  if (element.innerHTML === html) return;
  const focused = element.contains(document.activeElement) ? document.activeElement?.dataset.focus : null;
  element.innerHTML = html;
  if (focused) element.querySelector('[data-focus="' + CSS.escape(focused) + '"]')?.focus({ preventScroll: true });
}

async function request(path, body) {
  if (localSimulator) {
    if (path === "/api/reset") localSimulator.reset();
    else if (path === "/api/scenario") localSimulator.runScenario(body.scenario);
    else if (path === "/api/device/trust") localSimulator.trustDevice(body.device_id);
    else if (path === "/api/pause") localSimulator.setPaused(body.paused);
    return localSimulator.snapshot();
  }
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Server returned " + response.status);
  const data = await response.json();
  return data.state || data;
}

function notify(message) {
  clearTimeout(toastTimer);
  $("toast").innerHTML = icon("check") + '<span>' + escapeHtml(message) + '</span>';
  $("toast").hidden = false;
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4500);
}
function showError(error) {
  $("modeNotice").hidden = false;
  $("modeNotice").textContent = "เชื่อมต่อไม่ได้ ลองเปิดไฟล์ OPEN_DASHBOARD.html จากโฟลเดอร์โปรเจกต์ เพื่อใช้ตัวจำลองแบบเปิดจากไฟล์";
  $("networkHealth").className = "status-chip warning";
  $("networkHealth").textContent = "เชื่อมต่อไม่ได้";
  console.error(error);
}

function showView(view) {
  if (!VIEWS[view]) return;
  currentView = view;
  $("mainContent").dataset.view = view;
  $("pageTitle").textContent = VIEWS[view][0];
  $("breadcrumbTitle").textContent = VIEWS[view][0];
  $("pageDescription").textContent = VIEWS[view][1];
  document.querySelectorAll("[data-page]").forEach(element => {
    element.hidden = !element.dataset.page.split(" ").includes(view);
  });
  document.querySelectorAll(".nav-item").forEach(button => {
    const active = button.dataset.nav === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("packetsDetails").open = view === "alerts";
  if (latestState) renderAlerts(latestState);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderMap(state) {
  const devices = state.devices;
  replaceHTML("mapDevices", devices.map(device => {
    const info = meta(device);
    const status = deviceStatus(device);
    return '<button class="map-device ' + status + '" data-device="' + escapeHtml(device.id) + '" data-focus="map-' + escapeHtml(device.id) + '" aria-label="ดูรายละเอียด ' + escapeHtml(info.name) + '">'
      + '<span class="node-icon">' + icon(info.icon) + '</span><span><strong>' + escapeHtml(info.name)
      + '</strong><small>' + escapeHtml(device.ip) + '</small></span><span class="node-dot dot" aria-label="' + statusLabel(device) + '"></span></button>';
  }).join(""));
  let paths = devices.map((device, index) => {
    const y = ((index + .5) / devices.length * 360).toFixed(1);
    const path = "M 290 " + y + " C 370 " + y + ", 340 180, 440 180";
    return '<path class="map-path" d="' + path + '"/><path class="map-flow ' + deviceStatus(device) + '" d="' + path + '"/>';
  }).join("");
  paths += '<path class="map-path" d="M 560 180 C 660 180 635 105 745 105"/><path class="map-flow" d="M 560 180 C 660 180 635 105 745 105"/>'
    + '<path class="map-path" d="M 560 180 C 660 180 635 255 745 255"/><path class="map-flow" d="M 560 180 C 660 180 635 255 745 255"/>';
  replaceHTML("mapConnections", paths);
  $("mapStage").classList.toggle("is-paused", Boolean(state.paused));
}

function updateChart(state, sample) {
  if (sample) {
    const now = Date.now();
    let rate = 0;
    if (previousSample) {
      const seconds = Math.max(1, (now - previousSample.time) / 1000);
      rate = state.paused ? 0 : Math.max(0, state.stats.events - previousSample.packets) / seconds;
    }
    previousSample = { time: now, packets: state.stats.events };
    rateSamples.push(rate);
    rateSamples.shift();
  }
  const rate = rateSamples[rateSamples.length - 1];
  $("packetRate").innerHTML = rate.toFixed(1) + " <small>Packet / วินาที</small>";
  const scale = Math.max(8, ...rateSamples) * 1.15;
  const points = rateSamples.map((value, index) => [(index / 39 * 800).toFixed(1), (92 - value / scale * 80).toFixed(1)]);
  const line = points.map((point, index) => (index ? "L" : "M") + point.join(" ")).join(" ");
  const burst = Math.max(...rateSamples) >= 10 ? " burst" : "";
  replaceHTML("trafficChart",
    [20, 55, 91].map(y => '<line class="chart-grid" x1="0" y1="' + y + '" x2="800" y2="' + y + '"/>').join("")
    + '<path class="chart-area' + burst + '" d="' + line + ' L800 98 L0 98Z"/>'
    + '<path class="chart-line' + burst + '" d="' + line + '"/>'
    + '<circle class="chart-point" cx="800" cy="' + points[39][1] + '" r="3"/>');
}

function renderDevices(state) {
  replaceHTML("deviceCards", state.devices.map(device => {
    const info = meta(device);
    const latest = state.events.find(event => event.device_id === device.id);
    const lastLine = latest ? "ล่าสุด → " + destinationLabel(latest) : info.description;
    return '<div class="device-row ' + deviceStatus(device) + '"><button class="device-info-button" data-device="' + escapeHtml(device.id)
      + '" data-focus="device-' + escapeHtml(device.id) + '"><span class="node-icon">' + icon(info.icon) + '</span><span><strong>'
      + escapeHtml(info.name) + '</strong><small>' + escapeHtml(device.ip) + ' · ' + formatNumber(device.packets) + ' Packets</small></span></button>'
      + '<div class="device-row-actions">' + statusChip(device)
      + (!device.known ? '<button class="button button-primary button-small" data-trust-device="' + escapeHtml(device.id) + '" data-focus="trust-' + escapeHtml(device.id) + '">อนุมัติอุปกรณ์</button>' : '')
      + '</div><p class="device-footnote">' + escapeHtml(lastLine) + '</p></div>';
  }).join(""));
}

function renderAlerts(state) {
  const alerts = currentView === "alerts" ? state.alerts : state.alerts.slice(0, 4);
  if (!alerts.length) {
    replaceHTML("alertsList", '<div class="empty-state"><span class="empty-icon">' + icon("shield")
      + '</span><strong>ยังไม่มีเรื่องให้กังวล</strong><p>ลองกด “มีอุปกรณ์ใหม่เข้ามา”<br>เพื่อดูว่าระบบแจ้งเตือนอย่างไร</p></div>');
    return;
  }
  replaceHTML("alertsList", alerts.map(alert => {
    const info = ALERT_META[alert.alert_type] || { title: "พบสิ่งที่ควรตรวจสอบ", icon: "bell" };
    const device = state.devices.find(item => item.id === alert.device_id);
    const approved = alert.alert_type === "unknown_device" && device?.known;
    const pending = alert.alert_type === "unknown_device" && device && !device.known;
    const name = device ? meta(device).name : alert.source_ip;
    const action = pending
      ? '<button class="text-button" data-trust-device="' + escapeHtml(alert.device_id) + '" data-focus="alert-trust-' + escapeHtml(alert.id) + '">อนุมัติอุปกรณ์ ' + icon("arrow") + '</button>'
      : '<button class="text-button" data-device="' + escapeHtml(alert.device_id) + '" data-focus="alert-detail-' + escapeHtml(alert.id) + '">ดูอุปกรณ์ ' + icon("arrow") + '</button>';
    return '<div class="alert-item"><span class="alert-symbol ' + (alert.alert_type !== "unknown_device" ? "danger" : "") + '">' + icon(info.icon)
      + '</span><div class="alert-copy"><div class="alert-title"><strong>' + escapeHtml(info.title)
      + '</strong><time datetime="' + escapeHtml(alert.timestamp) + '">' + formatTime(alert.timestamp)
      + '</time></div><p>' + escapeHtml(name) + ' · ' + escapeHtml(alert.message)
      + '</p><div class="alert-bottom"><span class="history-label">' + (approved ? "อนุมัติแล้ว · เก็บไว้เป็นประวัติ" : "บันทึกการตรวจพบ")
      + '</span>' + action + '</div></div></div>';
  }).join(""));
}

function destinationLabel(event) {
  if (event.destination_port === 53) return "เราเตอร์ · ค้นหาที่อยู่บริการ (DNS)";
  if (event.destination_port === 123) return "เราเตอร์ · ตั้งเวลาให้ตรงกัน";
  if (event.destination_ip === "192.168.1.50") return "เครื่องในเครือข่าย · " + event.destination_ip;
  if (event.scenario === "traffic_burst") return "ปลายทางทดสอบ · " + event.destination_ip;
  return "บริการออนไลน์ · " + event.destination_ip;
}

function renderRecords(state) {
  const query = $("packetSearch").value.trim().toLowerCase();
  const events = state.events.filter(event => {
    const device = state.devices.find(item => item.id === event.device_id);
    const name = device ? meta(device).name : "";
    return [event.source_ip, event.destination_ip, event.protocol, event.destination_port, name, event.device_id]
      .some(value => String(value).toLowerCase().includes(query));
  });
  $("recordCount").textContent = events.length + " รายการ";
  replaceHTML("eventsTable", events.length ? events.map(event => {
    const device = state.devices.find(item => item.id === event.device_id);
    const name = device ? meta(device).name : event.device_id;
    return '<tr><td>' + formatTime(event.timestamp) + '</td><td><strong>' + escapeHtml(name) + '</strong><small>'
      + escapeHtml(event.source_ip) + '</small></td><td>' + escapeHtml(destinationLabel(event)) + '</td><td><span class="protocol">'
      + escapeHtml(event.protocol) + '</span></td><td>' + Number(event.destination_port) + '</td><td>' + formatBytes(event.packet_size) + '</td></tr>';
  }).join("") : '<tr><td colspan="6">ไม่พบข้อมูลที่ตรงกับคำค้นหา</td></tr>');
}

function renderExplanation(state) {
  const explanation = SCENARIOS[selectedScenario];
  let result = explanation.result;
  if (selectedScenario === "new_device" && state.devices.find(device => device.id === "unknown-01")?.known) {
    result = "อนุมัติแล้ว! ระบบจะไม่แจ้งว่าอุปกรณ์นี้เป็นเครื่องที่ไม่รู้จักอีก";
  } else if (selectedScenario === "normal" && state.devices.some(device => !device.known || device.status === "warning")) {
    result = "การเตือนก่อนหน้ายังคงอยู่: ตรวจอุปกรณ์ใหม่ หรือรอให้พฤติกรรมกลับมาปกติ";
  }
  $("scenarioExplanation").classList.toggle("attention", selectedScenario !== "normal");
  replaceHTML("scenarioExplanation", '<span class="explanation-label">' + icon("info") + 'คำอธิบายการทดลองที่เลือก</span><h3>'
    + explanation.title + '</h3><p>' + explanation.description + '</p><div class="explanation-result">' + icon("arrow") + '<span>' + result + '</span></div>');
  document.querySelectorAll("[data-scenario]").forEach(button => {
    const selected = button.dataset.scenario === selectedScenario;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderDetail(state) {
  const device = state.devices.find(item => item.id === detailDeviceId);
  if (!device) return;
  const info = meta(device);
  const latest = state.events.find(event => event.device_id === device.id);
  const status = deviceStatus(device);
  const explanation = !device.known
    ? "ระบบยังไม่รู้จักเครื่องนี้ ตรวจสอบว่าเป็นอุปกรณ์ของเราหรือไม่ แล้วกดอนุมัติได้ด้านล่าง"
    : status === "warning" ? "ระบบพบการติดต่อหลายพอร์ตหรือส่งข้อมูลถี่ผิดปกติ ดูประวัติแจ้งเตือนเพื่อหาสาเหตุ"
      : "อุปกรณ์นี้ได้รับอนุมัติแล้ว และยังไม่พบพฤติกรรมเกินเกณฑ์ในช่วงเวลาที่กำลังตรวจสอบ";
  replaceHTML("deviceDetail", '<div class="dialog-device-heading ' + status + '"><span class="node-icon">' + icon(info.icon)
    + '</span><div><h2>' + escapeHtml(info.name) + '</h2><p>' + info.description + '</p></div></div><dl class="detail-grid"><div><dt>ที่อยู่ IP</dt><dd>'
    + escapeHtml(device.ip) + '</dd></div><div><dt>สถานะ</dt><dd>' + statusChip(device) + '</dd></div><div><dt>รหัสอุปกรณ์ (MAC)</dt><dd>'
    + escapeHtml(device.mac) + '</dd></div><div><dt>ข้อความที่ส่งแล้ว</dt><dd>' + formatNumber(device.packets) + ' Packets</dd></div></dl>'
    + '<p class="detail-explanation ' + (status === "normal" ? "normal" : "") + '">' + explanation + '</p>'
    + (latest ? '<p class="detail-latest"><strong>การสื่อสารล่าสุด</strong><br>' + escapeHtml(destinationLabel(latest))
      + '<br>' + escapeHtml(latest.protocol) + ' · Port ' + Number(latest.destination_port) + ' · ' + formatBytes(latest.packet_size) + '</p>' : '')
    + (!device.known ? '<button class="button button-primary" data-trust-device="' + escapeHtml(device.id) + '" data-focus="dialog-trust-' + escapeHtml(device.id) + '">' + icon("check") + 'อนุมัติอุปกรณ์นี้</button>' : '')
    + '<p class="detail-note">การอนุมัติคือการจำว่าเป็นอุปกรณ์ของเรา ระบบยังคงตรวจพฤติกรรมผิดปกติของเครื่องนี้ตามเดิม</p>');
}

function render(state, sample = false) {
  latestState = state;
  $("modeNotice").hidden = true;
  const attention = state.devices.filter(device => !device.known || device.status === "warning").length;
  const known = state.devices.filter(device => device.known).length;
  $("deviceCount").innerHTML = formatNumber(state.devices.length) + " <small>เครื่อง</small>";
  $("attentionCount").innerHTML = attention + " <small>เครื่อง</small>";
  $("eventCount").innerHTML = formatNumber(state.stats.events) + " <small>Packet</small>";
  $("byteCount").innerHTML = formatBytes(state.stats.bytes, true);
  $("trustedSummary").textContent = "รู้จักแล้ว " + known + " จาก " + state.devices.length + " เครื่อง";
  $("attentionSummary").textContent = attention ? "กดอุปกรณ์เพื่อดูสาเหตุและจัดการ" : "ทุกอุปกรณ์อยู่ในเกณฑ์ปกติ";
  $("attentionCard").classList.toggle("needs-attention", attention > 0);
  $("inventoryCount").textContent = state.devices.length;
  $("navDeviceCount").textContent = state.devices.length;
  $("alertCount").textContent = state.alerts.length;
  $("navAlertCount").textContent = state.alerts.length;
  $("lastUpdated").textContent = "อัปเดต " + formatTime(state.last_updated);
  $("networkHealth").className = "status-chip " + (state.paused ? "paused" : attention ? "unknown" : "normal");
  $("networkHealth").innerHTML = '<span class="dot"></span>' + (state.paused ? "พักการจำลองอยู่" : attention ? "มี " + attention + " เครื่องควรตรวจสอบ" : "ทุกอุปกรณ์ปกติ");
  $("pauseLabel").textContent = state.paused ? "จำลองต่อ" : "พักการจำลอง";
  $("pauseIcon").innerHTML = icon(state.paused ? "play" : "pause");
  $("pauseButton").setAttribute("aria-pressed", String(Boolean(state.paused)));
  if (localSimulator && !localSimulator.storageAvailable) {
    $("storageLabel").textContent = "โหมดชั่วคราว · ข้อมูลหายเมื่อปิดหน้า";
  }
  renderMap(state);
  updateChart(state, sample);
  renderDevices(state);
  renderAlerts(state);
  renderRecords(state);
  renderExplanation(state);
  if ($("deviceDialog").open) renderDetail(state);
}

async function refresh(sample = false) {
  if (refreshInFlight || actionInFlight) return;
  refreshInFlight = true;
  try { render(await request("/api/state"), sample); }
  catch (error) { showError(error); }
  finally { refreshInFlight = false; }
}

async function perform(path, body, after) {
  if (actionInFlight) return;
  actionInFlight = true;
  document.querySelectorAll("[data-scenario], #pauseButton, #confirmReset").forEach(button => { button.disabled = true; });
  try {
    const result = await request(path, body);
    const state = result.devices ? result : await request("/api/state");
    if (after) after(state);
    render(state, path === "/api/scenario" || path === "/api/reset" || path === "/api/pause");
  } catch (error) { showError(error); }
  finally {
    actionInFlight = false;
    document.querySelectorAll("[data-scenario], #pauseButton, #confirmReset").forEach(button => { button.disabled = false; });
  }
}

document.addEventListener("click", async event => {
  const nav = event.target.closest("[data-nav]");
  if (nav) { showView(nav.dataset.nav); return; }
  const close = event.target.closest("[data-close-dialog]");
  if (close) { $(close.dataset.closeDialog).close(); return; }
  const trust = event.target.closest("[data-trust-device]");
  if (trust) {
    await perform("/api/device/trust", { device_id: trust.dataset.trustDevice }, () => {
      notify("อนุมัติแล้ว ระบบรู้จักอุปกรณ์นี้แล้ว");
      if ($("deviceDialog").open) $("deviceDialog").querySelector("[data-close-dialog]").focus();
    });
    return;
  }
  const deviceButton = event.target.closest("[data-device]");
  if (deviceButton && latestState) {
    detailDeviceId = deviceButton.dataset.device;
    renderDetail(latestState);
    $("deviceDialog").showModal();
    return;
  }
  const scenario = event.target.closest("[data-scenario]");
  if (scenario) {
    await perform("/api/scenario", { scenario: scenario.dataset.scenario }, () => {
      selectedScenario = scenario.dataset.scenario;
      notify(selectedScenario === "normal" ? "กลับมาส่งข้อมูลปกติแล้ว การเตือนเดิมอาจใช้เวลาสักครู่จึงกลับเป็นปกติ" : "สร้างเหตุการณ์แล้ว ดูอุปกรณ์และแจ้งเตือนที่เปลี่ยนไปได้เลย");
    });
  }
});

$("pauseButton").addEventListener("click", () => {
  if (!latestState) return;
  const paused = !latestState.paused;
  perform("/api/pause", { paused }, () => notify(paused ? "พักการส่งข้อมูลจำลองแล้ว" : "เริ่มส่งข้อมูลจำลองต่อแล้ว"));
});
$("resetButton").addEventListener("click", () => $("resetDialog").showModal());
$("confirmReset").addEventListener("click", () => perform("/api/reset", {}, () => {
  selectedScenario = "normal";
  rateSamples.fill(0);
  previousSample = null;
  $("packetSearch").value = "";
  $("resetDialog").close();
  $("deviceDialog").close();
  showView("overview");
  notify("เริ่มการทดลองใหม่ด้วยอุปกรณ์ปกติ 3 เครื่องแล้ว");
}));
$("packetSearch").addEventListener("input", () => { if (latestState) renderRecords(latestState); });
showView("overview");
refresh(true);
setInterval(() => refresh(true), 1600);

