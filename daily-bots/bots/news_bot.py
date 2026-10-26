from .base_bot import BaseBot
from apis.news_api import fetch_news

class NewsBot(BaseBot):
    name = "News"

    def check_news(self):
        for ressort in ["inland", "wirtschaft"]:
            news = fetch_news(ressort)
            
            if news is None:
                self.send_slack(f"⚠️ *Tagesschau-API ({ressort}) nicht erreichbar.*")
                continue
                
            if not news: continue

            msg = f"📰 *{ressort.upper()}*\n\n"
            for item in news[:3]:
                title = item.get("title", "Ohne Titel")
                link = item.get("detailsweb", "")
                msg += f"• *{title}*\n  <{link}|Zum Artikel>\n"
            self.send_slack(msg)