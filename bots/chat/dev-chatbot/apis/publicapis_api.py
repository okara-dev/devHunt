import requests
import re

class PublicAPIsAPI:
    def __init__(self):
        self.url = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
        self._cache = None

    def _load_data(self):
        if self._cache is not None:
            return self._cache
        try:
            response = requests.get(self.url, timeout=15)
            response.raise_for_status()
            self._cache = response.text
            return self._cache
        except Exception as e:
            print(f"⚠️ Public APIs Fehler: {e}")
            return None

    def search(self, query, limit=5):
        text = self._load_data()
        if not text:
            return []

        query_lower = query.lower()
        results = []
        current_category = "Unknown"

        for line in text.split('\n'):
            # Kategorie erkennen (### Category Name)
            if line.startswith('### '):
                current_category = line[4:].strip()

            # Tabellenzeilen parsen (| Name | Description | Auth | HTTPS | Link |)
            if line.startswith('|') and '|' in line[1:]:
                parts = [p.strip() for p in line.split('|')]
                # Stellt sicher, dass es eine Datenzeile ist (nicht der Header oder Trenner)
                if len(parts) >= 6 and parts[1] and not parts[1].startswith('---'):
                    name = parts[1]
                    description = parts[2]
                    auth = parts[3]
                    https = parts[4]

                    # Link extrahieren (kann Markdown sein)
                    link_match = re.search(r'\((http[^)]+)\)', parts[5])
                    link = link_match.group(1) if link_match else ""

                    # Suche im Namen, Beschreibung oder Kategorie
                    if (query_lower in name.lower() or 
                        query_lower in description.lower() or 
                        query_lower in current_category.lower()):

                        results.append({
                            "API": name,
                            "Description": description,
                            "Auth": auth,
                            "HTTPS": "Yes" in https,
                            "Link": link,
                            "Category": current_category
                        })

                        if len(results) >= limit:
                            break
        return results

    def format(self, entries, query):
        if not entries:
            return f"❌ Keine APIs für '{query}' gefunden."
        lines = [f"🌐 **FREIE APIS: {query.upper()}**", "=" * 40]
        for i, entry in enumerate(entries, 1):
            https_str = "✅ HTTPS" if entry["HTTPS"] else "❌ HTTP"
            lines.append(f"\n{i}. **{entry['API']}** ({entry['Category']})")
            lines.append(f"   📝 {entry['Description']}")
            lines.append(f"   🔐 Auth: {entry['Auth']} | {https_str}")
            lines.append(f"   🔗 {entry['Link']}")
        return "\n".join(lines)