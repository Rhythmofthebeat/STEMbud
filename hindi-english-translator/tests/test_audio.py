"""Regression checks for audio rejection and failed recognition."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
import soundfile as sf
from backends import BackendError
from translator import Translator


class AudioTests(unittest.TestCase):
    def test_invalid_audio_never_reaches_models(self):
        with tempfile.TemporaryDirectory() as directory:
            for name, audio in [('silent', np.zeros(1600)), ('empty', np.array([])),
                                ('too-long', np.ones(16000 * 31))]:
                path = str(Path(directory) / (name + '.wav'))
                sf.write(path, audio, 16000)
                engine = Translator()
                with patch.object(engine.asr, 'transcribe') as recognize:
                    with self.assertRaises(ValueError):
                        engine.translate('Hindi', 'English', audio_path=path)
                    recognize.assert_not_called()

    def test_rejected_transcript_is_not_translated(self):
        with tempfile.TemporaryDirectory() as directory:
            path = str(Path(directory) / 'speech.wav')
            sf.write(path, np.ones(1600) * 0.1, 16000)
            engine = Translator()
            with patch.object(engine.asr, 'transcribe', side_effect=BackendError('Invalid Hindi transcript')):
                with patch.object(engine.compact, 'translate') as translate:
                    with self.assertRaises(BackendError):
                        engine.translate('Hindi', 'English', audio_path=path)
                    translate.assert_not_called()
