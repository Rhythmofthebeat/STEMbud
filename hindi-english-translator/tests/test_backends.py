import os
import sys
import types
import unittest
from unittest.mock import Mock, patch
from backends import ASRBackends, BackendError
from translator import Translator


class BackendTests(unittest.TestCase):
    def test_default_checkpoint_routes_to_compact(self):
        backend = ASRBackends()
        with patch.dict(os.environ, {}, clear=True), patch.object(backend, '_compact_transcribe', return_value='hello') as compact:
            self.assertEqual(backend.transcribe('SpeechBrain', 'English', [0.1]), 'hello')
            compact.assert_called_once_with('SpeechBrain', 'English', [0.1])

    def test_espnet_load_and_cache(self):
        model = Mock(return_value=[("नमस्ते", [], [], None)])
        factory = Mock(return_value=model)
        module = types.ModuleType("espnet2.bin.asr_inference")
        module.Speech2Text = types.SimpleNamespace(from_pretrained=factory)
        with patch.dict(sys.modules, {"espnet2.bin.asr_inference": module}), patch.dict(os.environ, {"ESPNET_MODEL_HI": "test-hi", "ASR_DEVICE": "cpu"}):
            backend = ASRBackends()
            for _ in range(2):
                self.assertEqual(backend.transcribe("ESPnet", "Hindi", [0.1]), "नमस्ते")
            factory.assert_called_once_with(model_tag="test-hi", device="cpu")

    def test_speechbrain_file_cleanup(self):
        model = Mock()
        paths = []
        def transcribe(path):
            paths.append(path)
            return "hello"
        model.transcribe_file.side_effect = transcribe
        module = types.ModuleType("speechbrain.inference.ASR")
        factory = Mock(return_value=model)
        module.EncoderDecoderASR = types.SimpleNamespace(from_hparams=factory)
        soundfile = types.ModuleType("soundfile")
        soundfile.write = Mock()
        with patch.dict(sys.modules, {"speechbrain.inference.ASR": module, "soundfile": soundfile}), patch.dict(os.environ, {"SPEECHBRAIN_MODEL_EN": "test-en"}):
            self.assertEqual(ASRBackends().transcribe("SpeechBrain", "English", [0.1]), "hello")
        self.assertFalse(os.path.exists(os.path.dirname(paths[0])))
        self.assertEqual(factory.call_args.kwargs["source"], "test-en")
        self.assertEqual(soundfile.write.call_args.args[2], 16000)

    def test_compact_text_translation(self):
        for backend in ['ESPnet', 'SpeechBrain']:
            engine = Translator()
            with patch.object(engine.compact, 'translate', return_value='hello'):
                self.assertEqual(engine.translate('Hindi', 'English', text='नमस्ते', backend=backend).text, 'hello')
        with self.assertRaises(ValueError):
            Translator().translate('Hindi', 'English', text='नमस्ते', backend='unknown')

    def test_empty_recognition(self):
        backend = ASRBackends()
        backend.models[("ESPnet", "test", "cpu")] = Mock(return_value=[])
        with patch.dict(os.environ, {"ESPNET_MODEL_EN": "test", "ASR_DEVICE": "cpu"}):
            with self.assertRaisesRegex(BackendError, "no transcript"):
                backend.transcribe("ESPnet", "English", [0.1])
