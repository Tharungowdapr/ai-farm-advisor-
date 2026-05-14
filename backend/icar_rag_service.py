import json
import logging
import numpy as np
from pathlib import Path
import os
from dotenv import load_dotenv
import requests

load_dotenv()
logger = logging.getLogger(__name__)
OPENROUTER_API_KEY = os.getenv("GEMINI_API_KEY")

DATA_DIR = Path(__file__).parent / "data"

class ICARRagService:
    def __init__(self):
        self.documents = []
        self.embeddings = []
        self._load_and_embed_data()
        
    def _load_and_embed_data(self):
        dataset_path = DATA_DIR / "synthetic_icar_data.json"
        if not dataset_path.exists():
            logger.error("ICAR synthetic dataset not found!")
            return
            
        with open(dataset_path, 'r') as f:
            self.documents = json.load(f)
            
        # cache embeddings to avoid re-calculating on startup
        embeddings_cache = DATA_DIR / "icar_embeddings.npy"
        
        if embeddings_cache.exists():
            self.embeddings = np.load(embeddings_cache)
        else:
            logger.warning("Embeddings cache not found. Vector search will be disabled. Only exact DAP matches will work.")
                
    def retrieve(self, query, top_k=2):
        # Disabled as OpenRouter doesn't support Google's embedding model
        return []
            
        try:
            # Embed query
            response = client.models.embed_content(
                model='text-embedding-004',
                contents=query
            )
            query_embed = np.array(response.embeddings[0].values)
            
            # Compute cosine similarity
            norm_q = np.linalg.norm(query_embed)
            norm_e = np.linalg.norm(self.embeddings, axis=1)
            similarities = np.dot(self.embeddings, query_embed) / (norm_e * norm_q)
            
            # Get top k indices
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.5: # Lower threshold to capture more context
                    results.append({
                        "document": self.documents[idx],
                        "similarity": float(similarities[idx])
                    })
            return results
            
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            return []

    def get_dap_specific_guidelines(self, crop, dap):
        """Retrieves exact ICAR guidelines for a crop at a specific DAP without vector search."""
        matches = []
        for doc in self.documents:
            if doc["crop"].lower() == crop.lower() and doc["dap_start"] <= dap <= doc["dap_end"]:
                matches.append(doc)
        return matches

    def synthesize_advice(self, user_context, dap, weather_context, disease_trends, icar_context):
        """Uses OpenRouter to synthesize a personalized, actionable recommendation."""
        if not OPENROUTER_API_KEY:
            return "AI service unavailable (Missing API Key)."
            
        prompt = f"""
        You are Vani AI, an expert ICAR agricultural advisor for KrishiSync. 
        You are talking directly to a farmer. Provide a personalized, actionable daily recommendation.
        
        CONTEXT:
        - Farmer Profile: {user_context}
        - Crop & Age: {dap} Days After Planting (DAP)
        - Current Weather: {weather_context}
        - Regional Disease Trends: {disease_trends}
        - ICAR Official Database Guidelines for this DAP: {icar_context}
        
        INSTRUCTIONS:
        1. If ICAR guidelines exist, build your advice strictly around them.
        2. Adjust ICAR advice based on weather (e.g., if ICAR says 'apply fertilizer' but weather is 'heavy rain', tell them to wait).
        3. Keep it concise, practical, and conversational (max 3 short paragraphs).
        4. If ICAR DB has no advice for this DAP, do a quick intelligent fallback assessment based on the crop and DAP.
        """
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1500
            }
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            else:
                logger.error(f"OpenRouter synthesis error: {response.text}")
                return "Unable to synthesize advice at the moment."
        except Exception as e:
            logger.error(f"Synthesis error: {e}")
            return "Unable to synthesize advice at the moment."

# Global instance
icar_rag = ICARRagService()
