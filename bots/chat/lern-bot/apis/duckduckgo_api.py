"""
DuckDuckGo Search API – Web-Suche
Kein Key nötig
"""

from ddgs import DDGS

class DuckDuckGoAPI:
    def __init__(self):
        pass
    
    def search(self, query, max_results=5):
        """Sucht im Web"""
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", "")
                    })
            return results
        except Exception as e:
            return []
    
    def format(self, results, query):
        if not results:
            return f"❌ Keine Ergebnisse für '{query}'."
        
        lines = [f"🔍 **SUCHERGEBNISSE: {query.upper()}**", "=" * 40]
        
        for i, r in enumerate(results, 1):
            title = r.get("title", "Kein Titel")
            url = r.get("url", "")
            snippet = r.get("snippet", "")
            
            if len(snippet) > 150:
                snippet = snippet[:150] + "..."
            
            lines.append(f"\n{i}. **{title}**")
            lines.append(f"   {snippet}")
            lines.append(f"   🔗 {url}")
        
        return "\n".join(lines)