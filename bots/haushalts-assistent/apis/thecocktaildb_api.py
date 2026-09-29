"""
TheCocktailDB API – Cocktails
"""

import requests

class TheCocktailDBAPI:
    def __init__(self):
        self.base_url = "https://www.thecocktaildb.com/api/json/v1/1"
    
    def search_cocktail(self, name):
        try:
            response = requests.get(
                f"{self.base_url}/search.php",
                params={"s": name},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            drinks = data.get("drinks", [])
            return drinks[0] if drinks else None
        except Exception as e:
            print(f"⚠️ TheCocktailDB Fehler: {e}")
            return None
    
    def get_random_cocktail(self):
        try:
            response = requests.get(f"{self.base_url}/random.php", timeout=10)
            response.raise_for_status()
            data = response.json()
            drinks = data.get("drinks", [])
            return drinks[0] if drinks else None
        except Exception as e:
            print(f"⚠️ TheCocktailDB Fehler: {e}")
            return None
    
    def format(self, drink):
        if not drink:
            return "🍹 Kein Cocktail gefunden."
        
        name = drink.get("strDrink", "Unbekannt")
        category = drink.get("strCategory", "?")
        alcoholic = drink.get("strAlcoholic", "?")
        glass = drink.get("strGlass", "?")
        instructions = drink.get("strInstructions", "Keine Anleitung")
        image = drink.get("strDrinkThumb", "")
        
        ingredients = []
        for i in range(1, 16):
            ing = drink.get(f"strIngredient{i}", "")
            measure = drink.get(f"strMeasure{i}", "")
            if ing and ing.strip():
                ingredients.append(f"{measure.strip()} {ing.strip()}".strip())
        
        ing_str = "\n   • " + "\n   • ".join(ingredients) if ingredients else "Keine Zutaten"
        
        return f"""
🍹 **{name}**

📂 Kategorie: {category}
🍷 Alkoholisch: {alcoholic}
🥃 Glas: {glass}

🖼️ Bild: {image}

📋 **Zutaten:**
   • {ing_str}

👨‍🍳 **Zubereitung:**
{instructions}
"""