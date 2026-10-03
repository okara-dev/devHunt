"""
PDF-Reader – liest Text aus PDFs
"""

import os
from PyPDF2 import PdfReader as PyPDF2Reader


class PDFReader:
    def __init__(self, ocr_api=None):
        self.ocr = ocr_api
    
    def extract_text(self, pdf_path):
        """
        Extrahiert Text aus einem PDF.
        Bei gescannten PDFs → OCR-Fallback.
        """
        if not os.path.exists(pdf_path):
            return None
        
        try:
            reader = PyPDF2Reader(pdf_path)
            text_parts = []
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            full_text = "\n".join(text_parts).strip()
            
            # Wenn kein Text → gescanntes PDF → OCR nutzen
            if len(full_text) < 50 and self.ocr:
                print(f"   ⚠️ PDF scheint gescannt zu sein – nutze OCR...")
                return self._ocr_pdf(pdf_path)
            
            return full_text
        
        except Exception as e:
            print(f"   ❌ PDF-Fehler: {e}")
            return None
    
    def _ocr_pdf(self, pdf_path):
        """OCR für gescannte PDFs (via Bild-Konvertierung)"""
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(pdf_path)
            
            text_parts = []
            for i, img in enumerate(images, 1):
                # Temporär speichern
                temp_path = f"temp_page_{i}.png"
                img.save(temp_path)
                
                # OCR
                text = self.ocr.extract_full_text(temp_path)
                if text:
                    text_parts.append(text)
                
                # Cleanup
                os.remove(temp_path)
            
            return "\n".join(text_parts)
        except ImportError:
            print("   ⚠️ pdf2image nicht installiert – überspringe OCR")
            return None
        except Exception as e:
            print(f"   ❌ OCR-PDF-Fehler: {e}")
            return None