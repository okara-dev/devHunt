"""
Lädt das offizielle Qwen2.5-1.5B-Instruct-ONNX Paket von HuggingFace.
Landet in: neo/model/
"""

from pathlib import Path
from pickletools import int4
from huggingface_hub import snapshot_download

REPO_ID = "Arm/qwen2-5-1-5b-instruct-onnx-genai-int4-kquantlast-emb-int4"
OUT_DIR = Path(__file__).resolve().parent.parent / "model"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    print(f"→ Lade {REPO_ID} nach {OUT_DIR} ...")
    print("   (~1 GB, dauert ein paar Minuten)")

    snapshot_download(
        repo_id=REPO_ID,
        local_dir=str(OUT_DIR),
        local_dir_use_symlinks=False,
    )

    print("✓ Fertig. Inhalt:")
    for f in sorted(OUT_DIR.rglob("*")):
        if f.is_file():
            size_mb = f.stat().st_size / 1024 / 1024
            rel = f.relative_to(OUT_DIR)
            print(f"  {str(rel):50s} {size_mb:8.2f} MB")


if __name__ == "__main__":
    main()