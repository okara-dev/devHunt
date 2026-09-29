"""
Ausgaben-Datenbank (SQLite)
"""

import sqlite3
from datetime import datetime

class AusgabenDB:
    def __init__(self, db_path="vorrat.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ausgaben (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datum TEXT,
                geschaeft TEXT,
                betrag REAL,
                kategorie TEXT,
                artikel TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_ausgabe(self, datum, geschaeft, betrag, kategorie="", artikel=""):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO ausgaben (datum, geschaeft, betrag, kategorie, artikel)
            VALUES (?, ?, ?, ?, ?)
        ''', (datum, geschaeft, betrag, kategorie, artikel))
        
        conn.commit()
        conn.close()
    
    def get_monat(self, monat=None):
        """Gibt alle Ausgaben eines Monats zurück"""
        if monat is None:
            monat = datetime.now().strftime("%Y-%m")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT datum, geschaeft, betrag FROM ausgaben
            WHERE datum LIKE ?
            ORDER BY datum DESC
        ''', (f"{monat}%",))
        
        items = cursor.fetchall()
        conn.close()
        return items
    
    def get_summe(self, monat=None):
        """Summe aller Ausgaben eines Monats"""
        if monat is None:
            monat = datetime.now().strftime("%Y-%m")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT SUM(betrag) FROM ausgaben
            WHERE datum LIKE ?
        ''', (f"{monat}%",))
        
        result = cursor.fetchone()[0]
        conn.close()
        return result if result else 0.0
    
    def format_monat(self, monat=None):
        """Formatiert die Monatsausgaben"""
        if monat is None:
            monat = datetime.now().strftime("%Y-%m")
        
        items = self.get_monat(monat)
        summe = self.get_summe(monat)
        
        if not items:
            return f"💰 Keine Ausgaben im Monat {monat}."
        
        lines = [f"💰 **AUSGABEN {monat}**", "=" * 40]
        
        for datum, geschaeft, betrag in items:
            lines.append(f"   {datum} | {geschaeft} | {betrag:.2f} €")
        
        lines.append("=" * 40)
        lines.append(f"💵 **Gesamt: {summe:.2f} €**")
        
        return "\n".join(lines)