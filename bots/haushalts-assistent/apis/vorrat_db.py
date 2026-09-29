"""
Vorrats-Datenbank (SQLite)
"""

import sqlite3
import os
from datetime import datetime

class VorratDB:
    def __init__(self, db_path="vorrat.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Erstellt die Tabellen"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vorrat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                menge TEXT,
                kategorie TEXT,
                haltbar_bis TEXT,
                hinzugefuegt TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_item(self, name, menge="", kategorie="", haltbar_bis=""):
        """Fügt ein Item zum Vorrat hinzu"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO vorrat (name, menge, kategorie, haltbar_bis, hinzugefuegt)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, menge, kategorie, haltbar_bis, datetime.now().isoformat()))
        
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return item_id
    
    def get_all(self):
        """Gibt alle Items zurück"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, menge, kategorie, haltbar_bis FROM vorrat ORDER BY kategorie, name')
        items = cursor.fetchall()
        conn.close()
        return items
    
    def delete_item(self, item_id):
        """Löscht ein Item"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM vorrat WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
    
    def clear(self):
        """Löscht den kompletten Vorrat"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM vorrat')
        conn.commit()
        conn.close()
    
    def format(self, items):
        """Formatiert die Vorratsliste"""
        if not items:
            return "📦 Dein Vorrat ist leer."
        
        # Nach Kategorie gruppieren
        kategorien = {}
        for item in items:
            item_id, name, menge, kategorie, haltbar_bis = item
            kat = kategorie if kategorie else "Sonstiges"
            if kat not in kategorien:
                kategorien[kat] = []
            kategorien[kat].append((item_id, name, menge, haltbar_bis))
        
        lines = ["📦 **DEIN VORRAT**", "=" * 40]
        
        for kat, items_list in kategorien.items():
            lines.append(f"\n🏷️  **{kat}:**")
            for item_id, name, menge, haltbar_bis in items_list:
                line = f"   [{item_id}] {name}"
                if menge:
                    line += f" ({menge})"
                if haltbar_bis:
                    line += f" - haltbar bis {haltbar_bis}"
                lines.append(line)
        
        return "\n".join(lines)