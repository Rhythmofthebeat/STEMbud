import tempfile
import unittest
from pathlib import Path
import pandas as pd
from ml_workbench.core import load_data, train, predict

class WorkbenchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.csv = self.root / 'data.csv'
        pd.DataFrame({'text': [f'algebra equation variable lesson {word}' for word in ['one','two','three','four','five','six','seven','eight']] + [f'biology cell organism lesson {word}' for word in ['one','two','three','four','five','six','seven','eight']], 'label': ['math']*8 + ['biology']*8}).to_csv(self.csv, index=False)
    def tearDown(self):
        self.temp.cleanup()
    def test_roundtrip_and_holdout(self):
        report = train(self.csv, self.root / 'model')
        self.assertEqual(report['train_rows'] + report['test_rows'], 16)
        self.assertEqual(predict(self.root / 'model', 'algebra variable equation')['label'], 'math')
        self.assertEqual(predict(self.root / 'model', 'biology organism cell')['label'], 'biology')
        self.assertIsNone(predict(self.root / 'model', 'xyzzy')['label'])
    def test_duplicates_not_leaked(self):
        frame = pd.read_csv(self.csv)
        pd.concat([frame, frame]).to_csv(self.csv, index=False)
        self.assertEqual(len(load_data(self.csv)), 16)
    def test_conflicting_labels_rejected(self):
        frame = pd.read_csv(self.csv)
        duplicate = frame.iloc[[0]].copy()
        duplicate['label'] = 'biology'
        pd.concat([frame, duplicate]).to_csv(self.csv, index=False)
        with self.assertRaisesRegex(ValueError, 'conflicting'):
            load_data(self.csv)
    def test_empty_values_rejected(self):
        self.csv.write_text('text,label\n,math\n')
        with self.assertRaises(ValueError):
            load_data(self.csv)
