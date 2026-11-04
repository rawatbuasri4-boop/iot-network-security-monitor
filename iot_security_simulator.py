from __future__ import annotations

import argparse
import json
import random
import sqlite3
import threading
import time
import webbrowser
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
DB_PATH = ROOT / "simulator.db"
HOST = "127.0.0.1"
PORT = 8765


DEVICE_TEMPLATES = {
    "thermostat-01": {
        "name": "Thermostat",
        "ip": "192.168.1.20",
        "mac": "AA:10:20:30:40:01",
    },
    "camera-01": {
        "name": "Camera",
        "ip": "192.168.1.21",
        "mac": "AA:10:20:30:40:02",
    },
    "smartplug-01": {
        "name": "Smart Plug",
        "ip": "192.168.1.22",
        "mac": "AA:10:20:30:40:03",
    },
}

NORMAL_DESTINATIONS = [
    ("192.168.1.1", "UDP", 53),
    ("192.168.1.1", "UDP", 123),
    ("142.250.72.14", "TCP", 443),
    ("151.101.1.69", "TCP", 443),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


class TrafficSimulator:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.db = sqlite3.connect(DB_PATH, check_same_thread=False)
        self._init_db()
        self.events = deque(maxlen=250)
        self.alerts = deque(maxlen=100)
        self.devices = {}
        self.port_windows = defaultdict(deque)
        self.packet_windows = defaultdict(deque)
        self.scenario = "normal"
        self.scenario_until = 0.0
        self.scenario_sent = False
        self.reset()

    def _init_db(self) -> None:
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                device_id TEXT NOT NULL,
                source_ip TEXT NOT NULL,
                destination_ip TEXT NOT NULL,
                protocol TEXT NOT NULL,
                destination_port INTEGER NOT NULL,
                packet_size INTEGER NOT NULL,
                scenario TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                severity TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                device_id TEXT NOT NULL,
                source_ip TEXT NOT NULL,
                message TEXT NOT NULL,
                scenario TEXT NOT NULL
            );
            """
        )
        self.db.commit()

    def reset(self) -> None:
        with self.lock:
            self.db.execute("DELETE FROM events")
            self.db.execute("DELETE FROM alerts")
            self.db.commit()
            self.events.clear()
            self.alerts.clear()
            self.port_windows.clear()
            self.packet_windows.clear()
            self.devices = {}
            for device_id, template in DEVICE_TEMPLATES.items():
                self.devices[device_id] = {
                    "id": device_id,
                    "name": template["name"],
                    "ip": template["ip"],
                    "mac": template["mac"],
                    "known": True,
                    "trusted": True,
                    "status": "normal",
                    "packets": 0,
                    "bytes": 0,
                    "first_seen": None,
                    "last_seen": None,
                }
            self.scenario = "normal"
            self.scenario_until = 0.0
            self.scenario_sent = False
            self.paused = False
            self.last_tick = float("-inf")

    def trust_device(self, device_id: str) -> None:
        with self.lock:
            device = self.devices.get(device_id)
            if device is None:
                raise ValueError("Device not found")
            device["known"] = True
            device["trusted"] = True
            ports, packets = self._window_counts(device["ip"], time.time())
            device["status"] = "warning" if ports >= 10 or packets >= 25 else "normal"

    def set_paused(self, paused: bool) -> None:
        with self.lock:
            self.paused = paused

    def start_scenario(self, scenario: str) -> None:
        allowed = {"normal", "new_device", "port_scan", "traffic_burst"}
        if scenario not in allowed:
            raise ValueError("Unknown scenario")
        with self.lock:
            self.scenario = scenario
            self.scenario_until = time.time() + 12
            self.scenario_sent = False
            self.paused = False
            if scenario != "normal":
                self._generate_scenario()
            self.tick()

    def _ensure_device(self, device_id: str, name: str, ip: str, mac: str, known: bool) -> dict:
        if device_id not in self.devices:
            self.devices[device_id] = {
                "id": device_id,
                "name": name,
                "ip": ip,
                "mac": mac,
                "known": known,
                "trusted": known,
                "status": "unknown" if not known else "normal",
                "packets": 0,
                "bytes": 0,
                "first_seen": None,
                "last_seen": None,
            }
        return self.devices[device_id]

    def _add_alert(
        self,
        severity: str,
        alert_type: str,
        device_id: str,
        source_ip: str,
        message: str,
        scenario: str,
    ) -> None:
        recent_same = [
            alert
            for alert in self.alerts
            if alert["alert_type"] == alert_type and alert["device_id"] == device_id
        ]
        if recent_same and time.time() - datetime.fromisoformat(recent_same[0]["timestamp"]).timestamp() < 15:
            return

        timestamp = now_iso()
        row = {
            "id": None,
            "timestamp": timestamp,
            "severity": severity,
            "alert_type": alert_type,
            "device_id": device_id,
            "source_ip": source_ip,
            "message": message,
            "scenario": scenario,
        }
        cursor = self.db.execute(
            """
            INSERT INTO alerts
            (timestamp, severity, alert_type, device_id, source_ip, message, scenario)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (timestamp, severity, alert_type, device_id, source_ip, message, scenario),
        )
        row["id"] = cursor.lastrowid
        self.db.commit()
        self.alerts.appendleft(row)

    def _window_counts(self, source_ip: str, current_time: float) -> tuple[int, int]:
        port_window = self.port_windows[source_ip]
        while port_window and current_time - port_window[0][0] > 20:
            port_window.popleft()
        by_destination = defaultdict(set)
        for _, destination, protocol, port in port_window:
            if protocol == "TCP":
                by_destination[destination].add(port)
        packet_window = self.packet_windows[source_ip]
        while packet_window and current_time - packet_window[0] > 10:
            packet_window.popleft()
        return max((len(ports) for ports in by_destination.values()), default=0), len(packet_window)

    def _detect(self, event: dict) -> None:
        source_ip = event["source_ip"]
        device_id = event["device_id"]
        current_time = time.time()
        self.port_windows[source_ip].append((current_time, event["destination_ip"], event["protocol"], event["destination_port"]))
        self.packet_windows[source_ip].append(current_time)
        unique_ports, packet_count = self._window_counts(source_ip, current_time)
        self.devices[device_id]["status"] = "normal" if self.devices[device_id]["known"] else "unknown"

        if not self.devices[device_id]["known"]:
            self.devices[device_id]["status"] = "unknown"
            self._add_alert(
                "high",
                "unknown_device",
                device_id,
                source_ip,
                "พบอุปกรณ์ใหม่ที่ไม่อยู่ในรายการอุปกรณ์ที่รู้จัก",
                event["scenario"],
            )

        if unique_ports >= 10:
            self.devices[device_id]["status"] = "warning"
            self._add_alert(
                "high",
                "port_scan_pattern",
                device_id,
                source_ip,
                f"ติดต่อปลายทางเดียวกัน {unique_ports} TCP Ports ใน 20 วินาที",
                event["scenario"],
            )

        if packet_count >= 25:
            self.devices[device_id]["status"] = "warning"
            self._add_alert(
                "medium",
                "traffic_burst",
                device_id,
                source_ip,
                f"ส่ง {packet_count} Packets ใน 10 วินาที (เกณฑ์แจ้งเตือน 25)",
                event["scenario"],
            )

    def _add_event(
        self,
        device_id: str,
        name: str,
        source_ip: str,
        mac: str,
        destination_ip: str,
        protocol: str,
        destination_port: int,
        packet_size: int,
        scenario: str,
        known: bool = True,
    ) -> None:
        device = self._ensure_device(device_id, name, source_ip, mac, known)
        timestamp = now_iso()
        event = {
            "timestamp": timestamp,
            "device_id": device_id,
            "source_ip": source_ip,
            "destination_ip": destination_ip,
            "protocol": protocol,
            "destination_port": destination_port,
            "packet_size": packet_size,
            "scenario": scenario,
        }
        self.events.appendleft(event)
        device["packets"] += 1
        device["bytes"] += packet_size
        device["last_seen"] = timestamp
        if device["first_seen"] is None:
            device["first_seen"] = timestamp
        self.db.execute(
            """
            INSERT INTO events
            (timestamp, device_id, source_ip, destination_ip, protocol,
             destination_port, packet_size, scenario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                device_id,
                source_ip,
                destination_ip,
                protocol,
                destination_port,
                packet_size,
                scenario,
            ),
        )
        self.db.commit()
        self._detect(event)

    def _generate_normal(self) -> None:
        for device_id, template in DEVICE_TEMPLATES.items():
            count = random.randint(1, 3)
            for _ in range(count):
                destination_ip, protocol, destination_port = random.choice(NORMAL_DESTINATIONS)
                self._add_event(
                    device_id,
                    template["name"],
                    template["ip"],
                    template["mac"],
                    destination_ip,
                    protocol,
                    destination_port,
                    random.randint(180, 1400),
                    "normal",
                )

    def _generate_scenario(self) -> None:
        if self.scenario_sent:
            return
        self.scenario_sent = True

        if self.scenario == "new_device":
            self._add_event(
                "unknown-01",
                "Unknown Device",
                "192.168.1.99",
                "AA:99:99:99:99:99",
                "192.168.1.1",
                "UDP",
                53,
                420,
                self.scenario,
                known=False,
            )

        elif self.scenario == "port_scan":
            template = DEVICE_TEMPLATES["camera-01"]
            for destination_port in [21, 22, 23, 25, 53, 80, 110, 139, 443, 445, 8080, 8443]:
                self._add_event(
                    "camera-01",
                    template["name"],
                    template["ip"],
                    template["mac"],
                    "192.168.1.50",
                    "TCP",
                    destination_port,
                    random.randint(60, 180),
                    self.scenario,
                )

        elif self.scenario == "traffic_burst":
            template = DEVICE_TEMPLATES["smartplug-01"]
            for _ in range(35):
                self._add_event(
                    "smartplug-01",
                    template["name"],
                    template["ip"],
                    template["mac"],
                    "203.0.113.10",
                    "UDP",
                    9999,
                    random.randint(900, 1450),
                    self.scenario,
                )

    def tick(self) -> None:
        with self.lock:
            if self.paused or time.monotonic() - self.last_tick < 1.5:
                return
            self.last_tick = time.monotonic()
            for device in self.devices.values():
                ports, packets = self._window_counts(device["ip"], time.time())
                device["status"] = "unknown" if not device["known"] else "warning" if ports >= 10 or packets >= 25 else "normal"
            if time.time() > self.scenario_until and self.scenario != "normal":
                self.scenario = "normal"
                self.scenario_sent = False
            self._generate_normal()
            if self.scenario != "normal":
                self._generate_scenario()

    def snapshot(self) -> dict:
        with self.lock:
            self.tick()
            all_events = list(self.events)
            total_bytes = sum(device["bytes"] for device in self.devices.values())
            return {
                "scenario": self.scenario,
                "paused": self.paused,
                "last_updated": now_iso(),
                "stats": {
                    "events": sum(device["packets"] for device in self.devices.values()),
                    "alerts": len(self.alerts),
                    "devices": len(self.devices),
                    "bytes": total_bytes,
                },
                "devices": list(self.devices.values()),
                "alerts": list(self.alerts),
                "events": all_events[:40],
            }


SIMULATOR: TrafficSimulator


class RequestHandler(BaseHTTPRequestHandler):
    def _send_bytes(self, payload: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        self._send_bytes(
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            "application/json; charset=utf-8",
            status,
        )

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self._serve_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
        elif path == "/app.js":
            self._serve_file(STATIC_DIR / "app.js", "application/javascript; charset=utf-8")
        elif path == "/simulator.js":
            self._serve_file(STATIC_DIR / "simulator.js", "application/javascript; charset=utf-8")
        elif path == "/styles.css":
            self._serve_file(STATIC_DIR / "styles.css", "text/css; charset=utf-8")
        elif path == "/api/state":
            self._send_json(SIMULATOR.snapshot())
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/reset":
            SIMULATOR.reset()
            self._send_json({"ok": True})
            return

        if path == "/api/pause":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length) or b"{}")
                if not isinstance(data.get("paused"), bool):
                    raise ValueError("paused must be true or false")
                SIMULATOR.set_paused(data["paused"])
                self._send_json({"ok": True, "state": SIMULATOR.snapshot()})
            except (ValueError, json.JSONDecodeError) as error:
                self._send_json({"ok": False, "error": str(error)}, 400)
            return

        if path == "/api/device/trust":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length)
                data = json.loads(body or b"{}")
                SIMULATOR.trust_device(str(data.get("device_id", "")))
                self._send_json({"ok": True, "state": SIMULATOR.snapshot()})
            except (ValueError, json.JSONDecodeError) as error:
                self._send_json({"ok": False, "error": str(error)}, 400)
            return

        if path == "/api/scenario":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length)
                data = json.loads(body or b"{}")
                SIMULATOR.start_scenario(str(data.get("scenario", "normal")))
                self._send_json({"ok": True, "state": SIMULATOR.snapshot()})
            except (ValueError, json.JSONDecodeError) as error:
                self._send_json({"ok": False, "error": str(error)}, 400)
            return

        self._send_json({"error": "Not found"}, 404)

    def _serve_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self._send_json({"error": "File not found"}, 404)
            return
        self._send_bytes(path.read_bytes(), content_type)

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    global SIMULATOR
    parser = argparse.ArgumentParser(description="Local IoT Security Simulator")
    parser.add_argument("--open-browser", action="store_true", help="Open the dashboard on startup")
    args = parser.parse_args()
    SIMULATOR = TrafficSimulator()
    try:
        server = ThreadingHTTPServer((HOST, PORT), RequestHandler)
    except OSError as error:
        print(f"Could not start http://{HOST}:{PORT}: {error}")
        print("If the simulator is already running, use its existing window.")
        raise SystemExit(1) from error
    print(f"IoT Security Simulator running at http://{HOST}:{PORT}")
    print("Keep this terminal open while using the dashboard.")
    print("Press Ctrl+C to stop.")
    if args.open_browser:
        threading.Timer(1, webbrowser.open, args=(f"http://{HOST}:{PORT}/",)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
        SIMULATOR.db.close()


if __name__ == "__main__":
    main()
