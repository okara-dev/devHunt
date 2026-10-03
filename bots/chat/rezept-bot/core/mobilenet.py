"""
MobileNetV2 – Bild-Klassifizierung für Zutaten
"""

import json
import os
import numpy as np
import onnxruntime as ort
from PIL import Image


class MobileNetClassifier:
    def __init__(self, model_path, labels_path=None):
        self.model_path = model_path
        self.session = None
        self.labels = []
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"MobileNet-Modell nicht gefunden: {model_path}")
        
        print("📥 Lade MobileNetV2...")
        self.session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"]
        )
        print("   ✅ MobileNetV2 geladen")
        
        # Labels laden (falls vorhanden)
        if labels_path and os.path.exists(labels_path):
            with open(labels_path, "r", encoding="utf-8") as f:
                self.labels = json.load(f)
            print(f"   ✅ {len(self.labels)} Labels geladen")
        
        # Input-Info
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        # Typisch: [1, 3, 224, 224]
    
    def preprocess(self, image_path, size=224):
        """Bild für MobileNet vorbereiten"""
        img = Image.open(image_path).convert("RGB")
        img = img.resize((size, size))
        
        # Normalisieren (ImageNet-Standard)
        arr = np.array(img, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        arr = (arr - mean) / std
        
        # [H, W, C] → [C, H, W] → [1, C, H, W]
        arr = arr.transpose(2, 0, 1)
        arr = np.expand_dims(arr, axis=0)
        
        return arr.astype(np.float32)
    
    def predict(self, image_path, top_k=5):
        """Klassifiziert ein Bild"""
        try:
            input_data = self.preprocess(image_path)
            outputs = self.session.run(None, {self.input_name: input_data})
            
            # Softmax auf Output
            logits = outputs[0][0]
            probs = np.exp(logits - np.max(logits))
            probs = probs / probs.sum()
            
            # Top-K
            top_indices = np.argsort(probs)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                label = self.labels[idx] if idx < len(self.labels) else f"Klasse {idx}"
                results.append({
                    "label": label,
                    "confidence": float(probs[idx])
                })
            
            return results
        except Exception as e:
            print(f"   ⚠️ MobileNet-Fehler: {e}")
            return []