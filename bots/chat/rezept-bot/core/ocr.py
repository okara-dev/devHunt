"""
RapidOCR – Texterkennung (optional für Verpackungen)
"""

import os
from rapidocr_onnxruntime import RapidOCR


class OCRReader:
    def __init__(self, config):
        ocr_config = config.get("ocr", {})
        
        self.ocr = RapidOCR(
            det_model_path=ocr_config.get("det_model"),
            rec_model_path=ocr_config.get("rec_model"),
            cls_model_path=ocr_config.get("cls_model"),
        )
    
    def extract_full_text(self, image_path):
        """Extrahiert kompletten Text aus Bild"""
        if not os.path.exists(image_path):
            return ""
        
        try:
            result, _ = self.ocr(image_path)
            if not result:
                return ""
            
            texts = [item[1] for item in result if item[2] > 0.5]
            return "\n".join(texts)
        except Exception as e:
            print(f"   ⚠️ OCR-Fehler: {e}")
            return ""