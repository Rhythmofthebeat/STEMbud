"""Small bilingual Marian models and optional local macOS speech synthesis."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys

MODELS = {'Hindi': 'Helsinki-NLP/opus-mt-en-hi', 'English': 'Helsinki-NLP/opus-mt-hi-en'}

class CompactTranslator:
    def __init__(self):
        self.models = {}

    def translate(self, text, target):
        import torch
        from transformers import MarianMTModel, MarianTokenizer
        if target not in self.models:
            identifier = MODELS[target]
            self.models[target] = (MarianTokenizer.from_pretrained(identifier), MarianMTModel.from_pretrained(identifier, use_safetensors=False).eval())
        tokenizer, model = self.models[target]
        inputs = tokenizer(text, return_tensors='pt')
        if inputs.input_ids.shape[1] > 512:
            raise ValueError('This text is too long for the compact model; use a shorter passage.')
        with torch.inference_mode():
            tokens = model.generate(**inputs, max_new_tokens=256, num_beams=4, no_repeat_ngram_size=3)
        return tokenizer.decode(tokens[0], skip_special_tokens=True)


def speak_local(text, language):
    if sys.platform != 'darwin':
        raise ValueError('Local voice output currently requires macOS. Turn off spoken output on other platforms.')
    voices = subprocess.check_output(['say', '-v', '?'], text=True)
    locale = 'hi_IN' if language == 'Hindi' else 'en_US'
    voice = next((line.split(locale)[0].strip() for line in voices.splitlines() if locale in line), None)
    preferred = 'Lekha' if language == 'Hindi' else 'Samantha'
    if any(line.split(locale)[0].strip() == preferred for line in voices.splitlines() if locale in line):
        voice = preferred
    if not voice:
        raise ValueError(f'Install a {language} voice in macOS Accessibility → Spoken Content, or turn off spoken output.')
    import soundfile as sf
    with TemporaryDirectory(prefix='boli-voice-') as directory:
        output = str(Path(directory) / 'speech.aiff')
        subprocess.run(['say', '-v', voice, '-o', output, '--', text], check=True, timeout=90)
        audio, rate = sf.read(output, dtype='float32')
        return rate, audio
