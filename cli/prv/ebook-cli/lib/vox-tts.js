import fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * VoxTTS – nutzt Piper CLI als externen Prozess
 */
export class VoxTTS {
  constructor(config) {
    const vox = config.vox || {};
    this.piperPath = vox.piper_path || 'piper';
    this.modelPath = vox.model_path;
    this.configPath = vox.config_path;
    this.bitrate = vox.mp3_bitrate || '128k';

    if (!this.modelPath || !fs.existsSync(this.modelPath)) {
      throw new Error(`Vox-Modell nicht gefunden: ${this.modelPath}`);
    }
    if (!this.configPath || !fs.existsSync(this.configPath)) {
      throw new Error(`Vox-Config nicht gefunden: ${this.configPath}`);
    }

    console.log('📥 Vox TTS bereit');
  }

  buildFullText(title, thema, kapitelListe) {
    const lines = [];
    lines.push(`${title}.`);
    lines.push(`Ein Werk über ${thema}.`);
    lines.push('');

    kapitelListe.forEach((kap, i) => {
      if (kapitelListe.length > 1) {
        lines.push(`Kapitel ${i + 1}: ${kap.titel}.`);
        lines.push('');
      }
      lines.push(kap.text);
      lines.push('');
    });

    lines.push('Ende.');
    return lines.join('\n');
  }

  /**
   * Ruft Piper CLI auf: piper --model X --config Y --output_file Z
   * Text wird per stdin übergeben.
   */
  async textToWav(text, wavPath) {
    try {
      console.log(`   🎙️  Generiere Audio (${text.length.toLocaleString()} Zeichen)...`);

      return await new Promise((resolve, reject) => {
        const args = [
          '--model', this.modelPath,
          '--config', this.configPath,
          '--output_file', wavPath
        ];

        const piper = spawn(this.piperPath, args);

        let stderr = '';
        piper.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        piper.on('error', (err) => {
          reject(new Error(`Piper konnte nicht gestartet werden: ${err.message}`));
        });

        piper.on('close', (code) => {
          if (code === 0 && fs.existsSync(wavPath)) {
            const sizeMb = fs.statSync(wavPath).size / (1024 * 1024);
            console.log(`   ✅ WAV gespeichert (${sizeMb.toFixed(1)} MB)`);
            resolve(wavPath);
          } else {
            reject(new Error(`Piper Exit-Code ${code}: ${stderr.substring(0, 200)}`));
          }
        });

        piper.stdin.write(text);
        piper.stdin.end();
      });
    } catch (error) {
      console.log(`   ❌ Vox-Fehler: ${error.message}`);
      return null;
    }
  }

  /**
   * Konvertiert WAV → MP3 mit ffmpeg
   */
  async wavToMp3(wavPath, mp3Path) {
    try {
      console.log(`   🔄 Konvertiere WAV → MP3...`);

      try {
        await execAsync(
          `ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a ${this.bitrate} "${mp3Path}"`,
          { timeout: 300000 }
        );
      } catch (e) {
        // Fallback: lame
        await execAsync(
          `lame -b ${parseInt(this.bitrate)} "${wavPath}" "${mp3Path}"`,
          { timeout: 300000 }
        );
      }

      if (fs.existsSync(mp3Path)) {
        const sizeMb = fs.statSync(mp3Path).size / (1024 * 1024);
        console.log(`   ✅ MP3 gespeichert (${sizeMb.toFixed(1)} MB)`);
        return mp3Path;
      }

      return null;
    } catch (error) {
      console.log(`   ❌ MP3-Konvertierung fehlgeschlagen: ${error.message}`);
      console.log(`   💡 Tipp: Installiere ffmpeg (https://ffmpeg.org)`);
      return null;
    }
  }

  /**
   * Kompletter Workflow: Text → WAV → MP3
   */
  async textToSpeech(text, outputPath, format = 'mp3') {
    const wavPath = outputPath.replace(/\.mp3$/, '.wav');

    const wavResult = await this.textToWav(text, wavPath);
    if (!wavResult) return null;

    if (format === 'mp3') {
      const mp3Result = await this.wavToMp3(wavPath, outputPath);
      try { fs.unlinkSync(wavPath); } catch {}
      return mp3Result;
    }

    try { fs.renameSync(wavPath, outputPath); } catch {}
    return outputPath;
  }
}