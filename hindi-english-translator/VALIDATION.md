# Verification — 2026-09-14

- 12 regression tests passed.
- Six real-model execution checks completed: text in both directions and both speech backends in both directions. Spoken output was generated for both target languages.
- SpeechBrain/Whisper small exactly transcribed both synthetic greeting recordings. Hindi: `नमस्ते, आप कैसे हैं?` → `Hello, how are you?`.
- ESPnet/OWSM base executed successfully but was less accurate: English `Hallo, how are you?`; Hindi `नमस्ते आप्क्या से हैं` → `Hello you're from what?`. Review its transcript before relying on its translation.
- Browser verification confirmed text translation in both directions, audio output, and an ESPnet audio upload/translation. No browser JavaScript errors were reported.

These are short synthetic recordings, not a real-world accuracy benchmark. A smoke-test pass means the pipeline executed and passed basic output checks, not that every word was correct. SpeechBrain is the default backend. Optional SeamlessM4T and a fresh Linux installation were not tested in this verification.

Run from this directory:

```bash
.venv/bin/python -m unittest discover -s tests -v
HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .venv/bin/python smoke_test.py
```

The smoke test needs installed macOS Hindi/English voices. Omit the offline variables on first use to allow downloads.
