const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'groq/compound-mini';

/**
 * System-Prompt: Einheitliche Formatierungs-Regeln
 */
const SYSTEM_BASE = `Du bist ein hilfreicher Assistent, der Dokumente analysiert.

FORMATIERUNGS-REGELN (WICHTIG!):
- Verwende KEINE Tabellen (Markdown-Tabellen sind im Terminal unlesbar).
- Nutze stattdessen klare Überschriften und Aufzählungen.
- Strukturiere die Antwort mit Emojis als visuelle Anker.
- Halte Absätze kurz (max. 2-3 Sätze).
- Nutze **Fett** für Schlüsselwörter.
- Bei Listen: nutze "•" oder "-" für Aufzählungen.
- Nummeriere Abschnitte wenn sinnvoll (1., 2., 3.).
- Antworte auf {language}.
- Sei präzise, nicht ausschweifend.`;

/**
 * Sendet Text an Groq zur Analyse
 */
export async function analyzeWithGroq(text, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY ist nicht gesetzt');
  }

  const mode = options.mode || 'analyze';
  const language = options.language || 'Deutsch';
  const customPrompt = options.prompt || null;

  const systemPrompt = SYSTEM_BASE.replace('{language}', language);

  let userPrompt;

  if (customPrompt) {
    userPrompt = `${customPrompt}

Bitte formatiere die Antwort wie folgt:
- Überschrift mit 📌
- Aufzählungen mit •
- Keine Tabellen!

--- DOKUMENT ---
${text}`;
  } else {
    switch (mode) {
      case 'summary':
        userPrompt = `Fasse das folgende Dokument zusammen.

Format:
## 📋 Zusammenfassung

**Kurzbeschreibung:** (1-2 Sätze)

**Inhalt:**
• Punkt 1
• Punkt 2
• Punkt 3

**Fazit:** (1 Satz)

--- DOKUMENT ---
${text}`;
        break;

      case 'explain':
        userPrompt = `Erkläre das folgende Dokument einfach und verständlich.

Format:
## 💡 Einfach erklärt

**Worum geht es?**
(Kurze Antwort)

**Was steht drin?**
• Punkt 1
• Punkt 2

**Was bedeutet das?**
(Kurze Antwort)

--- DOKUMENT ---
${text}`;
        break;

      case 'keypoints':
        userPrompt = `Extrahiere die wichtigsten Punkte aus dem folgenden Dokument.

Format:
## 🎯 Wichtigste Punkte

1. **Punkt 1** – kurze Erklärung
2. **Punkt 2** – kurze Erklärung
3. **Punkt 3** – kurze Erklärung

(max. 7 Punkte, sortiert nach Wichtigkeit)

--- DOKUMENT ---
${text}`;
        break;

      case 'analyze':
      default:
        userPrompt = `Analysiere das folgende Dokument strukturiert.

Format:

## 📄 Dokumenttyp
(Kurze Antwort: Was ist das für ein Dokument?)

## 📝 Inhalt
(Kurze Zusammenfassung in 2-3 Sätzen)

## 🎯 Wichtigste Punkte
• **Punkt 1** – kurze Erklärung
• **Punkt 2** – kurze Erklärung
• **Punkt 3** – kurze Erklärung

## ⚠️ Auffälligkeiten
• Auffälligkeit 1
• Auffälligkeit 2
(Falls keine: "Keine besonderen Auffälligkeiten.")

## ✅ Fazit
(Kurzes Fazit in 1-2 Sätzen)

--- DOKUMENT ---
${text}`;
        break;
    }
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2048
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data.error?.message || JSON.stringify(data);
    throw new Error(`Groq API Fehler (${response.status}): ${errMsg}`);
  }

  return {
    result: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
    model: data.model
  };
}

/**
 * Prüft ob der API Key gültig ist
 */
export async function checkApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 5
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}