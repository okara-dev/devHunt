"""
E-Mail-Versand für E-Book-Bot
Unterstützt HTML + WAV als Anhänge
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import os

class EmailSender:
    def __init__(self, config):
        self.sender = config.get("sender")
        self.password = config.get("password")
        self.receiver = config.get("receiver")
        self.smtp_server = config.get("smtp_server", "smtp.gmail.com")
        self.smtp_port = config.get("smtp_port", 587)
    
    def send_ebook(self, title, thema, kapitel_anzahl, woerter_gesamt, attachments):
        """
        Sendet E-Book mit HTML + WAV als Anhänge.
        
        :param attachments: Liste von Datei-Pfaden (HTML, WAV)
        """
        subject = f"📖 Dein E-Book: {title}"
        
        # Anhänge-Liste
        attachment_names = [os.path.basename(a) for a in attachments if a and os.path.exists(a)]
        
        # Plain-Text
        text_body = f"""
📖 DEIN E-BOOK

Titel: {title}
Thema: {thema}
Kapitel: {kapitel_anzahl}
Wörter: ~{woerter_gesamt}

📎 Anhänge:
{chr(10).join(['  • ' + name for name in attachment_names])}

Viel Spaß beim Lesen oder Hören!
"""
        
        # HTML
        attachments_html = "".join([f"<li>{name}</li>" for name in attachment_names])
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf8f5;">
            <div style="background: white; padding: 30px; border-radius: 12px;">
                <h1 style="color: #7c3aed;">📖 Dein E-Book ist fertig!</h1>
                <h2 style="color: #2d3748;">{title}</h2>
                
                <table style="width: 100%; margin: 20px 0;">
                    <tr><td style="padding: 8px 0;"><strong>Thema:</strong></td><td>{thema}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Kapitel:</strong></td><td>{kapitel_anzahl}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Wörter:</strong></td><td>~{woerter_gesamt}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Erstellt:</strong></td><td>{datetime.now().strftime('%d.%m.%Y um %H:%M')}</td></tr>
                </table>
                
                <div style="background: #faf5ff; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 8px;">
                    <strong>📎 Anhänge:</strong>
                    <ul style="margin: 10px 0;">
                        {attachments_html}
                    </ul>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #718096;">
                        <strong>HTML:</strong> Öffne die Datei mit deinem Browser zum Lesen.<br>
                        <strong>WAV:</strong> Öffne die Datei mit einem Player zum Hören.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email_with_attachments(subject, html_body, text_body, attachments)
    
    def send_email_with_attachments(self, subject, html_body, text_body, attachments):
        """Sendet E-Mail mit mehreren Anhängen"""
        try:
            msg = MIMEMultipart("mixed")
            msg["From"] = self.sender
            msg["To"] = self.receiver
            msg["Subject"] = subject
            
            # Text + HTML
            msg_alternative = MIMEMultipart("alternative")
            msg_alternative.attach(MIMEText(text_body, "plain", "utf-8"))
            msg_alternative.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(msg_alternative)
            
            # Anhänge
            for path in attachments:
                if not path or not os.path.exists(path):
                    continue
                
                filename = os.path.basename(path)
                ext = os.path.splitext(filename)[1].lower()
                
                # MIME-Type
                if ext == ".wav":
                    mime_type = ("audio", "wav")
                elif ext == ".html":
                    mime_type = ("text", "html")
                elif ext == ".mp3":
                    mime_type = ("audio", "mpeg")
                else:
                    mime_type = ("application", "octet-stream")
                
                with open(path, "rb") as f:
                    part = MIMEBase(*mime_type)
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{filename}"'
                    )
                    msg.attach(part)
                    
                    size_mb = os.path.getsize(path) / (1024 * 1024)
                    print(f"      📎 {filename} ({size_mb:.2f} MB)")
            
            # Senden
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=180)
            server.starttls()
            server.login(self.sender, self.password)
            server.send_message(msg)
            server.quit()
            
            return True
        except Exception as e:
            print(f"   ❌ E-Mail Fehler: {e}")
            return False