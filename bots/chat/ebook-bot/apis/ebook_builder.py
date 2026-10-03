"""
E-Book-Builder – baut HTML-E-Book aus Kapiteln
"""

from datetime import datetime

class EbookBuilder:
    def __init__(self):
        pass
    
    def build_html(self, title, author, thema, kapitel_liste):
        toc = ""
        for i, kap in enumerate(kapitel_liste, 1):
            toc += f'<li><a href="#kapitel-{i}">{kap["titel"]}</a></li>\n'
        
        kapitel_html = ""
        for i, kap in enumerate(kapitel_liste, 1):
            text = kap["text"]
            absaetze = text.split("\n\n")
            absaetze_html = "".join([f"<p>{p.strip()}</p>" for p in absaetze if p.strip()])
            
            kapitel_html += f"""
            <div class="kapitel" id="kapitel-{i}">
                <h2>Kapitel {i}: {kap['titel']}</h2>
                {absaetze_html}
            </div>
            """
        
        return f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: Georgia, 'Times New Roman', serif;
            max-width: 700px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #faf8f5;
            color: #2d3748;
            line-height: 1.8;
            font-size: 17px;
        }}
        .cover {{
            text-align: center;
            padding: 80px 20px;
            border-bottom: 3px double #7c3aed;
            margin-bottom: 60px;
        }}
        .cover h1 {{
            font-size: 42px;
            color: #7c3aed;
            margin: 0 0 20px 0;
            font-style: italic;
        }}
        .cover .subtitle {{
            font-size: 18px;
            color: #718096;
            margin: 20px 0;
        }}
        .cover .author {{
            font-size: 20px;
            color: #4a5568;
            margin-top: 40px;
        }}
        .cover .genre {{
            display: inline-block;
            padding: 6px 20px;
            background: #faf5ff;
            border: 1px solid #d6bcfa;
            border-radius: 20px;
            color: #7c3aed;
            font-size: 14px;
            margin: 20px 0;
        }}
        .toc {{
            background: #f7fafc;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 60px;
        }}
        .toc h2 {{
            color: #7c3aed;
            margin-top: 0;
        }}
        .toc ul {{
            list-style: none;
            padding: 0;
        }}
        .toc li {{
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
        }}
        .toc a {{
            color: #4a5568;
            text-decoration: none;
        }}
        .toc a:hover {{
            color: #7c3aed;
        }}
        .kapitel {{
            margin-bottom: 60px;
            page-break-after: always;
        }}
        .kapitel h2 {{
            color: #7c3aed;
            font-size: 28px;
            border-bottom: 2px solid #e9d8fd;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }}
        .kapitel p {{
            text-align: justify;
            margin-bottom: 20px;
        }}
        .kapitel p:first-of-type::first-letter {{
            font-size: 4em;
            float: left;
            line-height: 0.9;
            padding-right: 10px;
            color: #7c3aed;
            font-weight: bold;
        }}
        .footer {{
            text-align: center;
            margin-top: 80px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #a0aec0;
            font-size: 14px;
            font-style: italic;
        }}
    </style>
</head>
<body>
    <div class="cover">
        <div class="genre">Psychologischer Roman</div>
        <h1>{title}</h1>
        <div class="subtitle">Eine Geschichte über {thema}</div>
        <div class="author">von {author}</div>
    </div>

    <div class="toc">
        <h2>Inhaltsverzeichnis</h2>
        <ul>
            {toc}
        </ul>
    </div>

    {kapitel_html}

    <div class="footer">
        <p>Geschrieben von KI am {datetime.now().strftime('%d.%m.%Y')}</p>
        <p>Erstellt mit dem E-Book-Bot</p>
    </div>
</body>
</html>"""