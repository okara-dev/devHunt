"""
RapidOCR – Texterkennung aus Bildern
"""

import os
from rapidocr_onnxruntime import RapidOCR


class RapidOCRAPI:
    def __init__(self, config):
        ocr_config = config.get("ocr", {})
        
        self.ocr = RapidOCR(
            det_model_path=ocr_config.get("det_model"),
            rec_model_path=ocr_config.get("rec_model"),
            cls_model_path=ocr_config.get("cls_model"),
        )
    
    def scan_image(self, image_path):
        """Liest Text aus einem Bild"""
        if not os.path.exists(image_path):
            return []
        
        try:
            result, _ = self.ocr(image_path)
            if not result:
                return []
            
            return [
                {"text": item[1], "confidence": float(item[2])}
                for item in result
            ]
        except Exception as e:
            print(f"   ⚠️ OCR-Fehler: {e}")
            return []
    
    def extract_full_text(self, image_path):
        """Extrahiert den kompletten Text als String"""
        results = self.scan_image(image_path)
        if not results:
            return ""
        
        texts = [r["text"] for r in results if r["confidence"] > 0.5]
        return "\n".join(texts)