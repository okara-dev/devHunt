"""
Open Library API – Buch-Empfehlungen
Kein Key nötig
"""

import requests
import random

class OpenLibraryAPI:
    def __init__(self):
        self.base_url = "https://openlibrary.org"
    
    def search_books(self, thema, limit=5):
        """Sucht Bücher zu einem Thema"""
        try:
            response = requests.get(
                f"{self.base_url}/search.json",
                params={"q": thema, "limit": limit, "language": "ger"},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            return data.get("docs", [])
        except Exception as e:
            return []
    
    def format(self, books, thema):
        if not books:
            return f"❌ Keine Bücher zu '{thema}' gefunden."
        
        lines = [f"📚 **BUCH-EMPFEHLUNGEN: {thema.upper()}**", "=" * 40]
        
        for i, book in enumerate(books[:5], 1):
            title = book.get("title", "Unbekannt")
            authors = book.get("author_name", ["Unbekannt"])
            author = authors[0] if authors else "Unbekannt"
            year = book.get("first_publish_year", "?")
            key = book.get("key", "")
            
            lines.append(f"\n{i}. **{title}**")
            lines.append(f"   ✍️ {author} ({year})")
            if key:
                lines.append(f"   🔗 https://openlibrary.org{key}")
        
        return "\n".join(lines)