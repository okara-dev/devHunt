#!/usr/bin/env python3
"""
Daily-Bot für Slack
Alle Bots in einem: Wetter, Zitat, Nachrichten, Musik, Witz, Fun-Fact
Jeder Bot läuft in einem eigenen Thread.
"""

import json
import sys
import os
import time
import random
import hashlib
import threading
import re
import select
import schedule
import requests
import feedparser
from datetime import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


# ============================================================
# Hilfsfunktionen
# ============================================================

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def log(bot_name, message):
    """Einheitliches Logging mit Bot-Namen"""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{bot_name}] {message}")


# ============================================================
# Basis-Bot
# ============================================================

class BaseBot(threading.Thread):
    """Basis-Klasse für alle Bots (läuft als Thread)"""

    name = "BaseBot"
    emoji = "🤖"

    def __init__(self, config, slack_client, channel):
        super().__init__(daemon=True)
        self.config = config
        self.slack = slack_client
        self.channel = channel
        self._stop_event = threading.Event()

    def send_slack(self, message, emoji=None):
        """Sendet Nachricht an Slack"""
        try:
            self.slack.chat_postMessage(
                channel=self.channel,
                text=message,
                mrkdwn=True
            )
            log(self.name, "✅ Slack-Nachricht gesendet")
            return True
        except SlackApiError as e:
            log(self.name, f"❌ Slack-Fehler: {e.response['error']}")
            return False

    def stop(self):
        self._stop_event.set()

    def stopped(self):
        return self._stop_event.is_set()

    def run(self):
        """Wird von Subklassen überschrieben"""
        raise NotImplementedError


# ============================================================
# 1. Wetter-Bot
# ============================================================

class WeatherBot(BaseBot):
    name = "Wetter"
    emoji = "🌤️"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.location = config["location"]
        self.alerts = config["alerts"]
        self.interval = config["check_interval_minutes"]
        self.last_alerts = {}

    def get_weather(self):
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": self.location["lat"],
            "longitude": self.location["lon"],
            "hourly": "temperature_2m,precipitation,weathercode,windspeed_10m",
            "forecast_days": 1,
            "timezone": "Europe/Berlin"
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            log(self.name, f"⚠️ API-Fehler: {e}")
            return None

    def check_weather(self):
        log(self.name, "🔍 Prüfe Wetter...")
        data = self.get_weather()
        if not data:
            return

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        codes = hourly.get("weathercode", [])
        precip = hourly.get("precipitation", [])
        wind = hourly.get("windspeed_10m", [])
        temps = hourly.get("temperature_2m", [])

        if not times:
            return

        now = datetime.now()
        current_hour = now.strftime("%Y-%m-%dT%H:00")
        alerts = []

        for i, t in enumerate(times):
            if t < current_hour:
                continue
            if i >= 6:
                break

            code = codes[i] if i < len(codes) else 0
            p = precip[i] if i < len(precip) else 0
            w = wind[i] if i < len(wind) else 0
            temp = temps[i] if i < len(temps) else 0
            hour_str = t.split("T")[1][:5]

            if self.alerts["rain"] and p >= self.alerts["min_precipitation_mm"]:
                if "regen" not in self.last_alerts or \
                   (now - self.last_alerts["regen"]).total_seconds() > 3600:
                    alerts.append(f"🌧️ *Regen um {hour_str}* ({p:.1f} mm, {temp:.0f}°C)")
                    self.last_alerts["regen"] = now

            if self.alerts["thunderstorm"] and 95 <= code <= 99:
                if "gewitter" not in self.last_alerts or \
                   (now - self.last_alerts["gewitter"]).total_seconds() > 3600:
                    alerts.append(f"⛈️ *GEWITTER um {hour_str}* ({temp:.0f}°C)")
                    self.last_alerts["gewitter"] = now

            if self.alerts["storm"]:
                if code in [65, 82] or w >= self.alerts["min_wind_kmh"]:
                    if "sturm" not in self.last_alerts or \
                       (now - self.last_alerts["sturm"]).total_seconds() > 3600:
                        alerts.append(f"🌪️ *STURM um {hour_str}* (Wind: {w:.0f} km/h)")
                        self.last_alerts["sturm"] = now

        if alerts:
            message = f"*Wetter-Warnung für {self.location['name']}:*\n\n"
            message += "\n".join(alerts)
            message += f"\n\n_Stand: {now.strftime('%H:%M')}_"
            emoji = "🚨" if any("GEWITTER" in a or "STURM" in a for a in alerts) else "⚠️"
            self.send_slack(f"{emoji} {message}")
        else:
            log(self.name, "✅ Keine Warnungen")

    def run(self):
        log(self.name, f"🌤️ Starte Wetter-Bot für {self.location['name']}")
        self.send_slack(
            f"🌤️ *Wetter-Bot ist online!*\n\n"
            f"📍 Standort: {self.location['name']}\n"
            f"⏰ Prüfung: alle {self.interval} Minuten"
        )
        self.check_weather()
        schedule.every(self.interval).minutes.do(self.check_weather)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# 2. Zitat-Bot
# ============================================================

class QuoteBot(BaseBot):
    name = "Zitat"
    emoji = "💬"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.languages = config.get("languages", ["de", "tr"])
        self.categories = config.get("categories", ["motivation"])
        self.time = config["schedule"]["time"]

        self.lang_emoji = {"de": "🇩🇪", "tr": "🇹🇷"}

        self.fallback_quotes = {
            "de": [
                {"quote": "Das Geheimnis des Erfolgs ist, den Standpunkt des anderen zu verstehen.", "author": "Henry Ford"},
                {"quote": "Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was du tust.", "author": "Steve Jobs"},
                {"quote": "Sei du selbst – alle anderen gibt es schon.", "author": "Oscar Wilde"},
                {"quote": "Phantasie ist wichtiger als Wissen.", "author": "Albert Einstein"},
                {"quote": "Mut bedeutet nicht, keine Angst zu haben, sondern die Angst zu überwinden.", "author": "Nelson Mandela"},
                {"quote": "Jeder Tag ist eine neue Chance.", "author": "Unbekannt"},
                {"quote": "Glaube an dich selbst, auch wenn niemand anders es tut.", "author": "Unbekannt"},
                {"quote": "In der Mitte der Schwierigkeiten liegen die Möglichkeiten.", "author": "Albert Einstein"},
                {"quote": "Das Leben ist zu kurz, um langweilig zu sein.", "author": "Unbekannt"},
                {"quote": "Wer nicht wagt, der nicht gewinnt.", "author": "Deutsches Sprichwort"},
                {"quote": "Der Weg ist das Ziel.", "author": "Konfuzius"},
                {"quote": "Übung macht den Meister.", "author": "Deutsches Sprichwort"},
                {"quote": "Morgenstund hat Gold im Mund.", "author": "Deutsches Sprichwort"},
                {"quote": "Reden ist Silber, Schweigen ist Gold.", "author": "Deutsches Sprichwort"},
            ],
            "tr": [
                {"quote": "Hayatta en hakiki mürşit ilimdir.", "author": "Mustafa Kemal Atatürk"},
                {"quote": "Yurtta sulh, cihanda sulh.", "author": "Mustafa Kemal Atatürk"},
                {"quote": "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", "author": "Robert Collier"},
                {"quote": "Hayal ettiğiniz her şeyi yapabilirsiniz.", "author": "Walt Disney"},
                {"quote": "Damlaya damlaya göl olur.", "author": "Türk Atasözü"},
                {"quote": "Sabreden derviş muradına ermiş.", "author": "Türk Atasözü"},
                {"quote": "Ağaç yaşken eğilir.", "author": "Türk Atasözü"},
                {"quote": "Bugünün işini yarına bırakma.", "author": "Türk Atasözü"},
                {"quote": "Söz gümüşse sükût altındır.", "author": "Türk Atasözü"},
                {"quote": "İşleyen demir ışıldar.", "author": "Türk Atasözü"},
                {"quote": "Ne ekersen onu biçersin.", "author": "Türk Atasözü"},
            ]
        }

    def get_quote(self, lang=None):
        if not lang:
            lang = random.choice(self.languages)
        if lang not in self.fallback_quotes:
            lang = "de"
        quote = random.choice(self.fallback_quotes[lang]).copy()
        quote["lang"] = lang
        return quote

    def send_quote(self):
        log(self.name, "💬 Poste Zitat...")
        lang = random.choice(self.languages)
        q = self.get_quote(lang)
        flag = self.lang_emoji.get(lang, "🌍")

        message = f"💬 *Zitat des Tages* {flag}\n\n"
        message += f"_\"{q['quote']}\"_\n\n"
        message += f"✍️ — *{q['author']}*\n"

        if q["author"] not in ["Unbekannt", "Anonim", "Deutsches Sprichwort", "Türk Atasözü"]:
            wiki_lang = "tr" if lang == "tr" else "de"
            wiki_url = f"https://{wiki_lang}.wikipedia.org/wiki/{q['author'].replace(' ', '_')}"
            message += f"🔗 <{wiki_url}|Mehr über {q['author']}>\n"

        message += "\n_— Dein Zitat-Bot_ 💬"
        self.send_slack(message)

    def run(self):
        log(self.name, f"💬 Starte Zitat-Bot (täglich um {self.time})")
        self.send_slack(
            f"💬 *Zitat-Bot ist online!*\n\n"
            f"⏰ Postet täglich um *{self.time}*\n"
            f"🌍 Sprachen: {', '.join(self.lang_emoji.get(l, l) for l in self.languages)}"
        )
        schedule.every().day.at(self.time).do(self.send_quote)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# 3. Nachrichten-Bot
# ============================================================

class NewsBot(BaseBot):
    name = "News"
    emoji = "📰"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.sources = config["sources"]
        self.kategorien = config["kategorien"]
        self.max_articles = config.get("max_articles_per_run", 5)
        self.summary_length = config.get("summary_length", 200)
        self.interval = config["check_interval_minutes"]

        self.seen_file = "seen_articles.json"
        self.seen_articles = self._load_seen()
        self._lock = threading.Lock()

    def _load_seen(self):
        if os.path.exists(self.seen_file):
            try:
                with open(self.seen_file, "r", encoding="utf-8") as f:
                    return set(json.load(f))
            except Exception:
                pass
        return set()

    def _save_seen(self):
        try:
            with open(self.seen_file, "w", encoding="utf-8") as f:
                json.dump(list(self.seen_articles), f)
        except Exception as e:
            log(self.name, f"⚠️ Konnte seen_articles nicht speichern: {e}")

    def _hash_article(self, title, link):
        return hashlib.md5(f"{title}|{link}".encode()).hexdigest()

    def _categorize(self, title, summary):
        text = f"{title} {summary}".lower()
        for kat_name, kat_info in self.kategorien.items():
            if not kat_info.get("enabled", True):
                continue
            for keyword in kat_info.get("keywords", []):
                if keyword.lower() in text:
                    return kat_name, kat_info.get("emoji", "📰")
        return None, None

    def _clean_summary(self, summary):
        clean = re.sub(r'<[^>]+>', '', summary)
        clean = ' '.join(clean.split())
        if len(clean) > self.summary_length:
            clean = clean[:self.summary_length] + "..."
        return clean

    def fetch_articles(self):
        all_articles = []
        for source in self.sources:
            try:
                feed = feedparser.parse(source["url"])
                for entry in feed.entries[:10]:
                    title = entry.get("title", "")
                    link = entry.get("link", "")
                    summary = entry.get("summary", entry.get("description", ""))
                    if not title or not link:
                        continue
                    h = self._hash_article(title, link)
                    with self._lock:
                        if h in self.seen_articles:
                            continue
                    kat, emoji = self._categorize(title, summary)
                    if not kat:
                        continue
                    all_articles.append({
                        "title": title,
                        "link": link,
                        "summary": self._clean_summary(summary),
                        "source": source["name"],
                        "kategorie": kat,
                        "emoji": emoji,
                        "hash": h
                    })
            except Exception as e:
                log(self.name, f"⚠️ Feed-Fehler ({source['name']}): {e}")
        return all_articles

    def send_to_slack(self, articles):
        if not articles:
            return
        grouped = {}
        for art in articles:
            grouped.setdefault(art["kategorie"], []).append(art)

        for kat, arts in grouped.items():
            emoji = self.kategorien[kat]["emoji"]
            message = f"{emoji} *{kat.upper()}* — {len(arts)} neue Nachricht(en)\n\n"
            for art in arts[:self.max_articles]:
                message += f"*{art['title']}*\n"
                message += f"_{art['source']}_\n"
                if art['summary']:
                    message += f"{art['summary']}\n"
                message += f"<{art['link']}|→ Zum Artikel>\n\n"
                with self._lock:
                    self.seen_articles.add(art["hash"])
            self.send_slack(message)

        self._save_seen()

    def check_news(self):
        log(self.name, "🔍 Prüfe Nachrichten...")
        articles = self.fetch_articles()
        if not articles:
            log(self.name, "📭 Keine neuen relevanten Nachrichten")
            return
        log(self.name, f"📬 {len(articles)} neue Artikel gefunden")
        self.send_to_slack(articles)

    def run(self):
        log(self.name, f"📰 Starte News-Bot (alle {self.interval} Minuten)")
        self.send_slack(
            f"📰 *Nachrichten-Bot ist online!*\n\n"
            f"📡 Quellen: {', '.join(s['name'] for s in self.sources)}\n"
            f"⏰ Prüfung: alle {self.interval} Minuten"
        )
        self.check_news()
        schedule.every(self.interval).minutes.do(self.check_news)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# 4. Musik-Bot
# ============================================================

class MusicBot(BaseBot):
    name = "Musik"
    emoji = "🎵"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.genres = config.get("genres", ["pop"])
        self.languages = config.get("languages", ["de", "en"])
        self.country = config.get("country", "DE")
        self.time = config["schedule"]["time"]

        self.lang_emoji = {
            "de": "🇩🇪", "en": "🇬🇧", "tr": "🇹🇷",
            "es": "🇪🇸", "fr": "🇫🇷", "it": "🇮🇹"
        }

        self.fallback_songs = {
            "german rap": [
                {"title": "501", "artist": "Apache 207"},
                {"title": "Palmen aus Plastik", "artist": "Bonez MC & RAF Camora"},
                {"title": "Roller", "artist": "Apache 207"},
            ],
            "english rap": [
                {"title": "Lose Yourself", "artist": "Eminem"},
                {"title": "Sicko Mode", "artist": "Travis Scott"},
                {"title": "HUMBLE.", "artist": "Kendrick Lamar"},
            ],
            "turkish rap": [
                {"title": "Kalbim Çukurda", "artist": "Ezhel"},
                {"title": "Felaket", "artist": "Ceza"},
                {"title": "Sıkıntı Yok", "artist": "Ben Fero"},
            ],
            "spanish rap": [
                {"title": "Tusa", "artist": "KAROL G"},
                {"title": "La Jeepeta", "artist": "Nio Garcia"},
                {"title": "Bandido", "artist": "Myke Towers"},
            ],
            "krushclub": [
                {"title": "Krushclub Anthem", "artist": "Various Artists"},
                {"title": "Krushfunk Beat", "artist": "Producer"},
            ],
            "krushfunk": [
                {"title": "Funk Krush", "artist": "Producer"},
                {"title": "Krush Vibes", "artist": "Various Artists"},
            ],
        }

        self.generic_fallbacks = [
            {"title": "Bohemian Rhapsody", "artist": "Queen"},
            {"title": "Billie Jean", "artist": "Michael Jackson"},
            {"title": "Blinding Lights", "artist": "The Weeknd"},
        ]

    def _detect_language(self, genre):
        g = genre.lower()
        if "german" in g or "deutsch" in g:
            return "de"
        if "english" in g or "england" in g:
            return "en"
        if "turkish" in g or "türk" in g:
            return "tr"
        if "spanish" in g or "spanien" in g:
            return "es"
        return "de"

    def _get_fallback_song(self, genre):
        if genre in self.fallback_songs:
            song = random.choice(self.fallback_songs[genre])
        else:
            for key, songs in self.fallback_songs.items():
                if key in genre.lower() or genre.lower() in key:
                    song = random.choice(songs)
                    break
            else:
                song = random.choice(self.generic_fallbacks)
        return {
            "title": song["title"], "artist": song["artist"],
            "album": "–", "year": "–", "genre": genre,
            "preview": "", "artwork": "", "apple_music": "",
            "duration_ms": 0, "original_genre": genre,
            "language": self._detect_language(genre)
        }

    def get_song(self, genre=None):
        if not genre:
            genre = random.choice(self.genres)
        url = "https://itunes.apple.com/search"
        params = {
            "term": genre, "media": "music", "entity": "song",
            "limit": 50, "country": self.country
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            if not results:
                return self._get_fallback_song(genre)
            song = random.choice(results)
            return {
                "title": song.get("trackName", "Unbekannt"),
                "artist": song.get("artistName", "Unbekannt"),
                "album": song.get("collectionName", "Unbekannt"),
                "year": song.get("releaseDate", "")[:4],
                "genre": song.get("primaryGenreName", genre),
                "preview": song.get("previewUrl", ""),
                "artwork": song.get("artworkUrl100", "").replace("100x100", "500x500"),
                "apple_music": song.get("trackViewUrl", ""),
                "duration_ms": song.get("trackTimeMillis", 0),
                "original_genre": genre,
                "language": self._detect_language(genre)
            }
        except Exception as e:
            log(self.name, f"⚠️ iTunes-Fehler: {e}")
            return self._get_fallback_song(genre)

    def format_duration(self, ms):
        if not ms:
            return "–"
        s = ms // 1000
        return f"{s // 60}:{s % 60:02d}"

    def send_song(self):
        log(self.name, "🎵 Poste Song...")
        song = self.get_song()
        lang = song.get("language", "de")
        flag = self.lang_emoji.get(lang, "🌍")

        message = f"🎵 *Song des Tages* {flag}\n\n"
        message += f"*{song['title']}*\n"
        message += f"🎤 {song['artist']}\n"
        if song['album'] != "–":
            message += f"💿 {song['album']} ({song['year']})\n"
        if song['genre']:
            message += f"🏷️ {song['genre']}\n"
        if song['duration_ms']:
            message += f"⏱️ {self.format_duration(song['duration_ms'])}\n"
        message += f"🎯 Genre: _{song['original_genre']}_\n\n"
        if song['apple_music']:
            message += f"🎧 <{song['apple_music']}|Auf Apple Music hören>\n"
        yt = f"https://www.youtube.com/results?search_query={song['title'].replace(' ', '+')}+{song['artist'].replace(' ', '+')}"
        message += f"▶️ <{yt}|Auf YouTube suchen>\n"
        if song['preview']:
            message += f"\n🔊 <{song['preview']}|30-Sekunden-Vorschau>"
        message += "\n\n_— Dein Musik-Bot_ 🎵"
        self.send_slack(message)

    def run(self):
        log(self.name, f"🎵 Starte Musik-Bot (täglich um {self.time})")
        genres_str = "\n".join([f"   • {g}" for g in self.genres])
        self.send_slack(
            f"🎵 *Musik-Bot ist online!*\n\n"
            f"⏰ Postet täglich um *{self.time}*\n\n"
            f"🎸 Genres:\n{genres_str}\n\n"
            f"🌍 Sprachen: {', '.join(self.lang_emoji.get(l, l) for l in self.languages)}"
        )
        schedule.every().day.at(self.time).do(self.send_song)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# 5. Witz-Bot
# ============================================================

class JokeBot(BaseBot):
    name = "Witz"
    emoji = "😄"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.categories = config.get("categories", ["Misc", "Pun"])
        self.morning = config["schedule"]["morning"]
        self.evening = config["schedule"]["evening"]

        self.fallback_jokes = [
            "Warum können Geister so gut lügen? Weil sie durchsichtig sind! 👻",
            "Was sagt ein Gen, das traurig ist? 'Ich bin desolat!' 🧬",
            "Warum nehmen Skelette keinen Regenschirm mit? Weil sie schon durchnässt sind! 💀",
            "Was macht ein Clown im Büro? Faxen! 🤡",
            "Warum können Bienen so gut rechnen? Weil sie den Summ-en kennen! 🐝",
            "Was ist orange und geht über den Berg? Eine Wanderine! 🍊",
            "Warum hat der Kuchen den Bäcker verlassen? Weil er nicht mehr gebacken werden wollte! 🎂",
            "Was macht ein Pirat auf einem Segelflugzeug? Er sucht nach dem Himmel-Pirat! 🏴‍☠️",
        ]

    def get_joke(self):
        category = random.choice(self.categories)
        params = {
            "blacklistFlags": "nsfw,religious,political,racist,sexist,explicit",
            "safe-mode": "true", "type": "single"
        }
        try:
            response = requests.get(
                f"https://v2.jokeapi.dev/joke/{category}",
                params=params, timeout=10
            )
            response.raise_for_status()
            data = response.json()
            if data.get("error"):
                return self._get_fallback_joke()
            if data.get("category", "").lower() == "programming":
                return self._get_fallback_joke()
            return data.get("joke", self._get_fallback_joke())
        except Exception as e:
            log(self.name, f"⚠️ JokeAPI-Fehler: {e}")
            return self._get_fallback_joke()

    def _get_fallback_joke(self):
        return random.choice(self.fallback_jokes)

    def send_joke(self):
        log(self.name, "😄 Poste Witz...")
        joke = self.get_joke()
        message = f"😄 *Witz des Moments*\n\n{joke}\n\n_— Dein Witz-Bot_ 🎭"
        self.send_slack(message)

    def run(self):
        log(self.name, f"😄 Starte Witz-Bot (täglich um {self.morning} & {self.evening})")
        self.send_slack(
            f"😄 *Witz-Bot ist online!*\n\n"
            f"⏰ Postet täglich um *{self.morning}* und *{self.evening}*\n"
            f"🏷️ Kategorien: {', '.join(self.categories)}"
        )
        schedule.every().day.at(self.morning).do(self.send_joke)
        schedule.every().day.at(self.evening).do(self.send_joke)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# 6. Fun-Fact-Bot
# ============================================================

class FunFactBot(BaseBot):
    name = "FunFact"
    emoji = "🧠"

    def __init__(self, config, slack_client, channel):
        super().__init__(config, slack_client, channel)
        self.categories = config.get("categories", ["wissenschaft"])
        self.time = config["schedule"]["time"]

        self.category_emoji = {
            "wissenschaft": "🔬", "technik": "💻", "geschichte": "🏛️",
            "natur": "🌿", "weltraum": "🚀", "tiere": "🐾",
            "mensch": "🧠", "erde": "🌍"
        }

        self.fallback_facts = {
            "wissenschaft": [
                "Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.",
                "Der Mensch teilt etwa 60% seiner DNA mit Bananen.",
                "Honig verdirbt nie – man hat 3000 Jahre alten Honig in ägyptischen Gräbern gefunden, der noch essbar war.",
                "Ein Teelöffel Neutronenstern-Material würde etwa 6 Milliarden Tonnen wiegen.",
                "Wasser kann gleichzeitig kochen und gefrieren – das nennt man den 'Tripelpunkt'.",
                "Die DNA des Menschen ist zu 99,9% mit der jedes anderen Menschen identisch.",
            ],
            "technik": [
                "Der erste Computer-Fehler war eine echte Motte im Computer (1947).",
                "Das erste Computer-Programm wurde 1843 von Ada Lovelace geschrieben – 100 Jahre vor dem ersten Computer!",
                "Ein modernes Smartphone hat mehr Rechenleistung als der Apollo-11-Computer.",
                "Die erste Webcam wurde 1991 erfunden, um den Kaffee-Vorrat in einem Büro zu überwachen.",
                "Das @-Zeichen wurde 1971 von Ray Tomlinson für E-Mails ausgewählt.",
            ],
            "geschichte": [
                "Cleopatra lebte näher an der Erfindung des iPhone als am Bau der Pyramiden.",
                "Die Universität Oxford ist älter als das Aztekenreich.",
                "Napoleon war nicht klein – er war 1,68 m, was damals Durchschnitt war.",
                "Der 100-jährige Krieg dauerte 116 Jahre.",
                "Die Französische Revolution begann 1789 – im selben Jahr wurde die erste US-Regierung gebildet.",
            ],
            "natur": [
                "Ein Blitz ist etwa 30.000°C heiß – 5x heißer als die Oberfläche der Sonne.",
                "Der Amazonas-Regenwald produziert etwa 20% des Sauerstoffs der Erde.",
                "Ein einziger Baum kann über 100.000 Blätter haben.",
                "Die höchste Welle, die je gemessen wurde, war 524 Meter hoch (Tsunami 1958).",
                "Es gibt mehr Bäume auf der Erde (3 Billionen) als Sterne in der Milchstraße.",
            ],
            "weltraum": [
                "Die Sonne macht 99,86% der Masse unseres Sonnensystems aus.",
                "Auf dem Mars würde ein Sonnenuntergang blau erscheinen.",
                "Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.",
                "Der Mond entfernt sich jedes Jahr etwa 3,8 cm von der Erde.",
                "Jupiter hat 95 bekannte Monde – Tendenz steigend.",
                "Licht von der Sonne braucht 8 Minuten und 20 Sekunden bis zur Erde.",
            ],
            "tiere": [
                "Ein Oktopus hat drei Herzen und blaues Blut.",
                "Kühe haben beste Freunde und werden gestresst, wenn man sie trennt.",
                "Ein Kolibri schlägt bis zu 80 Mal pro Sekunde mit den Flügeln.",
                "Elefanten sind die einzigen Tiere, die nicht springen können.",
                "Schmetterlinge schmecken mit ihren Füßen.",
                "Ein Faultier braucht bis zu 30 Tage, um eine Mahlzeit zu verdauen.",
            ],
        }

    def _get_api_fact(self):
        try:
            response = requests.get(
                "https://uselessfacts.jsph.pl/api/v2/facts/random",
                params={"language": "de"}, timeout=10
            )
            response.raise_for_status()
            data = response.json()
            fact = data.get("text", "").strip()
            if fact:
                return fact
        except Exception as e:
            log(self.name, f"⚠️ API-Fehler: {e}")
        return None

    def get_fact(self):
        category = random.choice(self.categories)
        fact = self._get_api_fact()
        if not fact:
            if category in self.fallback_facts:
                fact = random.choice(self.fallback_facts[category])
            else:
                all_facts = []
                for facts in self.fallback_facts.values():
                    all_facts.extend(facts)
                fact = random.choice(all_facts)
        return {
            "fact": fact, "category": category,
            "emoji": self.category_emoji.get(category, "💡")
        }

    def send_fact(self):
        log(self.name, "🧠 Poste Fun Fact...")
        data = self.get_fact()
        message = f"🧠 *Fun Fact des Tages*\n\n"
        message += f"{data['emoji']} _{data['category'].capitalize()}_\n\n"
        message += f"{data['fact']}\n\n"
        message += f"_— Dein Fun-Fact-Bot_ 🧠"
        self.send_slack(message)

    def run(self):
        log(self.name, f"🧠 Starte Fun-Fact-Bot (täglich um {self.time})")
        self.send_slack(
            f"🧠 *Fun-Fact-Bot ist online!*\n\n"
            f"⏰ Postet täglich um *{self.time}*\n"
            f"🏷️ Kategorien: {', '.join(self.categories)}\n"
            f"🇩🇪 Nur auf Deutsch"
        )
        schedule.every().day.at(self.time).do(self.send_fact)

        while not self.stopped():
            schedule.run_pending()
            time.sleep(30)


# ============================================================
# Hauptprogramm
# ============================================================

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)

    config = load_config()

    if "DEIN-TOKEN" in config["slack"]["bot_token"]:
        print("❌ Bitte Bot-Token in config.json eintragen!")
        sys.exit(1)

    bot_token = config["slack"]["bot_token"]
    channel = config["slack"]["channel"]

    slack_client = WebClient(token=bot_token)

    # Test-Nachricht
    try:
        slack_client.chat_postMessage(
            channel=channel,
            text="🤖 *Daily-Bot wird gestartet...*\n\nAlle Bots werden hochgefahren! 🚀",
            mrkdwn=True
        )
    except SlackApiError as e:
        print(f"❌ Slack-Verbindung fehlgeschlagen: {e.response['error']}")
        sys.exit(1)

    print("=" * 60)
    print("🤖 Daily-Bot wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print(f"📢 Channel: {channel}")
    print("=" * 60)

    # Alle aktivierten Bots starten
    bots = []

    if config.get("weather", {}).get("enabled", False):
        bots.append(WeatherBot(config["weather"], slack_client, channel))
    if config.get("quote", {}).get("enabled", False):
        bots.append(QuoteBot(config["quote"], slack_client, channel))
    if config.get("news", {}).get("enabled", False):
        bots.append(NewsBot(config["news"], slack_client, channel))
    if config.get("music", {}).get("enabled", False):
        bots.append(MusicBot(config["music"], slack_client, channel))
    if config.get("joke", {}).get("enabled", False):
        bots.append(JokeBot(config["joke"], slack_client, channel))
    if config.get("funfact", {}).get("enabled", False):
        bots.append(FunFactBot(config["funfact"], slack_client, channel))

    if not bots:
        print("❌ Keine Bots aktiviert! Prüfe config.json")
        sys.exit(1)

    print(f"\n✅ {len(bots)} Bot(s) werden gestartet:")
    for bot in bots:
        print(f"   {bot.emoji} {bot.name}")
    print()

    for bot in bots:
        bot.start()
        time.sleep(1)  # Kurz warten zwischen Starts

    print("\n⏳ Daily-Bot läuft. Alle Bots aktiv.")
    print("   (Strg+C zum Beenden)\n")

    try:
        while True:
            # Prüfen ob alle Bots noch laufen
            alive = [b for b in bots if b.is_alive()]
            if not alive:
                print("⚠️ Alle Bots beendet – Daily-Bot stoppt.")
                break
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n\n👋 Daily-Bot wird beendet...")
        for bot in bots:
            bot.stop()
        try:
            slack_client.chat_postMessage(
                channel=channel,
                text="🤖 *Daily-Bot wird beendet* 👋\n\nAlle Bots fahren herunter.",
                mrkdwn=True
            )
        except Exception:
            pass


if __name__ == "__main__":
    main()