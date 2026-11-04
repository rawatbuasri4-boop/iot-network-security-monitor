"""Behavior checks using isolated databases and a temporary loopback server."""
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import iot_security_simulator as app


class SimulatorFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db_patch = patch.object(app, 'DB_PATH', Path(self.temp.name) / 'test.db')
        self.db_patch.start()
        self.sim = app.TrafficSimulator()

    def tearDown(self):
        self.sim.db.close()
        self.db_patch.stop()
        self.temp.cleanup()

class SimulatorTests(SimulatorFixture):
    def test_refresh_is_throttled_and_pause_stops_generation(self):
        count = self.sim.snapshot()['stats']['events']
        self.assertGreater(count, 0)
        for _ in range(10):
            self.assertEqual(self.sim.snapshot()['stats']['events'], count)
        self.sim.set_paused(True)
        self.sim.last_tick = float('-inf')
        self.assertEqual(self.sim.snapshot()['stats']['events'], count)

    def test_unknown_device_detection_and_approval_keep_history(self):
        self.sim.start_scenario('new_device')
        self.assertFalse(self.sim.devices['unknown-01']['known'])
        self.assertTrue(any(a['alert_type'] == 'unknown_device' for a in self.sim.alerts))
        count = len(self.sim.alerts)
        self.sim.trust_device('unknown-01')
        self.assertTrue(self.sim.devices['unknown-01']['trusted'])
        self.assertEqual(len(self.sim.alerts), count)

    def test_port_scan_detection(self):
        self.sim.start_scenario('port_scan')
        self.assertTrue(any(a['alert_type'] == 'port_scan_pattern' for a in self.sim.alerts))

    def test_trusting_device_keeps_burst_warning_until_window_expires(self):
        self.sim.start_scenario('traffic_burst')
        self.assertTrue(any(a['alert_type'] == 'traffic_burst' for a in self.sim.alerts))
        self.sim.trust_device('smartplug-01')
        self.assertEqual(self.sim.devices['smartplug-01']['status'], 'warning')
        future = time.time() + 30
        with patch.object(app.time, 'time', return_value=future):
            self.sim.last_tick = float('-inf')
            self.sim.snapshot()
        self.assertEqual(self.sim.devices['smartplug-01']['status'], 'normal')

    def test_records_are_written_to_sqlite_and_reset(self):
        self.sim.start_scenario('new_device')
        self.assertGreater(self.sim.db.execute('SELECT COUNT(*) FROM events').fetchone()[0], 0)
        self.assertGreater(self.sim.db.execute('SELECT COUNT(*) FROM alerts').fetchone()[0], 0)
        self.sim.reset()
        self.assertEqual(len(self.sim.devices), 3)
        self.assertEqual(len(self.sim.alerts), 0)
        self.assertEqual(self.sim.db.execute('SELECT COUNT(*) FROM alerts').fetchone()[0], 0)

    def test_invalid_scenario_and_unknown_device_are_rejected(self):
        with self.assertRaises(ValueError):
            self.sim.start_scenario('invalid')
        with self.assertRaises(ValueError):
            self.sim.trust_device('missing')


class ApiTests(SimulatorFixture):
    def setUp(self):
        super().setUp()
        app.SIMULATOR = self.sim
        self.server = app.ThreadingHTTPServer(('127.0.0.1', 0), app.RequestHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        super().tearDown()

    def request(self, path, data=None):
        payload = None if data is None else json.dumps(data).encode()
        req = Request(self.base + path, data=payload, headers={'Content-Type': 'application/json'})
        with urlopen(req, timeout=3) as response:
            return json.load(response)

    def test_api_scenario_trust_pause_and_reset(self):
        self.assertEqual(self.request('/api/state')['stats']['devices'], 3)
        state = self.request('/api/scenario', {'scenario': 'new_device'})['state']
        self.assertTrue(any(a['alert_type'] == 'unknown_device' for a in state['alerts']))
        self.assertTrue(self.request('/api/device/trust', {'device_id': 'unknown-01'})['ok'])
        self.assertTrue(self.request('/api/pause', {'paused': True})['state']['paused'])
        self.assertTrue(self.request('/api/reset', {})['ok'])

    def test_api_invalid_pause_and_missing_route(self):
        for path, data, expected in [('/api/pause', {'paused': 'yes'}, 400), ('/missing', None, 404)]:
            with self.assertRaises(HTTPError) as error:
                self.request(path, data)
            self.assertEqual(error.exception.code, expected)


if __name__ == '__main__':
    unittest.main()
