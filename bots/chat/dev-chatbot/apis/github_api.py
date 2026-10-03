"""
GitHub API – Repos, User, Code-Suche
Mit Token: 5.000 Anfragen/Stunde
"""

import requests

class GitHubAPI:
    def __init__(self, token=None):
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "DevChatBot/1.0"
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
    
    def get_repo(self, repo_path):
        """Holt Repo-Infos (z.B. 'facebook/react')"""
        try:
            response = requests.get(
                f"{self.base_url}/repos/{repo_path}",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"⚠️ GitHub Fehler: {e}")
            return None
    
    def get_user(self, username):
        """Holt User-Infos"""
        try:
            response = requests.get(
                f"{self.base_url}/users/{username}",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"⚠️ GitHub Fehler: {e}")
            return None
    
    def search_code(self, query, limit=5):
        """Sucht Code auf GitHub"""
        try:
            response = requests.get(
                f"{self.base_url}/search/code",
                headers=self.headers,
                params={"q": query, "per_page": limit},
                timeout=10
            )
            response.raise_for_status()
            return response.json().get("items", [])
        except Exception as e:
            print(f"⚠️ GitHub Code-Suche Fehler: {e}")
            return []
    
    def format_repo(self, data):
        if not data:
            return "❌ Repo nicht gefunden."
        
        return f"""
📦 **{data.get('full_name', '')}**

📝 {data.get('description', 'Keine Beschreibung')}

⭐ Stars: {data.get('stargazers_count', 0):,}
🍴 Forks: {data.get('forks_count', 0):,}
👁️ Watchers: {data.get('watchers_count', 0):,}
🐛 Open Issues: {data.get('open_issues_count', 0):,}
💻 Sprache: {data.get('language', 'Unbekannt')}
📅 Erstellt: {data.get('created_at', '')[:10]}
🔄 Aktualisiert: {data.get('updated_at', '')[:10]}
📜 Lizenz: {data.get('license', {}).get('name', 'Keine') if data.get('license') else 'Keine'}

🔗 {data.get('html_url', '')}
""".replace(",", ".")
    
    def format_user(self, data):
        if not data:
            return "❌ User nicht gefunden."
        
        return f"""
👤 **{data.get('name', data.get('login', ''))}** (@{data.get('login', '')})

📝 {data.get('bio', 'Keine Bio')}

🏢 Firma: {data.get('company', '–')}
📍 Ort: {data.get('location', '–')}
🔗 Blog: {data.get('blog', '–')}
📦 Public Repos: {data.get('public_repos', 0)}
👥 Follower: {data.get('followers', 0)}
👣 Following: {data.get('following', 0)}
📅 Dabei seit: {data.get('created_at', '')[:10]}

🔗 {data.get('html_url', '')}
"""
    
    def format_code_results(self, items, query):
        if not items:
            return f"❌ Keine Code-Ergebnisse für '{query}'."
        
        lines = [f"🔍 **CODE-SUCHE: {query}**", "=" * 40]
        for i, item in enumerate(items, 1):
            repo = item.get("repository", {}).get("full_name", "?")
            path = item.get("path", "?")
            url = item.get("html_url", "")
            
            lines.append(f"\n{i}. **{repo}**")
            lines.append(f"   📄 {path}")
            lines.append(f"   🔗 {url}")
        
        return "\n".join(lines)