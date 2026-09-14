# Boli · Hindi ↔ English

A local text and short-clip speech translator with real SpeechBrain and ESPnet inference paths.

## Install and run from GitHub

Install Python 3.11 and Git first. On macOS, install Command Line Tools (`xcode-select --install`) if needed. On Ubuntu, install `build-essential`, `libsndfile1`, `python3.11-dev`, and `python3.11-venv` before setup.

```bash
git clone https://github.com/Rhythmofthebeat/STEMbud.git
cd STEMbud/hindi-english-translator
./setup.sh
./run.sh
```

Open http://127.0.0.1:7860. Choose Text or Speech, choose the languages, then Translate. Speech accepts microphone recordings and uploads up to 30 seconds. First use downloads model files; allow several GB of disk space. No API key is required. Inference runs on the machine hosting the app.

GitHub stores this program; GitHub Pages cannot run its Python models. These commands run it locally on macOS or Linux. Spoken output uses macOS voices and must be unchecked on Linux. Native Windows installation has not been tested.

## What runs

- **SpeechBrain:** `WhisperASR`, using multilingual `openai/whisper-small` through the local `configs/hyperparams.yaml`. This is a small multilingual model, not a Hindi-fine-tuned checkpoint.
- **ESPnet:** `espnet/owsm_v3.1_ebf_base`, using ESPnet's s2t API and the chosen source language.
- **Translation:** `Helsinki-NLP/opus-mt-en-hi` and `Helsinki-NLP/opus-mt-hi-en` through Transformers/Marian. Text mode uses these independently of the selected speech recognizer.
- **Spoken output:** installed macOS voices; Lekha and Samantha are preferred for Hindi and English.
- **Optional large pipeline:** selecting SeamlessM4T uses `facebook/seamless-m4t-v2-large`. It needs substantially more RAM/disk and is guarded when free disk is below 12 GiB. The compact pipeline is the default.

Recognition produces the visible source transcript, then Marian translates it. Compact models can make mistakes, especially with Hindi, names, noisy audio and code-switching. Review outputs. This is short-clip translation, not streaming interpretation.

## Fresh installation

Python 3.11 is required for the tested environment:

```bash
python3.11 -m venv .venv
CPLUS_INCLUDE_PATH=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/c++/v1 .venv/bin/python -m pip install --no-cache-dir -r requirements.txt
./run.sh
```

The macOS header path fixes pyworld compilation on this machine. On Linux omit that prefix and disable spoken output. Keep several GB free for installation and model downloads. Model caches are excluded from Git. Only the most recently used language model is retained for each compact recognizer. Internet is needed for installation and first model download, not ongoing inference with cached models.

## Optional custom recognition checkpoints

Export `ESPNET_MODEL_HI` / `ESPNET_MODEL_EN` to use checkpoints compatible with `espnet2.bin.asr_inference.Speech2Text`. Export `SPEECHBRAIN_MODEL_HI` / `SPEECHBRAIN_MODEL_EN` for `EncoderDecoderASR` checkpoints. Unset variables use the working compact defaults above. Arbitrary architectures are not interchangeable. `.env.example` is informational, not automatically loaded. `ASR_DEVICE` defaults to CPU.

## Checks

```bash
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python smoke_test.py
```

The smoke test generates synthetic Hindi/English audio with macOS voices and exercises both recognizers and translation directions. Results are recorded incrementally in `.cache/smoke/results.json`, with a completion flag, input references, transcript comparisons, and explicit failures for empty, wrong-script Hindi, or repetitive output. Both output voices are exercised. Transcription differences are reported separately from inference success. A smoke test is not a quality benchmark. Gradio uploads can remain in its temporary cache. Learned/downloaded model licenses differ: OWSM is CC-BY-4.0 and optional SeamlessM4T weights are noncommercial; review model cards before redistribution.

Sources: [OWSM base](https://huggingface.co/espnet/owsm_v3.1_ebf_base), [SpeechBrain](https://speechbrain.readthedocs.io/en/v1.0.3/API/speechbrain.inference.ASR.html), [Whisper small](https://huggingface.co/openai/whisper-small), [English–Hindi](https://huggingface.co/Helsinki-NLP/opus-mt-en-hi), [Hindi–English](https://huggingface.co/Helsinki-NLP/opus-mt-hi-en).

## Offline use

Once the selected models have downloaded, start without network checks:

```bash
HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 ./run.sh
```

SpeechBrain uses roughly 1 GB of downloaded weights for Whisper small. Tiny and base were rejected during verification because they returned English or Urdu script for the Hindi test recording. Both toolkits perform speech recognition: they turn recorded words into a transcript. Marian translates that transcript; the Mac's installed voice reads the translated text.

## Technical glossary

The speech pipeline is: **audio → ESPnet or SpeechBrain → transcript → Marian translation → optional spoken output**. Text input skips recognition. The backend selector chooses one recognizer per request; it does not combine the models.

| Term | Meaning in Boli |
| --- | --- |
| ASR (automatic speech recognition) | Turning audio into written words in the source language. |
| ESPnet | Speech-processing toolkit that runs the OWSM recognizer here. |
| SpeechBrain | Speech-processing toolkit that runs WhisperASR here. |
| Checkpoint / weights | Downloaded parameters of an already trained model. |
| Inference | Running a trained model on a new recording or text. |
| Fine-tuning | Further training on a specialized dataset. This app does not train or fine-tune models. |
| Encoder–decoder | The encoder represents the input; the decoder predicts output tokens. |
| Token | A text unit, such as a word fragment, predicted by the model. |
| Greedy decoding | Choosing the highest-scoring next token at each step. |
| Beam search | Comparing several candidate token sequences during decoding. |
| Resampling / mono | Converting recordings to 16,000 samples per second and one audio channel. |
| NMT (neural machine translation) | Marian converts the recognized text between Hindi and English. |
| TTS (text-to-speech) | The installed macOS voice reads the translated text. |
| WER (word error rate) | Recognition errors relative to a reference transcript; not measured as a benchmark here. |
| Gradio | The Python library providing the browser interface. |

This project integrates pretrained models with Python, PyTorch, and Transformers. It is a cascaded speech-translation application, with separate recognition and translation stages.
