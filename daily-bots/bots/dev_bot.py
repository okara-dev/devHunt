from .base_bot import BaseBot
from apis.dev_api import fetch_npm_package, fetch_github_repo

class DevBot(BaseBot):
    name = "Dev"

    def send_dev_idea(self):
        pkg = fetch_npm_package()
        repo = fetch_github_repo()

        msg = "💻 *Informatik-Experiment des Tages*\n\n"
        
        if pkg:
            msg += f"📦 *NPM Paket:* `{pkg['name']}`\n   {pkg.get('description', '')[:100]}...\n   <https://www.npmjs.com/package/{pkg['name']}|Ansehen>\n\n"
        else:
            msg += "📦 *NPM:* API nicht erreichbar.\n\n"

        if repo:
            msg += f"🐙 *GitHub Repo:* {repo['full_name']}\n   ⭐ {repo['stargazers_count']} Stars\n   <{repo['html_url']}|Ansehen>\n\n"
        else:
            msg += "🐙 *GitHub:* API nicht erreichbar.\n\n"

        msg += "🎯 *Projektidee:* Baue ein CLI-Tool, das diese API nutzt!"
        self.send_slack(msg)