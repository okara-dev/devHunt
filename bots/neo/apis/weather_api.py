import requests


# Open-Meteo: kostenlos, kein API-Key nötig
GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


WETTER_CODES = {
    0: "klar", 1: "überwiegend klar", 2: "teilweise bewölkt", 3: "bedeckt",
    45: "neblig", 48: "neblig mit Reif", 51: "leichter Nieselregen",
    53: "Nieselregen", 55: "starker Nieselregen", 61: "leichter Regen",
    63: "Regen", 65: "starker Regen", 71: "leichter Schnee",
    73: "Schnee", 75: "starker Schnee", 80: "Regenschauer",
    81: "Regenschauer", 82: "heftige Regenschauer",
    95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel",
}


def get_weather(city: str) -> str:
    try:
        # 1. Geocoding
        r = requests.get(GEO_URL, params={"name": city, "count": 1, "language": "de"})
        r.raise_for_status()
        data = r.json()
        if "results" not in data or not data["results"]:
            return f"Stadt '{city}' nicht gefunden, Sir."

        loc = data["results"][0]
        lat, lon = loc["latitude"], loc["longitude"]
        name = loc.get("name", city)

        # 2. Wetter
        r = requests.get(WEATHER_URL, params={
            "latitude": lat,
            "longitude": lon,
            "current_weather": True,
            "timezone": "auto",
        })
        r.raise_for_status()
        w = r.json()["current_weather"]

        temp = w["temperature"]
        wind = w["windspeed"]
        code = w["weathercode"]
        desc = WETTER_CODES.get(code, "unbekannt")

        return (f"In {name} sind es aktuell {temp}°C, {desc}. "
                f"Wind: {wind} km/h.")
    except Exception as e:
        return f"Wetterabfrage fehlgeschlagen, Sir: {e}"