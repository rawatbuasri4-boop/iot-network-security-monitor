/* Offline simulation: produces records only; it never sends network packets. */
(function (root) {
  "use strict";

  const STORAGE_KEY = "iot-security-simulator-v1";
  const TEMPLATES = [
    { id: "thermostat-01", name: "Thermostat", ip: "192.168.1.20", mac: "AA:10:20:30:40:01" },
    { id: "camera-01", name: "Camera", ip: "192.168.1.21", mac: "AA:10:20:30:40:02" },
    { id: "smartplug-01", name: "Smart Plug", ip: "192.168.1.22", mac: "AA:10:20:30:40:03" },
  ];
  const random = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  class OfflineSimulator {
    constructor({ storage = null, clock = () => Date.now() } = {}) {
      this.storage = storage;
      this.clock = clock;
      this.storageAvailable = Boolean(storage);
      this.reset(false);
      try {
        const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
        if (saved?.version === 1 && Array.isArray(saved.devices) && Array.isArray(saved.events)
            && Array.isArray(saved.alerts) && saved.devices.length >= 3) {
          this.devices = new Map(saved.devices.map(device => [device.id, device]));
          this.events = saved.events.slice(0, 250);
          this.alerts = saved.alerts.slice(0, 100);
          this.totalPackets = Number(saved.totalPackets) || 0;
          this.totalBytes = Number(saved.totalBytes) || 0;
          this.paused = Boolean(saved.paused);
          this.nextAlertId = Math.max(0, ...this.alerts.map(alert => Number(alert.id) || 0)) + 1;
          this.lastAlerts = new Map(this.alerts.map(alert => [
            `${alert.device_id}:${alert.alert_type}`, Date.parse(alert.timestamp),
          ]).reverse());
        }
      } catch (_) {
        this.storageAvailable = false;
      }
    }

    reset(save = true) {
      this.devices = new Map(TEMPLATES.map(template => [template.id, {
        ...template, known: true, trusted: true, status: "normal", packets: 0, bytes: 0,
        first_seen: null, last_seen: null,
      }]));
      this.events = [];
      this.alerts = [];
      this.windows = new Map();
      this.lastAlerts = new Map();
      this.totalPackets = 0;
      this.totalBytes = 0;
      this.nextAlertId = 1;
      this.scenario = "normal";
      this.paused = false;
      this.scenarioUntil = 0;
      this.lastTick = -Infinity;
      if (save) this.save();
    }

    save() {
      if (!this.storageAvailable) return;
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify({
          version: 1, devices: [...this.devices.values()], events: this.events,
          alerts: this.alerts, totalPackets: this.totalPackets, totalBytes: this.totalBytes,
          paused: this.paused,
        }));
      } catch (_) {
        this.storageAvailable = false;
      }
    }

    alert(device, type, severity, message, scenario) {
      const key = `${device.id}:${type}`;
      const now = this.clock();
      if (now - (this.lastAlerts.get(key) ?? -Infinity) < 15000) return;
      this.lastAlerts.set(key, now);
      this.alerts.unshift({
        id: this.nextAlertId++, timestamp: new Date(now).toISOString(), severity,
        alert_type: type, device_id: device.id, source_ip: device.ip, message, scenario,
      });
      this.alerts.length = Math.min(this.alerts.length, 100);
    }

    addPacket(deviceId, destinationIp, protocol, port, size, scenario = "normal") {
      const device = this.devices.get(deviceId);
      if (!device) throw new Error("Device not found");
      const now = this.clock();
      const timestamp = new Date(now).toISOString();
      const event = {
        timestamp, device_id: deviceId, source_ip: device.ip,
        destination_ip: destinationIp, protocol, destination_port: port,
        packet_size: size, scenario,
      };
      this.events.unshift(event);
      this.events.length = Math.min(this.events.length, 250);
      this.totalPackets += 1;
      this.totalBytes += size;
      device.packets += 1;
      device.bytes += size;
      device.first_seen ||= timestamp;
      device.last_seen = timestamp;
      const history = (this.windows.get(deviceId) || []).filter(item => now - item.time < 20000);
      history.push({ time: now, port, protocol, destinationIp });
      this.windows.set(deviceId, history);
      this.detect(device, history, now, scenario);
    }

    detect(device, history, now, scenario) {
      device.status = device.known ? "normal" : "unknown";
      if (!device.known) {
        this.alert(device, "unknown_device", "high",
          "พบอุปกรณ์ที่ยังไม่ได้รับอนุมัติในเครือข่ายจำลอง", scenario);
      }
      const portsByDestination = new Map();
      for (const item of history) {
        if (item.protocol !== "TCP") continue;
        if (!portsByDestination.has(item.destinationIp)) portsByDestination.set(item.destinationIp, new Set());
        portsByDestination.get(item.destinationIp).add(item.port);
      }
      const uniquePorts = Math.max(0, ...[...portsByDestination.values()].map(ports => ports.size));
      if (uniquePorts >= 10) {
        device.status = "warning";
        this.alert(device, "port_scan_pattern", "high",
          `ติดต่อปลายทางเดียวกัน ${uniquePorts} TCP Ports ใน 20 วินาที`, scenario);
      }
      const packetCount = history.filter(item => now - item.time < 10000).length;
      if (packetCount >= 25) {
        device.status = "warning";
        this.alert(device, "traffic_burst", "medium",
          `ส่ง ${packetCount} Packets ใน 10 วินาที (เกณฑ์แจ้งเตือน 25)`, scenario);
      }
    }

    tick() {
      const now = this.clock();
      if (this.paused || now - this.lastTick < 1500) return;
      this.lastTick = now;
      if (now > this.scenarioUntil) this.scenario = "normal";
      const destinations = [
        ["192.168.1.1", "UDP", 53], ["192.168.1.1", "UDP", 123],
        ["203.0.113.20", "TCP", 443], ["198.51.100.20", "TCP", 443],
      ];
      for (const device of this.devices.values()) {
        const count = device.id === "unknown-01" ? 1 : random(1, 3);
        for (let index = 0; index < count; index++) {
          this.addPacket(device.id, ...destinations[random(0, destinations.length - 1)], random(180, 1400));
        }
      }
      this.save();
    }

    runScenario(scenario) {
      if (!["normal", "new_device", "port_scan", "traffic_burst"].includes(scenario)) {
        throw new Error("Unknown scenario");
      }
      this.scenario = scenario;
      this.paused = false;
      this.scenarioUntil = this.clock() + 12000;
      if (scenario === "new_device") {
        if (!this.devices.has("unknown-01")) {
          this.devices.set("unknown-01", {
            id: "unknown-01", name: "Unknown Device", ip: "192.168.1.99",
            mac: "AA:99:99:99:99:99", known: false, trusted: false, status: "unknown",
            packets: 0, bytes: 0, first_seen: null, last_seen: null,
          });
        }
        this.addPacket("unknown-01", "192.168.1.1", "UDP", 53, 420, scenario);
      } else if (scenario === "port_scan") {
        for (const port of [21, 22, 23, 25, 53, 80, 110, 139, 443, 445, 8080, 8443]) {
          this.addPacket("camera-01", "192.168.1.50", "TCP", port, 64, scenario);
        }
      } else if (scenario === "traffic_burst") {
        for (let index = 0; index < 35; index++) {
          this.addPacket("smartplug-01", "203.0.113.10", "UDP", 9999, random(900, 1450), scenario);
        }
      }
      this.save();
    }

    trustDevice(id) {
      const device = this.devices.get(id);
      if (!device) throw new Error("Device not found");
      device.known = true;
      device.trusted = true;
      this.detect(device, this.windows.get(id) || [], this.clock(), this.scenario);
      this.save();
    }

    setPaused(paused) {
      this.paused = Boolean(paused);
      this.save();
    }

    snapshot() {
      this.tick();
      return {
        scenario: this.scenario, paused: this.paused, last_updated: new Date(this.clock()).toISOString(),
        stats: { events: this.totalPackets, alerts: this.alerts.length,
          devices: this.devices.size, bytes: this.totalBytes },
        devices: [...this.devices.values()], alerts: [...this.alerts], events: this.events.slice(0, 40),
      };
    }
  }

  root.OfflineSimulator = OfflineSimulator;
})(globalThis);
