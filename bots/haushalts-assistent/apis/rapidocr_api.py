"""
RapidOCR – Texterkennung aus Bildern
"""

import os
from rapidocr_onnxruntime import RapidOCR

class RapidOCRAPI:
    def __init__(self, config):
        ocr_config = config.get("ocr", {})
        
        # RapidOCR initialisieren (mit eigenen Modellen)
        self.ocr = RapidOCR(
            det_model_path=ocr_config.get("det_model"),
            rec_model_path=ocr_config.get("rec_model"),
            cls_model_path=ocr_config.get("cls_model"),
        )
    
    def scan_image(self, image_path):
        """
        Liest Text aus einem Bild.
        Gibt eine Liste mit (Text, Konfidenz) zurück.
        """
        if not os.path.exists(image_path):
            return []
        
        try:
            result, elapse = self.ocr(image_path)
            
            if not result:
                return []
            
            # result ist eine Liste von [box, text, confidence]
            extracted = []
            for item in result:
                text = item[1]
                confidence = item[2]
                extracted.append({
                    "text": text,
                    "confidence": float(confidence)
                })
            
            return extracted
        except Exception as e:
            print(f"   ⚠️ OCR-Fehler: {e}")
            return []
    
    def extract_full_text(self, image_path):
        """Extrahiert den kompletten Text als String"""
        results = self.scan_image(image_path)
        if not results:
            return ""
        
        # Nur Texte mit guter Konfidenz
        texts = [r["text"] for r in results if r["confidence"] > 0.5]
        return "\n".join(texts)
    
    def parse_receipt(self, text, llm):
        """
        Lässt die KI eine Rechnung analysieren.
        Erwartet: Datum, Geschäft, Betrag, Artikel
        """
        system_prompt = (
            "Du bist ein Assistent, der Rechnungen analysiert. "
            "Extrahiere strukturierte Daten aus dem Text."
        )
        
        user_prompt = f"""Analysiere diesen Kassenzettel-Text und extrahiere:

DATUM: [Datum]
GESCHAEFT: [Geschäftsname]
BETRAG: [Gesamtbetrag in EUR]
ARTIKEL: [Artikel, getrennt durch Komma]

Text:
{text[:1500]}

Antworte NUR in diesem Format."""
        
        return llm.generate(system_prompt, user_prompt, max_tokens=300, temperature=0.3)