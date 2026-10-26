import Groq from 'groq-sdk';

export class LLMClient {
  constructor(apiKey) {
    this.client = new Groq({ apiKey });
    
    // Fallback-Kette: 4 kostenlose Modelle
    // Alle haben ~200K TPD im Free Tier
    this.models = [
      'qwen/qwen3.8-27b',           // Primary
      'openai/gpt-oss-120b',         // Fallback 1
      'openai/gpt-oss-20b',          // Fallback 2
      'llama-3.3-70b-versatile'      // Fallback 3
    ];
    
    this.currentModelIndex = 0;
  }

  getCurrentModel() {
    return this.models[this.currentModelIndex];
  }

  async generate(systemPrompt, userPrompt, maxTokens = 1500, temperature = 0.8) {
    // Versuche alle Modelle nacheinander
    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[(this.currentModelIndex + i) % this.models.length];
      
      try {
        const response = await this.client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: Math.min(maxTokens, 8000),
          temperature
        });
        
        // Erfolg → dieses Modell für zukünftige Aufrufe merken
        this.currentModelIndex = (this.currentModelIndex + i) % this.models.length;
        return response.choices[0].message.content.trim();
        
      } catch (error) {
        const errMsg = error.message.substring(0, 60);
        
        if (error.status === 429 || error.message.includes('rate') || error.message.includes('limit')) {
          console.log(`⚠️  ${model} → Rate Limit (${errMsg})`);
        } else if (error.status === 404 || error.message.includes('not found')) {
          console.log(`⚠️  ${model} → nicht verfügbar`);
        } else {
          console.log(`⚠️  ${model} → Fehler: ${errMsg}`);
        }
        
        // Letztes Modell auch fehlgeschlagen?
        if (i === this.models.length - 1) {
          console.log(`❌ Alle ${this.models.length} Modelle fehlgeschlagen!`);
          return null;
        }
        
        console.log(`   → Wechsle zu ${this.models[(this.currentModelIndex + i + 1) % this.models.length]}...`);
      }
    }
    
    return null;
  }
}