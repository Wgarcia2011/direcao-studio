import sys
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import automatic_edit as automatic


class AutomaticEditing(unittest.TestCase):
    def test_duration_presets_and_custom_are_structured_and_validated(self):
        for target in [30, 45, 60, 120, 87.5]:
            options = automatic.validate({'ai': True, 'target_seconds': target},
                {'audio': True, 'duration': 150}, None, False, True, 'Selecione as falas')
            self.assertEqual(options['target_seconds'], target)
        for target in [True, '30', 0, -1, 601, float('nan'), float('inf')]:
            with self.subTest(target=target), self.assertRaises(ValueError):
                automatic.validate({'ai': True, 'target_seconds': target},
                    {'audio': True, 'duration': 150}, None, False, True, 'Selecione as falas')
        with self.assertRaisesRegex(ValueError, 'disponível'):
            automatic.validate({'ai': True, 'target_seconds': 30},
                {'audio': True, 'duration': 20}, None, False, True, 'Selecione as falas')
        with self.assertRaisesRegex(ValueError, 'modo com IA'):
            automatic.validate({'preview': True, 'target_seconds': 30},
                {'audio': True, 'duration': 60}, None, False, True, '')
        with self.assertRaisesRegex(ValueError, 'disponível'):
            automatic.validate({'ai': True, 'target_seconds': 60},
                {'audio': True, 'duration': 150}, {'document': {'clips': [{'in': 0, 'out': 900}]}},
                True, True, 'Selecione as falas')
        for rhythm in ['natural','balanced','agile']:
            self.assertEqual(automatic.validate({'fades':True,'rhythm':rhythm},
                {'audio':True},None,False,False,'')['rhythm'],rhythm)
        for rhythm in ['unknown',False,{'padding':.1}]:
            with self.assertRaises(ValueError):
                automatic.validate({'fades':True,'rhythm':rhythm},{'audio':True},None,False,False,'')

    def test_checks_connection_before_any_work(self):
        with self.assertRaisesRegex(ValueError, 'DeepSeek'):
            automatic.validate({'ai': True, 'cut': True}, {'audio': True}, None, False, False, 'Crie um título')

    def test_preserves_existing_montage_and_checks_input(self):
        for data, timeline in [({'cut': True}, {}), ({'cut': 'true'}, None), ({'unknown': True}, None)]:
            with self.assertRaises(ValueError):
                automatic.validate(data, {'audio': True}, timeline if timeline is None else {'document': {}}, False, True, '')
        with self.assertRaises(ValueError):
            automatic.validate({'captions': True}, {'audio': False}, None, False, False, '')
        with self.assertRaises(ValueError):
            automatic.validate({'preview': True}, {'audio': True}, None, False, False, 'Texto livre')

    def fixture(self):
        order = []
        saved = {'state': None, 'meta': {'audio': True}}
        def initialize(*args):
            order.append('initialize')
            saved['state'] = {'revision': 0, 'base_captions': {'blocks': [1]}, 'document': {'settings': {}}}
        def actions(directory, revision, batch):
            order.append('actions')
            for action in batch:
                if action['type'] == 'settings.set':
                    saved['state']['document']['settings'].update(action['params'])
        edits = SimpleNamespace(get_state=lambda path: saved['state'], initialize=initialize, execute=actions)
        def record(name):
            return lambda *args, **kwargs: order.append(name)
        host = SimpleNamespace(edits=edits, public_project=lambda path: {'captions': {'blocks': []}},
            transcribe=record('transcribe'), cut_silence=record('cut'), apply_join_fades=record('fades'),
            command=Mock(), probe=Mock(), read_json=lambda path: saved['meta'],
            render=record('preview'), director=SimpleNamespace(plan=Mock(return_value=(
                [{'type': 'settings.set', 'params': {'title': 'Título'}}], 'Título criado'))))
        edits.materialize=record('materialize')
        return order, host

    def test_pipeline_orders_local_ai_and_preview(self):
        order, host = self.fixture()
        options = {key: True for key in automatic.FLAGS}
        result = automatic.execute(Path('.'), {'audio': True}, options, {'engine': 'remotion'},
            'Crie um título', lambda *args: None, lambda: False, host)
        self.assertEqual(order, ['transcribe', 'cut', 'initialize', 'actions', 'actions', 'fades', 'materialize', 'preview'])
        self.assertIn('Título criado', result)
        self.assertIn('Amostra', result)

    def test_cancellation_stops_before_next_operation(self):
        order, host = self.fixture()
        with self.assertRaisesRegex(ValueError, 'interrompida'):
            automatic.execute(Path('.'), {'audio': True}, {key: True for key in automatic.FLAGS}, {},
                'Pedido', lambda *args: None, lambda: bool(order), host)
        self.assertEqual(order, ['transcribe'])
        host.director.plan.assert_not_called()


if __name__ == '__main__':
    unittest.main()
