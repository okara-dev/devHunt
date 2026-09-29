"""
PDF-Builder – wandelt HTML in PDF um (WeasyPrint)
"""

from weasyprint import HTML

class PDFBuilder:
    def __init__(self):
        pass
    
    def html_to_pdf(self, html_content, output_path):
        """Wandelt HTML in PDF um"""
        try:
            print(f"   📄 Konvertiere HTML zu PDF...")
            HTML(string=html_content).write_pdf(output_path)
            
            import os
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"   ✅ PDF gespeichert ({size_mb:.1f} MB)")
            return output_path
        except Exception as e:
            print(f"   ❌ PDF-Fehler: {e}")
            return None