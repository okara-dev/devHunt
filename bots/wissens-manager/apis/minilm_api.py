"""
MiniLM – Embeddings für semantische Suche
"""

import os
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer


class MiniLMAPI:
    def __init__(self, config):
        minilm_config = config.get("minilm", {})
        self.model_path = minilm_config.get("model_path")
        self.tokenizer_path = minilm_config.get("tokenizer_path")
        
        self.session = None
        self.tokenizer = None
        
        if self.model_path and os.path.exists(self.model_path):
            print("📥 Lade MiniLM...")
            try:
                self.session = ort.InferenceSession(
                    self.model_path,
                    providers=["CPUExecutionProvider"]
                )
                self.tokenizer = Tokenizer.from_file(self.tokenizer_path)
                print("   ✅ MiniLM geladen")
            except Exception as e:
                print(f"   ❌ MiniLM-Fehler: {e}")
    
    def get_embedding(self, text):
        """Erstellt einen 384-dim Vektor"""
        if not self.session or not self.tokenizer:
            return None
        
        try:
            inputs = self.tokenizer.encode(text)
            input_ids = np.array([inputs.ids], dtype=np.int64)
            attention_mask = np.array([inputs.attention_mask], dtype=np.int64)
            
            feed = {
                "input_ids": input_ids,
                "attention_mask": attention_mask,
            }
            
            input_names = [inp.name for inp in self.session.get_inputs()]
            if "token_type_ids" in input_names:
                feed["token_type_ids"] = np.zeros_like(input_ids)
            
            outputs = self.session.run(None, feed)
            
            # Mean Pooling
            token_embeddings = outputs[0]
            mask = attention_mask[..., np.newaxis].astype(np.float32)
            sum_embeddings = np.sum(token_embeddings * mask, axis=1)
            sum_mask = np.sum(mask, axis=1)
            embedding = sum_embeddings / np.maximum(sum_mask, 1e-9)
            
            # Normalisieren
            embedding = embedding / np.linalg.norm(embedding, axis=1, keepdims=True)
            
            return embedding[0]
        except Exception as e:
            print(f"   ⚠️ Embedding-Fehler: {e}")
            return None
    
    def cosine_similarity(self, vec1, vec2):
        """Kosinus-Ähnlichkeit"""
        if vec1 is None or vec2 is None:
            return 0.0
        return float(np.dot(vec1, vec2))