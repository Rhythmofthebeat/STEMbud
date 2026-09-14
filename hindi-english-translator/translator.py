"""Local bilingual inference. Heavy dependencies load only on first request."""
import runtime
from compact import CompactTranslator, speak_local
from dataclasses import dataclass
from threading import Lock
import os
from backends import ASRBackends, BACKENDS

LANGUAGES = {"Hindi": "hin", "English": "eng"}
MODEL_ID = "facebook/seamless-m4t-v2-large"


def validate_request(source, target, text=None, audio_path=None):
    if source not in LANGUAGES or target not in LANGUAGES:
        raise ValueError("Choose Hindi or English.")
    if source == target:
        raise ValueError("Source and target languages must differ.")
    if bool(text and text.strip()) == bool(audio_path):
        raise ValueError("Provide either text or an audio recording.")
    if text and len(text.strip()) > 1000:
        raise ValueError("Please keep text under 1,000 characters.")


@dataclass
class Translation:
    text: str
    audio: object = None
    transcript: str = ""


class Translator:
    def __init__(self):
        self.processor = self.model = None
        self.lock = Lock()
        self.asr = ASRBackends()
        self.compact = CompactTranslator()

    def _load(self):
        if self.model is not None:
            return
        import torch
        from transformers import AutoProcessor, SeamlessM4Tv2Model
        self.device = os.getenv("TRANSLATOR_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        model = SeamlessM4Tv2Model.from_pretrained(MODEL_ID).to(self.device).eval()
        self.processor, self.model = processor, model

    def translate(self, source, target, text=None, audio_path=None, speak=False, backend="SpeechBrain"):
        validate_request(source, target, text, audio_path)
        if backend not in BACKENDS:
            raise ValueError("Unknown speech backend.")
        # Serialize loading and generation to avoid concurrent memory spikes.
        with self.lock:
            audio = None
            if audio_path:
                import numpy as np
                import soundfile as sf
                from scipy.signal import resample_poly
                from math import gcd
                with sf.SoundFile(audio_path) as f:
                    if len(f) == 0 or len(f) / f.samplerate > 30:
                        raise ValueError("Audio must be between 0 and 30 seconds long.")
                    rate = f.samplerate
                    audio = f.read(dtype="float32", always_2d=True).mean(axis=1)
                if not np.isfinite(audio).all() or np.max(np.abs(audio)) < 1e-5:
                    raise ValueError("The recording is silent or invalid.")
                divisor = gcd(rate, 16000)
                audio = resample_poly(audio, 16000 // divisor, rate // divisor)
            transcript = ""
            if audio is not None and backend != "SeamlessM4T":
                transcript = self.asr.transcribe(backend, source, audio)
                validate_request(source, target, text=transcript)
                text, audio = transcript, None
            if backend != "SeamlessM4T":
                translated = self.compact.translate(text.strip(), target)
                spoken = speak_local(translated, target) if speak else None
                return Translation(translated, spoken, transcript)
            import shutil
            if shutil.disk_usage(runtime.ROOT).free < 12 * 1024**3 and self.model is None:
                raise ValueError("SeamlessM4T needs more disk space. Select SpeechBrain or ESPnet for the compact pipeline.")
            self._load()
            import torch
            if audio is not None:
                inputs = self.processor(audios=audio, sampling_rate=16000, return_tensors="pt")
            else:
                inputs = self.processor(text=text.strip(), src_lang=LANGUAGES[source], return_tensors="pt")
            inputs = inputs.to(self.device)
            with torch.inference_mode():
                tokens = self.model.generate(**inputs, tgt_lang=LANGUAGES[target], generate_speech=False)
                translated = self.processor.decode(tokens[0].tolist(), skip_special_tokens=True)
                spoken = None
                if speak:
                    # Speak the displayed translation, so playback matches the text.
                    speech_inputs = self.processor(text=translated, src_lang=LANGUAGES[target], return_tensors="pt").to(self.device)
                    waveform = self.model.generate(**speech_inputs, tgt_lang=LANGUAGES[target])[0]
                    spoken = (self.model.config.sampling_rate, waveform.cpu().numpy().reshape(-1))
            return Translation(translated, spoken, transcript)
