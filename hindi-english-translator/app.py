"""Run with python app.py; open http://127.0.0.1:7860."""
import runtime
import logging
import gradio as gr
from translator import Translator
from backends import BACKENDS

engine = Translator()


def translate(source, target, mode, text, audio, speak, backend):
    try:
        result = engine.translate(source, target, text=text if mode == "Text" else None,
                                  audio_path=audio if mode == "Speech" else None, speak=speak, backend=backend)
        method = backend if mode == "Speech" or backend == "SeamlessM4T" else "Marian text translation"
        return result.text, result.audio, result.transcript, f"Translation complete · {method}."
    except ValueError as exc:
        return "", None, "", str(exc)
    except Exception:
        logging.exception("Translation failed")
        return "", None, "", "Translation failed. Check the terminal for details, model download access, and available memory."


with gr.Blocks(title="Boli · Hindi ↔ English", theme=gr.themes.Soft(primary_hue="teal")) as demo:
    gr.Markdown("# Boli / बोली\n### A little less distance. A little more understanding.\nTranslate Hindi and English text or short recordings on your own machine.")
    with gr.Row():
        source = gr.Dropdown(["Hindi", "English"], value="Hindi", label="From")
        swap = gr.Button("⇄ Swap", scale=0)
        target = gr.Dropdown(["Hindi", "English"], value="English", label="To")
    swap.click(lambda s, t: (t, s), [source, target], [source, target])
    with gr.Row():
        with gr.Column():
            backend = gr.Dropdown(BACKENDS, value="SpeechBrain", label="Speech backend", info="ESPnet / SpeechBrain recognize speech; compact Marian models translate text.")
            mode = gr.Radio(["Text", "Speech"], value="Text", label="Input")
            text = gr.Textbox(label="Your words", placeholder="नमस्ते, आप कैसे हैं?", lines=6, max_length=1000)
            audio = gr.Audio(sources=["upload", "microphone"], type="filepath", format="wav", label="Record or upload • up to 30 seconds", visible=False)
            mode.change(lambda m: (gr.update(visible=m == "Text"), gr.update(visible=m == "Speech")), mode, [text, audio])
            speak = gr.Checkbox(label="Generate spoken translation", value=False)
            run = gr.Button("Translate →", variant="primary")
        with gr.Column():
            output = gr.Textbox(label="Translation", lines=6, interactive=False, show_copy_button=True)
            transcript = gr.Textbox(label="Recognized speech · ESPnet / SpeechBrain", interactive=False)
            playback = gr.Audio(label="Listen to translation", interactive=False)
            status = gr.Textbox(label="Status", value="Ready. The model downloads on your first translation.", interactive=False)
    run.click(translate, [source, target, mode, text, audio, speak, backend], [output, playback, transcript, status], concurrency_limit=1)
    gr.Examples([["Hindi", "English", "Text", "नमस्ते, आप कैसे हैं?"], ["English", "Hindi", "Text", "Could you please help me find the train station?"]], [source, target, mode, text])
    gr.Markdown("**Local speech recognition and translation**\n\nSpeechBrain uses Whisper small; ESPnet uses OWSM base. First use downloads model files; CPU inference can take a while. Check the recognized words, especially for Hindi or noisy recordings. To correct a transcript, copy it into Text input and translate again. This app translates clips up to 30 seconds. SeamlessM4T is an optional larger model.")

if __name__ == "__main__":
    demo.queue(max_size=4).launch(server_name="127.0.0.1", server_port=7860, share=False)
