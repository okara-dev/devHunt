import random
from .base_bot import BaseBot
from apis.learn_api import fetch_wikipedia, summarize_with_groq

class LearnBot(BaseBot):
    name = "Lernen"
    
    THEMEN = {
        "psychologie": [
            "Kognitive Dissonanz", "Klassische Konditionierung", "Maslowsche Bedürfnispyramide",
            "Confirmation Bias", "Dunning-Kruger-Effekt", "Bindungstheorie",
            "Placebo-Effekt", "Big Five (Psychologie)", "Milgram-Experiment",
            "Selektive Wahrnehmung", "Emotionale Intelligenz", "Resilienz (Psychologie)",
        ],
        "biologie": [
            "Epigenetik", "CRISPR", "Mitochondrium", "Photosynthese", "Zellteilung",
            "DNA-Replikation", "Evolutionstheorie", "Symbiose", "T-Zelle",
            "Neurotransmitter", "Stammzelle", "Biodiversität", "Viren", "Genom",
        ],
        "physik": [
            "Schwarzes Loch", "Quantenverschränkung", "Relativitätstheorie", "Stringtheorie",
            "Dunkle Materie", "Dunkle Energie", "Higgs-Boson", "Entropie",
            "Gravitationswelle", "Kernfusion", "Supraleiter", "Kosmische Hintergrundstrahlung",
            "Lichtgeschwindigkeit", "Plancksches Wirkungsquantum",
        ],
    }

    def send_lesson(self):
        kategorie = random.choice(list(self.THEMEN.keys()))
        thema = random.choice(self.THEMEN[kategorie])

        # Wikipedia abrufen
        data = fetch_wikipedia(thema)
        if not data or "extract" not in data:
            self.send_slack(
                f"⚠️ *Lern-Thema konnte nicht geladen werden.*\n"
                f"Thema: _{thema}_ ({kategorie.capitalize()})\n"
                f"Die Wikipedia-API hat nicht geantwortet."
            )
            return

        raw_extract = data.get("extract", "")
        link = data.get("content_urls", {}).get("desktop", {}).get("page", "")

        # Groq für schöne Zusammenfassung nutzen
        groq_key = self.config.get("groq", {}).get("api_key")
        if groq_key:
            summary = summarize_with_groq(groq_key, thema, raw_extract)
        else:
            summary = raw_extract[:400] + "..."

        emoji_map = {"psychologie": "🧠", "biologie": "🧬", "physik": "⚛️"}
        emoji = emoji_map.get(kategorie, "📚")

        msg = f"{emoji} *Lern-Thema des Tages: {kategorie.capitalize()}*\n\n"
        msg += f"📖 *{data.get('title', thema)}*\n\n"
        msg += f"{summary}\n\n"
        if link:
            msg += f"🔗 <{link}|Ganzen Artikel lesen>\n"
        msg += f"\n_— Dein Lern-Bot_ 📚"

        self.send_slack(msg)