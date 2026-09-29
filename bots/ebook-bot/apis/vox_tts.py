"""
Vox TTS – Text-to-Speech mit Piper
Für E-Book-Bot (ganzes Buch als eine WAV)
"""

import os
import wave
from pathlib import Path
from piper import PiperVoice

class VoxTTS:
    def __init__(self, config):
        vox_config = config.get("vox", {})
        self.model_path = vox_config.get("model_path")
        self.config_path = vox_config.get("config_path")
        
        if not self.model_path or not Path(self.model_path).exists():
            raise FileNotFoundError(f"Vox-Modell nicht gefunden: {self.model_path}")
        if not self.config_path or not Path(self.config_path).exists():
            raise FileNotFoundError(f"Vox-Config nicht gefunden: {self.config_path}")
        
        print("📥 Lade Vox-Stimme...")
        self.voice = PiperVoice.load(self.model_path, config_path=self.config_path)
        self.sample_rate = self.voice.config.sample_rate
        print("✅ Vox-Stimme geladen\n")
    
    def build_full_text(self, title, thema, kapitel_liste):
        """Baut einen langen Text aus allen Kapiteln"""
        lines = []
        lines.append(f"{title}.")
        lines.append(f"Ein psychologischer Roman über {thema}.")
        lines.append("")
        
        for i, kap in enumerate(kapitel_liste, 1):
            lines.append(f"Kapitel {i}: {kap['titel']}.")
            lines.append("")
            lines.append(kap["text"])
            lines.append("")
        
        lines.append("Ende.")
        return "\n".join(lines)
    
    def text_to_wav(self, text, output_path):
        """Wandelt Text in eine WAV-Datei um"""
        try:
            print(f"   🎙️  Generiere Audio ({len(text):,} Zeichen)...")
            
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.sample_rate)
                
                # Piper gibt Chunks zurück
                for chunk in self.voice.synthesize(text):
                    wav_file.writeframes(chunk.audio_int16_bytes)
            
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"   ✅ Audio gespeichert ({size_mb:.1f} MB)")
            return output_path
        except Exception as e:
            print(f"   ❌ Vox-Fehler: {e}")
            return None