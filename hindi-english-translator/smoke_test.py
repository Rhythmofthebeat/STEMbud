"""Exercise real models and synthesized audio; report quality separately from execution."""
import runtime
import json
import re
import torch
import soundfile as sf
from datetime import datetime, timezone
from translator import Translator
from compact import speak_local


def check_text(text, language):
    if not text.strip():
        raise AssertionError('Empty output')
    if language == 'Hindi' and not any('\u0900' <= c <= '\u097f' for c in text):
        raise AssertionError('Hindi output is not in Devanagari')
    words = text.lower().split()
    if any(words[i:i + 3] == words[i + 3:i + 6] == words[i + 6:i + 9]
           for i in range(max(0, len(words) - 8))):
        raise AssertionError('Repetitive output')


def normalized(text):
    return re.sub(r'[^\w\s\u0900-\u097f]', '', text.lower()).split()


def main():
    torch.set_num_threads(4)
    root = runtime.ROOT / '.cache' / 'smoke'
    root.mkdir(parents=True, exist_ok=True)
    engine = Translator()
    report = {'started_at': datetime.now(timezone.utc).isoformat(), 'complete': False,
              'note': 'Synthetic voices, not a real-world accuracy benchmark.', 'results': []}

    def save():
        (root / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))

    save()  # An interrupted test must not leave an older success report in place.
    for source, target, phrase in [('English', 'Hindi', 'Hello, how are you?'),
                                   ('Hindi', 'English', 'नमस्ते, आप कैसे हैं?')]:
        path = root / (source + '.wav')
        for backend in [None, 'SpeechBrain', 'ESPnet']:
            row = {'mode': 'speech' if backend else 'text', 'source': source,
                   'target': target, 'reference': phrase, 'backend': backend}
            try:
                if backend:
                    if not path.exists():
                        rate, audio = speak_local(phrase, source)
                        sf.write(path, audio, rate)
                    result = engine.translate(source, target, audio_path=str(path), backend=backend)
                    check_text(result.transcript, source)
                    row['transcript'] = result.transcript
                    row['transcript_matches_reference'] = normalized(result.transcript) == normalized(phrase)
                else:
                    result = engine.translate(source, target, text=phrase, speak=True)
                    rate, audio = result.audio
                    if rate <= 0 or len(audio) == 0:
                        raise AssertionError('Spoken output is empty')
                    sf.write(root / (target + '-output.wav'), audio, rate)
                row['translation'] = result.text
                check_text(result.text, target)
                row['passed'] = True
            except Exception as exc:
                row.update(passed=False, error=str(exc))
            report['results'].append(row)
            print(json.dumps(row, ensure_ascii=False), flush=True)
            save()
    report['complete'] = True
    report['passed'] = all(row['passed'] for row in report['results'])
    save()
    if not report['passed']:
        raise SystemExit('Inference checks failed; see .cache/smoke/results.json')


if __name__ == '__main__':
    main()
