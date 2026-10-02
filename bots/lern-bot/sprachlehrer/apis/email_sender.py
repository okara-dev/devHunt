"""
E-Mail-Versand für Vokabel-Trainer
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
    
    def send_vokabeln(self, vokabeln, grammatik, basis, sprache, level):
        subject = f"🇪🇸 Deine {sprache}-Vokabeln für heute – {datetime.now().strftime('%d.%m.%Y')}"
        
        html_body = self._build_html(vokabeln, grammatik, basis, sprache, level)
        text_body = self._build_text(vokabeln, grammatik, basis, sprache, level)
        
        return self.send_email_html(subject, html_body, text_body)
    
    def _build_html(self, vokabeln, grammatik, basis, sprache, level):
        # === VOKABELN ===
        vokabel_rows = ""
        for i, v in enumerate(vokabeln, 1):
            vokabel_rows += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #a0aec0; font-size: 13px;">{i}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #c53030; font-size: 16px;">{v.get('es', '')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">{v.get('de', '')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #718096; font-style: italic; font-size: 13px;">{v.get('beispiel', '')}</td>
            </tr>
            """
        
        # === GRAMMATIK ===
        grammatik_html = ""
        for g in grammatik:
            # Endungen-Tabelle
            endungen_html = ""
            if "endungen" in g:
                for verb, personen in g["endungen"].items():
                    endungen_html += f"""
                    <div style="margin: 10px 0;">
                        <strong style="color: #92400e;">{verb}</strong>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 13px;">
                    """
                    if isinstance(personen, dict):
                        for person, endung in personen.items():
                            endungen_html += f"""
                            <tr>
                                <td style="padding: 4px 8px; color: #78350f; width: 30%;">{person}</td>
                                <td style="padding: 4px 8px; color: #92400e; font-family: monospace; font-weight: bold;">{endung}</td>
                            </tr>
                            """
                    endungen_html += "</table></div>"
            
            grammatik_html += f"""
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 18px;">📖 {g.get('thema', '')}</h3>
                <p style="margin: 8px 0; color: #78350f; line-height: 1.6;">{g.get('erklaerung', '')}</p>
                
                {f'<div style="margin: 15px 0;"><strong style="color: #92400e;">Endungen:</strong>{endungen_html}</div>' if endungen_html else ''}
                
                <p style="margin: 10px 0; color: #78350f;"><strong>Beispiel:</strong> <em>{g.get('beispiel', '')}</em></p>
                <p style="margin: 10px 0; color: #991b1b; background: #fee2e2; padding: 10px; border-radius: 6px;"><strong>⚠️ Typischer Fehler:</strong> {g.get('typische_fehler', '')}</p>
            </div>
            """
        
        # === BASIS-VOKABELN ===
        basis_html = ""
        for kategorie, wörter in basis.items():
            basis_html += f"<h4 style='color: #c53030; margin: 20px 0 10px 0; font-size: 16px;'>📌 {kategorie}</h4>"
            basis_html += "<table style='width: 100%; border-collapse: collapse; font-size: 14px;'>"
            for w in wörter:
                basis_html += f"""
                <tr>
                    <td style="padding: 6px 10px; color: #c53030; font-weight: bold; width: 40%;">{w.get('es', '')}</td>
                    <td style="padding: 6px 10px; color: #2d3748;">{w.get('de', '')}</td>
                </tr>
                """
            basis_html += "</table>"
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff5f5;
            color: #2d3748;
            line-height: 1.6;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 16px rgba(197, 48, 48, 0.1);
            border-top: 5px solid #c53030;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px dashed #fed7d7;
        }}
        .header h1 {{
            font-size: 32px;
            color: #c53030;
            margin: 0;
        }}
        .header p {{
            color: #a0aec0;
            margin: 8px 0 0 0;
        }}
        .section {{
            margin: 35px 0;
        }}
        .section-title {{
            font-size: 22px;
            color: #c53030;
            border-bottom: 3px solid #fed7d7;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .vokabel-table {{
            width: 100%;
            border-collapse: collapse;
            background: #fffaf0;
            border-radius: 8px;
            overflow: hidden;
        }}
        .vokabel-table th {{
            background: #c53030;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .basis-box {{
            background: #fffaf0;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #c53030;
        }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #fed7d7;
            font-size: 13px;
            color: #a0aec0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇪🇸 {sprache}-Vokabeln</h1>
            <p>Level {level} | {datetime.now().strftime('%A, %d. %B %Y')}</p>
        </div>

        <!-- VOKABELN -->
        <div class="section">
            <div class="section-title">📚 20 neue Vokabeln</div>
            <table class="vokabel-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Spanisch</th>
                        <th>Deutsch</th>
                        <th>Beispiel</th>
                    </tr>
                </thead>
                <tbody>
                    {vokabel_rows}
                </tbody>
            </table>
        </div>

        <!-- GRAMMATIK -->
        <div class="section">
            <div class="section-title">📖 Grammatik des Tages</div>
            {grammatik_html}
        </div>

        <!-- BASIS-VOKABELN -->
        <div class="section">
            <div class="section-title">⭐ Wichtige Basis-Vokabeln</div>
            <div class="basis-box">
                {basis_html}
            </div>
        </div>

        <div class="footer">
            🇪🇸 Dein Vokabel-Trainer<br>
            <small>¡Buena suerte! (Viel Erfolg!)</small>
        </div>
    </div>
</body>
</html>"""
    
    def _build_text(self, vokabeln, grammatik, basis, sprache, level):
        lines = [
            f"🇪🇸 {sprache.upper()}-VOKABELN",
            "=" * 60,
            f"Level {level} | {datetime.now().strftime('%d.%m.%Y')}",
            "",
            "📚 20 NEUE VOKABELN:",
            "-" * 60,
        ]
        
        for i, v in enumerate(vokabeln, 1):
            lines.append(f"{i}. {v.get('es', '')} – {v.get('de', '')}")
            if v.get('beispiel'):
                lines.append(f"   → {v['beispiel']}")
        
        lines.append("")
        lines.append("📖 GRAMMATIK DES TAGES:")
        lines.append("-" * 60)
        
        for g in grammatik:
            lines.append(f"\n{g.get('thema', '')}")
            lines.append(f"  {g.get('erklaerung', '')}")
            if 'beispiel' in g:
                lines.append(f"  Beispiel: {g['beispiel']}")
            if 'typische_fehler' in g:
                lines.append(f"  ⚠️ {g['typische_fehler']}")
        
        lines.append("")
        lines.append("⭐ WICHTIGE BASIS-VOKABELN:")
        lines.append("-" * 60)
        
        for kategorie, wörter in basis.items():
            lines.append(f"\n📌 {kategorie}:")
            for w in wörter:
                lines.append(f"  • {w.get('es', '')} – {w.get('de', '')}")
        
        lines.append("")
        lines.append("=" * 60)
        lines.append("¡Buena suerte! 🇪🇸")
        
        return "\n".join(lines)
    
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