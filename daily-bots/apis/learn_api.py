import logging
import requests
from urllib.parse import quote
from groq import Groq

logger = logging.getLogger(__name__)

def fetch_wikipedia(topic):
    url = f"https://de.wikipedia.org/api/rest_v1/page/summary/{quote(topic)}"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"Wikipedia-API Fehler: {e}")
        return None

def summarize_with_groq(api_key, topic, raw_text):
    try:
        client = Groq(api_key=api_key, timeout=15.0)
        system_prompt = (
            "Du bist ein begeisterter Wissenschafts-Erklärer. "
            "Fasse den folgenden Wikipedia-Text in 3-4 spannenden, leicht verständlichen Sätzen zusammen. "
            "Beginne direkt mit der Erklärung. Nutze Slack-Formatierung (*fett* für Schlüsselbegriffe)."
        )
        chat = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Thema: {topic}\n\nText:\n{raw_text}"}
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=300,
        )
        return chat.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq-API Fehler: {e}")
        return raw_text[:400] + "..." # Fallback auf rohen Text