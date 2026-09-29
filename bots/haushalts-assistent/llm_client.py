"""
Groq LLM Client mit automatischem Fallback
"""

from groq import Groq

class LLMClient:
    def __init__(self, api_key):
        self.client = Groq(api_key=api_key)
        self.primary_model = "qwen/qwen3.8-27b"
        self.fallback_model = "openai/gpt-oss-120b"
    
    def generate(self, system_prompt, user_prompt, max_tokens=800, temperature=0.8):
        try:
            response = self.client.chat.completions.create(
                model=self.primary_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=min(max_tokens, 1000),
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            pass
        
        try:
            response = self.client.chat.completions.create(
                model=self.fallback_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"   ⚠️ Beide Modelle fehlgeschlagen: {str(e)[:60]}")
            return None