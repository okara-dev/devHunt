"""
RSS-News aus verschiedenen Quellen
"""

import feedparser
from datetime import datetime
from .translator import translate_text

class RSSNews:
    def __init__(self):
        # Mehr RSS-Feeds für bessere Abdeckung
        self.feeds = [
            # Tagesschau
            "https://www.tagesschau.de/index~rss2.xml",
            "https://www.tagesschau.de/wirtschaft/index~rss2.xml",
            "https://www.tagesschau.de/wissen/index~rss2.xml",
            
            # Spiegel
            "https://www.spiegel.de/schlagzeilen/tops/index.rss",
            "https://www.spiegel.de/wirtschaft/index.rss",
            "https://www.spiegel.de/wissenschaft/index.rss",
            
            # Weitere Quellen
            "https://www.zeit.de/index/rss.xml",
            "https://www.heise.de/rss/heise-atom.xml",
        ]
        
        # Anzahl Artikel pro Feed
        self.articles_per_feed = 2
    
    def get_headlines(self, max_articles=10):
        """Holt die neuesten Schlagzeilen aus allen Feeds"""
        all_articles = []
        
        for feed_url in self.feeds:
            try:
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:self.articles_per_feed]:
                    all_articles.append({
                        "title": entry.get("title", "Kein Titel"),
                        "link": entry.get("link", "#"),
                        "source": feed.feed.get("title", "Unbekannt"),
                        "published": entry.get("published", "Kein Datum")
                    })
            except Exception as e:
                # Feed-Fehler ignorieren (manche Feeds sind manchmal down)
                pass
        
        # Duplikate entfernen (nach Titel)
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title = article["title"]
            if title not in seen_titles:
                seen_titles.add(title)
                unique_articles.append(article)
        
        # Auf max_articles begrenzen
        return unique_articles[:max_articles]
    
    def format(self, articles):
        if not articles:
            return "📰 Keine News verfügbar."
        
        lines = ["📰 **TOP-NACHRICHTEN**", "=" * 35]
        for i, article in enumerate(articles, 1):
            title = article.get("title", "Kein Titel")
            source = article.get("source", "Unbekannt")
            link = article.get("link", "#")
            
            lines.append(f"{i}. **{title}**")
            lines.append(f"   📌 {source} | [Link]({link})")
            lines.append("")
        
        return "\n".join(lines)