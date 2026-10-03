"""
npm Registry API – Package-Infos
Kostenlos, kein Key nötig
"""

import requests

class NPMApi:
    def __init__(self):
        self.base_url = "https://registry.npmjs.org"
        self.downloads_url = "https://api.npmjs.org/downloads"
    
    def get_package(self, name):
        """Holt Package-Infos"""
        try:
            response = requests.get(
                f"{self.base_url}/{name}",
                timeout=10
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"⚠️ npm Fehler: {e}")
            return None
    
    def get_downloads(self, name):
        """Holt Download-Statistiken"""
        try:
            response = requests.get(
                f"{self.downloads_url}/point/last-week/{name}",
                timeout=10
            )
            response.raise_for_status()
            return response.json().get("downloads", 0)
        except Exception as e:
            return 0
    
    def format(self, data, downloads):
        if not data:
            return "❌ Package nicht gefunden."
        
        name = data.get("name", "")
        latest = data.get("dist-tags", {}).get("latest", "?")
        versions = data.get("versions", {})
        version_data = versions.get(latest, {})
        
        description = data.get("description", "Keine Beschreibung")
        homepage = data.get("homepage", "")
        repository = data.get("repository", {})
        repo_url = repository.get("url", "") if isinstance(repository, dict) else ""
        
        license_data = version_data.get("license", "?")
        if isinstance(license_data, dict):
            license_str = license_data.get("type", "?")
        else:
            license_str = license_data
        
        # Dependencies
        deps = version_data.get("dependencies", {})
        dep_count = len(deps)
        
        return f"""
📦 **{name}**

📌 Version: {latest}
⬇️ Downloads (letzte Woche): {downloads:,}
📝 {description}

📜 Lizenz: {license_str}
🔗 Dependencies: {dep_count}
📅 Letzte Version: {data.get('time', {}).get(latest, '?')[:10] if data.get('time') else '?'}

🔗 https://www.npmjs.com/package/{name}
""".replace(",", ".")