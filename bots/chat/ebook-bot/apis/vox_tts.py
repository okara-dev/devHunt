"""
Vox TTS – Text-to-Speech mit Piper
Erstellt WAV → konvertiert zu MP3 (kleiner für E-Mail)
"""

import os
import wave
from pathlib import Path
from piper import PiperVoice
from pydub import AudioSegment


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
    
    def text_to_wav(self, text, wav_path):
        """Wandelt Text in eine WAV-Datei um"""
        try:
            print(f"   🎙️  Generiere Audio ({len(text):,} Zeichen)...")
            
            with wave.open(wav_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.sample_rate)
                
                for chunk in self.voice.synthesize(text):
                    wav_file.writeframes(chunk.audio_int16_bytes)
            
            size_mb = os.path.getsize(wav_path) / (1024 * 1024)
            print(f"   ✅ WAV gespeichert ({size_mb:.1f} MB)")
            return wav_path
        except Exception as e:
            print(f"   ❌ Vox-Fehler: {e}")
            return None
    
    def wav_to_mp3(self, wav_path, mp3_path, bitrate="128k"):
        """
        Konvertiert WAV zu MP3 (10x kleiner).
        :param bitrate: 128k (gut), 96k (kleiner), 64k (klein)
        """
        try:
            print(f"   🔄 Konvertiere WAV → MP3...")
            
            audio = AudioSegment.from_wav(wav_path)
            audio.export(mp3_path, format="mp3", bitrate=bitrate)
            
            size_mb = os.path.getsize(mp3_path) / (1024 * 1024)
            print(f"   ✅ MP3 gespeichert ({size_mb:.1f} MB)")
            return mp3_path
        except Exception as e:
            print(f"   ❌ MP3-Konvertierung fehlgeschlagen: {e}")
            return None
    
    def text_to_speech(self, text, output_path, format="mp3", bitrate="128k"):
        """
        Kompletter Workflow: Text → WAV → MP3
        Löscht die WAV danach.
        """
        # Temporäre WAV-Datei
        wav_path = output_path.replace(".mp3", ".wav")
        
        # WAV erstellen
        wav_result = self.text_to_wav(text, wav_path)
        if not wav_result:
            return None
        
        # Wenn MP3 gewünscht → konvertieren
        if format == "mp3":
            mp3_result = self.wav_to_mp3(wav_path, output_path, bitrate)
            
            # WAV löschen
            try:
                os.remove(wav_path)
            except:
                pass
            
            return mp3_result
        
        # Sonst: WAV umbenennen
        try:
            os.rename(wav_path, output_path)
        except:
            pass
        
        return output_path