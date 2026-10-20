import io
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import soundfile as sf

MODEL_ID = "small-sfx"
MODEL = None
MODEL_LOCK = threading.Lock()


def load_model():
    global MODEL
    if MODEL is None:
        from stable_audio_3 import StableAudioModel

        MODEL = StableAudioModel.from_pretrained(MODEL_ID, device="cpu")
    return MODEL


class Handler(BaseHTTPRequestHandler):
    server_version = "RESONA-SFX/0.1"

    def log_message(self, _format, *_args):
        # Do not log user prompts or generated audio metadata.
        return

    def send_json(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"code": "NOT_FOUND"})
            return
        self.send_json(200, {"ok": True, "model": MODEL_ID, "loaded": MODEL is not None})

    def do_POST(self):
        if self.path != "/v1/generate":
            self.send_json(404, {"code": "NOT_FOUND"})
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            if length < 1 or length > 16_384:
                self.send_json(413, {"code": "INVALID_REQUEST_SIZE"})
                return
            payload = json.loads(self.rfile.read(length))
            prompt = payload.get("prompt")
            duration = payload.get("durationSeconds")
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1_000:
                self.send_json(400, {"code": "INVALID_PROMPT"})
                return
            if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not 1 <= duration <= 30:
                self.send_json(400, {"code": "INVALID_DURATION"})
                return

            with MODEL_LOCK:
                model = load_model()
                generated = model.generate(prompt=prompt.strip(), duration=float(duration), batch_size=1)
                waveform = generated.detach().to("cpu").float().numpy()

            waveform = np.squeeze(waveform)
            if waveform.ndim != 2:
                self.send_json(502, {"code": "INVALID_MODEL_OUTPUT"})
                return
            # The model returns channel-first audio; WAV serialization stays in memory.
            if waveform.shape[0] <= 8 and waveform.shape[0] < waveform.shape[1]:
                waveform = waveform.T
            output = io.BytesIO()
            sf.write(output, waveform, 44_100, format="WAV", subtype="PCM_16")
            audio = output.getvalue()
            if not audio or len(audio) > 12_000_000:
                self.send_json(502, {"code": "INVALID_MODEL_OUTPUT"})
                return
            self.send_response(200)
            self.send_header("content-type", "audio/wav")
            self.send_header("cache-control", "no-store")
            self.send_header("x-generation-duration-seconds", f"{waveform.shape[0] / 44_100:.6f}")
            self.send_header("content-length", str(len(audio)))
            self.end_headers()
            self.wfile.write(audio)
        except Exception:
            # Keep provider/model internals out of the response and logs.
            self.send_json(502, {"code": "SFX_GENERATION_FAILED"})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
