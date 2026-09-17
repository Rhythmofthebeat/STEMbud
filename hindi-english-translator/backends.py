"""Optional ASR adapters; checkpoint languages must match configuration."""
import runtime
import hashlib
import os
from pathlib import Path
from tempfile import TemporaryDirectory

BACKENDS = ["SeamlessM4T", "ESPnet", "SpeechBrain"]


class BackendError(ValueError):
    pass


class ASRBackends:
    def __init__(self):
        self.models = {}

    def transcribe(self, backend, source, audio):
        if backend not in BACKENDS[1:]:
            raise BackendError("Choose ESPnet or SpeechBrain for ASR.")
        suffix = {"Hindi": "HI", "English": "EN"}[source]
        prefix = "ESPNET" if backend == "ESPnet" else "SPEECHBRAIN"
        variable = f"{prefix}_MODEL_{suffix}"
        checkpoint = os.getenv(variable, "").strip()
        if not checkpoint:
            return self._compact_transcribe(backend, source, audio)
        device = os.getenv("ASR_DEVICE", "cpu")
        key = (backend, checkpoint, device)
        try:
            if key not in self.models:
                if backend == "ESPnet":
                    from espnet2.bin.asr_inference import Speech2Text
                    model = Speech2Text.from_pretrained(model_tag=checkpoint, device=device)
                else:
                    from speechbrain.inference.ASR import EncoderDecoderASR
                    cache = Path(os.getenv("ASR_CACHE_DIR", ".cache/asr"))
                    savedir = str(cache / hashlib.sha256(checkpoint.encode()).hexdigest()[:16])
                    model = EncoderDecoderASR.from_hparams(source=checkpoint, savedir=savedir,
                                                          run_opts={"device": device})
                self.models[key] = model
        except ImportError as exc:
            raise BackendError(f"Install requirements-{prefix.lower()}.txt in this environment. Missing dependency: {exc.name}") from exc
        model = self.models[key]
        if backend == "ESPnet":
            hypotheses = model(audio)
            transcript = hypotheses[0][0] if hypotheses else None
        else:
            import soundfile as sf
            with TemporaryDirectory(prefix="boli-asr-") as directory:
                path = str(Path(directory) / "input.wav")
                sf.write(path, audio, 16000)
                transcript = model.transcribe_file(path)
        if not isinstance(transcript, str) or not transcript.strip():
            raise BackendError(f"{backend} returned no transcript. Check checkpoint/tokenizer compatibility and recording quality.")
        return transcript.strip()

    def _compact_transcribe(self, backend, source, audio):
        device = os.getenv("ASR_DEVICE", "cpu")
        key = (backend, "compact", source, device)
        if key not in self.models:
            # Do not retain a second copy of the same large recognizer when
            # switching languages. Translator serializes these requests.
            for cached in list(self.models):
                if cached[:2] == (backend, "compact"):
                    del self.models[cached]
            if backend == "ESPnet":
                from espnet2.bin.s2t_inference import Speech2Text
                self.models[key] = Speech2Text.from_pretrained(
                    model_tag="espnet/owsm_v3.1_ebf_base", device=device,
                    lang_sym="<hin>" if source == "Hindi" else "<eng>",
                    task_sym="<asr>", beam_size=1, maxlenratio=0.0)
            else:
                from speechbrain.inference.ASR import WhisperASR
                self.models[key] = WhisperASR.from_hparams(
                    source=str(runtime.ROOT / "configs"),
                    savedir=str(runtime.ROOT / ".cache" / ("speechbrain-" + source)),
                    overrides={"language": source.lower()},
                    run_opts={"device": device})
        model = self.models[key]
        if backend == "ESPnet":
            result = model(audio)
            text = result[0][3] if result else ""
        else:
            import torch
            with torch.inference_mode():
                result = model.transcribe_batch(torch.from_numpy(audio).unsqueeze(0), torch.ones(1))
            text = result[0][0]
        if not isinstance(text, str) or not text.strip():
            raise BackendError(f"{backend} returned no recognized words. Try a clearer recording.")
        if source == "Hindi" and not any("\u0900" <= char <= "\u097f" for char in text):
            raise BackendError("The recognizer did not return Hindi text. Try ESPnet or a clearer recording; no translation was generated.")
        return text.strip()
