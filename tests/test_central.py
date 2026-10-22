import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('central', ROOT / 'scripts/central_server.py')
central = importlib.util.module_from_spec(spec)
spec.loader.exec_module(central)


class CentralTests(unittest.TestCase):
    def test_catalog_has_unique_templates_and_no_private_values(self):
        raw = (ROOT / 'central/catalog.json').read_text(encoding='utf-8')
        data = json.loads(raw)
        self.assertEqual(len(data), 49)
        self.assertEqual(len({x['id'] for x in data}), 49)
        self.assertNotIn('wagnergarcia2011', raw)
        self.assertNotIn('D:\\Wagner', raw)
        self.assertTrue(all(x['prompt'] and x['title'] for x in data))

    def test_static_files_never_expose_settings_or_skills(self):
        self.assertNotIn('config.local.json', central.PUBLIC)
        self.assertNotIn('../config.local.json', central.PUBLIC)
        self.assertTrue(all(not path.startswith('/') and '..' not in path for path in central.PUBLIC))

    def test_reject_dns_rebinding_and_remote_hosts(self):
        self.assertTrue(central.allowed_host('127.0.0.1:8790', 8790))
        self.assertFalse(central.allowed_host('attacker.example:8790', 8790))
        self.assertFalse(central.allowed_host('127.0.0.1:8791', 8790))


if __name__ == '__main__':
    unittest.main()
