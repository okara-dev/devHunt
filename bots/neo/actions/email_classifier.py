"""
Bindet dein trainiertes Email-Klassifikationsmodell (98 %) ein.
Modell liegt unter: ../../trained_models/email-classifier/model_onnx/
"""

from pathlib import Path
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

# Pfad zum Email-Classifier
EMAIL_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / \
                  "trained_models" / "email-classifier" / "model_onnx"

LABELS = ["Werbung", "Spam", "Stellenangebot", "Wichtig", "Privat"]
MAX_LEN = 128

_session = None
_tokenizer = None


def _load():
    global _session, _tokenizer
    if _session is None:
        _tokenizer = AutoTokenizer.from_pretrained(
            str(EMAIL_MODEL_DIR), local_files_only=True
        )
        _session = ort.InferenceSession(
            str(EMAIL_MODEL_DIR / "model.onnx"),
            providers=["CPUExecutionProvider"],
        )


def classify_email(text: str) -> str:
    if not text.strip():
        return "Keine E-Mail angegeben, Sir."

    try:
        _load()
        enc = _tokenizer(
            text, return_tensors="np", padding=True,
            truncation=True, max_length=MAX_LEN
        )
        feed = {
            "input_ids": enc["input_ids"].astype(np.int64),
            "attention_mask": enc["attention_mask"].astype(np.int64),
        }
        if "token_type_ids" in enc:
            feed["token_type_ids"] = enc["token_type_ids"].astype(np.int64)

        logits = _session.run(["logits"], feed)[0]
        probs = np.exp(logits) / np.exp(logits).sum(axis=-1, keepdims=True)
        scores = sorted(
            [(l, float(p)) for l, p in zip(LABELS, probs[0])],
            key=lambda x: x[1], reverse=True,
        )
        top_label, top_score = scores[0]
        detail = ", ".join(f"{l}: {s:.2f}" for l, s in scores)
        return (f"Klassifikation: {top_label} ({top_score:.0%}). "
                f"Details: {detail}")
    except Exception as e:
        return f"E-Mail-Klassifikation fehlgeschlagen, Sir: {e}"