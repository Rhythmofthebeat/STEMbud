import unittest
from smoke_test import check_text


class SmokeCheckTests(unittest.TestCase):
    def test_wrong_script_and_repetitions_fail(self):
        for text in ['', 'Namaste, how are you?', 'نمستی آپ کیسے ہیں']:
            with self.assertRaises(AssertionError):
                check_text(text, 'Hindi')
        with self.assertRaises(AssertionError):
            check_text('No no no no no no no no no', 'English')

    def test_bilingual_outputs_pass(self):
        check_text('नमस्ते, आप कैसे हैं?', 'Hindi')
        check_text('Hello, how are you?', 'English')
