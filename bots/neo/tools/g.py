import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from ai.local_llm_client import LocalLLMClient

config = {
    "model_dir": "model",
    "max_new_tokens": 128,
    "temperature": 0.7,
    "top_p": 0.9,
    "personality_file": "data/personality.json",
}

neo = LocalLLMClient(config, tools=[])
r = neo.chat("Hallo Neo, stell dich kurz vor.")
print("ANTWORT:", r["content"])