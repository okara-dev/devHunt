"""
E-Mail-Versand für Daily Compass
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

class EmailSender:
    def __init__(self, config):
        self.sender = config.get("sender")
        self.password = config.get("password")
        self.receiver = config.get("receiver")
        self.smtp_server = config.get("smtp_server", "smtp.gmail.com")
        self.smtp_port = config.get("smtp_port", 587)
    
    def send_daily_compass(self, news_content, dev_content,
                           nasa_content, proverb_content, joke_content):
        subject = f"🧭 Daily Compass - {datetime.now().strftime('%d.%m.%Y')}"
        
        html_body = self._build_html(
            news_content, dev_content,
            nasa_content, proverb_content, joke_content
        )
        
        text_body = self._build_text(
            news_content, dev_content,
            nasa_content, proverb_content, joke_content
        )
        
        return self.send_email_html(subject, html_body, text_body)
    
    def _build_html(self, news, dev, nasa, proverb, joke):
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
            color: #2d3748;
            line-height: 1.6;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            border-bottom: 3px solid #4f46e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 32px;
            color: #4f46e5;
            margin: 0;
        }}
        .header p {{
            color: #718096;
            margin: 5px 0 0 0;
        }}
        .section {{
            margin: 25px 0;
            padding: 20px;
            border-radius: 12px;
            background-color: #f7fafc;
            border-left: 4px solid #4f46e5;
        }}
        .section-title {{
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #2d3748;
        }}
        .section-news {{ border-left-color: #3182ce; }}
        .section-dev {{ border-left-color: #0a0a0a; }}
        .section-nasa {{ border-left-color: #805ad5; }}
        .section-proverb {{ border-left-color: #d69e2e; }}
        .section-joke {{ border-left-color: #ed64a6; }}
        
        .proverb-text {{
            font-size: 18px;
            font-style: italic;
            background: #fefcbf;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #d69e2e;
        }}
        .joke-text {{
            font-size: 18px;
            font-style: italic;
            background: #fff5f5;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ed64a6;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            font-size: 14px;
            color: #718096;
        }}
        pre {{
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            margin: 0;
        }}
        .hr {{
            border: 0;
            height: 1px;
            background: #e2e8f0;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧭 Daily Compass</h1>
            <p>{datetime.now().strftime('%A, %d. %B %Y')}</p>
        </div>

        <!-- RSS NEWS -->
        <div class="section section-news">
            <div class="section-title">📰 News</div>
            <pre>{self._escape(news)}</pre>
        </div>

        <hr class="hr">

        <!-- DEV.TO -->
        <div class="section section-dev">
            <div class="section-title">👨‍💻 Dev.to</div>
            <pre>{self._escape(dev)}</pre>
        </div>

        <hr class="hr">

        <!-- NASA -->
        <div class="section section-nasa">
            <div class="section-title">🚀 NASA</div>
            <pre>{self._escape(nasa)}</pre>
        </div>

        <hr class="hr">

        <!-- SPRICHWORT -->
        <div class="section section-proverb">
            <div class="section-title">📜 Sprichwort des Tages</div>
            <div class="proverb-text">
                <pre>{self._escape(proverb)}</pre>
            </div>
        </div>

        <hr class="hr">

        <!-- WITZ -->
        <div class="section section-joke">
            <div class="section-title">😂 Witz des Tages</div>
            <div class="joke-text">
                <pre>{self._escape(joke)}</pre>
            </div>
        </div>

        <div class="footer">
            🧭 Dein täglicher Begleiter – bleib neugierig!<br>
            <small>Diese E-Mail wurde automatisch generiert.</small>
        </div>
    </div>
</body>
</html>"""
    
    def _build_text(self, news, dev, nasa, proverb, joke):
        return f"""
╔══════════════════════════════════════════════════════════╗
║                    🧭 DAILY COMPASS                     ║
║                 {datetime.now().strftime('%A, %d. %B %Y')}                ║
╚══════════════════════════════════════════════════════════╝

📰 NEWS
{news}

─────────────────────────────────────────────────────────

👨‍💻 DEV.TO
{dev}

─────────────────────────────────────────────────────────

🚀 NASA
{nasa}

─────────────────────────────────────────────────────────

📜 SPRICHWORT DES TAGES
{proverb}

─────────────────────────────────────────────────────────

😂 WITZ DES TAGES
{joke}

═══════════════════════════════════════════════════════════
🧭 Dein Daily Compass – bleib neugierig!
"""
    
    def _escape(self, text):
        if not text:
            return ""
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    def send_email_html(self, subject, html_body, text_body):
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = self.sender
            msg["To"] = self.receiver
            msg["Subject"] = subject
            
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30)
            server.starttls()
            server.login(self.sender, self.password)
            server.send_message(msg)
            server.quit()
            
            print("✅ E-Mail erfolgreich gesendet!")
            return True
        except Exception as e:
            print(f"❌ E-Mail Fehler: {e}")
            return False