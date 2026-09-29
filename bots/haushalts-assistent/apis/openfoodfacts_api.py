"""
Open Food Facts API – Nährwerte
"""

import requests
import time

class OpenFoodFactsAPI:
    def __init__(self):
        self.base_url = "https://world.openfoodfacts.org"
        self.headers = {
            "User-Agent": "HaushaltsAssistent/1.0"
        }
    
    def search_product(self, name, retries=3):
        name = name.strip().rstrip("#").strip()
        
        for attempt in range(retries):
            try:
                response = requests.get(
                    f"{self.base_url}/cgi/search.pl",
                    params={
                        "search_terms": name,
                        "search_simple": 1,
                        "action": "process",
                        "json": 1,
                        "page_size": 1
                    },
                    headers=self.headers,
                    timeout=15
                )
                
                if response.status_code == 503:
                    if attempt < retries - 1:
                        time.sleep((attempt + 1) * 2)
                        continue
                    return None
                
                response.raise_for_status()
                data = response.json()
                products = data.get("products", [])
                return products[0] if products else None
            except Exception as e:
                if attempt == retries - 1:
                    print(f"⚠️ Open Food Facts Fehler: {e}")
                time.sleep(2)
        
        return None
    
    def format(self, product):
        if not product:
            return "🥗 Kein Produkt gefunden."
        
        name = product.get("product_name", "Unbekannt")
        brand = product.get("brands", "?")
        quantity = product.get("quantity", "?")
        
        nutriments = product.get("nutriments", {})
        energy = nutriments.get("energy-kcal_100g", "?")
        fat = nutriments.get("fat_100g", "?")
        carbs = nutriments.get("carbohydrates_100g", "?")
        proteins = nutriments.get("proteins_100g", "?")
        salt = nutriments.get("salt_100g", "?")
        sugar = nutriments.get("sugars_100g", "?")
        
        nutriscore = product.get("nutriscore_grade", "?").upper()
        
        return f"""
🥗 **{name}**

🏢 Marke: {brand}
⚖️ Menge: {quantity}

📊 **Nährwerte pro 100g:**
   🔥 Kalorien: {energy} kcal
   🧈 Fett: {fat} g
   🍞 Kohlenhydrate: {carbs} g
   🍬 Zucker: {sugar} g
   🥩 Proteine: {proteins} g
   🧂 Salz: {salt} g

🏆 Nutri-Score: {nutriscore}
"""