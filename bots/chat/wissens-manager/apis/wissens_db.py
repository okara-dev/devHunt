"""
Wissens-Datenbank (SQLite + Vektoren)
"""

import sqlite3
import os
import pickle
import numpy as np
from datetime import datetime


class WissensDB:
    def __init__(self, db_path="wissen.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Dokumente
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dokumente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pfad TEXT UNIQUE,
                dateiname TEXT,
                typ TEXT,
                hinzugefuegt TEXT
            )
        ''')
        
        # Chunks (Text-Stücke)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dokument_id INTEGER,
                chunk_nummer INTEGER,
                text TEXT,
                embedding BLOB,
                FOREIGN KEY (dokument_id) REFERENCES dokumente(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_document(self, pfad, dateiname, typ):
        """Fügt ein Dokument hinzu (gibt ID zurück)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO dokumente (pfad, dateiname, typ, hinzugefuegt)
                VALUES (?, ?, ?, ?)
            ''', (pfad, dateiname, typ, datetime.now().isoformat()))
            conn.commit()
            doc_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            # Existiert schon → ID holen
            cursor.execute('SELECT id FROM dokumente WHERE pfad = ?', (pfad,))
            doc_id = cursor.fetchone()[0]
        
        conn.close()
        return doc_id
    
    def add_chunk(self, doc_id, nummer, text, embedding):
        """Fügt einen Chunk hinzu"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        embedding_blob = pickle.dumps(embedding) if embedding is not None else None
        
        cursor.execute('''
            INSERT INTO chunks (dokument_id, chunk_nummer, text, embedding)
            VALUES (?, ?, ?, ?)
        ''', (doc_id, nummer, text, embedding_blob))
        
        conn.commit()
        conn.close()
    
    def get_all_chunks(self):
        """Alle Chunks mit Embeddings"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.id, c.dokument_id, c.text, c.embedding, d.dateiname
            FROM chunks c
            JOIN dokumente d ON c.dokument_id = d.id
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        chunks = []
        for row in rows:
            chunk_id, doc_id, text, embedding_blob, dateiname = row
            embedding = pickle.loads(embedding_blob) if embedding_blob else None
            chunks.append({
                "id": chunk_id,
                "doc_id": doc_id,
                "text": text,
                "embedding": embedding,
                "dateiname": dateiname
            })
        
        return chunks
    
    def search_semantic(self, query_embedding, chunks, top_k=5):
        """Semantische Suche"""
        if query_embedding is None:
            return []
        
        results = []
        for chunk in chunks:
            if chunk["embedding"] is not None:
                sim = float(np.dot(query_embedding, chunk["embedding"]))
                results.append((chunk, sim))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    def search_fulltext(self, query, top_k=5):
        """Volltext-Suche"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.id, c.dokument_id, c.text, d.dateiname
            FROM chunks c
            JOIN dokumente d ON c.dokument_id = d.id
            WHERE c.text LIKE ?
            LIMIT ?
        ''', (f"%{query}%", top_k))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {"id": r[0], "doc_id": r[1], "text": r[2], "dateiname": r[3], "score": 1.0}
            for r in rows
        ]
    
    def get_stats(self):
        """Statistik"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM dokumente')
        num_docs = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM chunks')
        num_chunks = cursor.fetchone()[0]
        
        conn.close()
        
        return {"dokumente": num_docs, "chunks": num_chunks}
    
    def delete_document(self, doc_id):
        """Löscht ein Dokument + seine Chunks"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM chunks WHERE dokument_id = ?', (doc_id,))
        cursor.execute('DELETE FROM dokumente WHERE id = ?', (doc_id,))
        
        conn.commit()
        conn.close()
    
    def list_documents(self):
        """Listet alle Dokumente"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, dateiname, typ, hinzugefuegt FROM dokumente ORDER BY hinzugefuegt DESC')
        rows = cursor.fetchall()
        conn.close()
        return rows