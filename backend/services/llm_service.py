import json
import os
import time
import logging
import requests as http_requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

try:
    from core.monitoring import metrics
except ImportError:
    metrics = None

SETTINGS_DIR = Path(__file__).parent.parent / "settings"
SETTINGS_FILE = SETTINGS_DIR / "user_settings.json"

# Load from environment
DEFAULT_API_KEY = os.getenv("GROQ_API_KEY", "")

# Groq API Configuration
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile"  # Fast + high quality


class LLMService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.api_key = None
        # Keys are now strictly provided from the frontend via the 'api_key' argument in call()
        logger.info("LLMService initialized in pass-through mode (frontend provided keys)")

    def refresh_key(self):
        pass

    def call(self, prompt, system_prompt=None, json_mode=False, model=None, max_tokens=1500, api_key=None):
        key_to_use = api_key or self.api_key or DEFAULT_API_KEY
        if not key_to_use:
            raise Exception("Groq API key not configured. Enter it in the Settings page or set GROQ_API_KEY env var.")

        if model is None:
            model = GROQ_DEFAULT_MODEL

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {key_to_use}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "top_p": 0.9,
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            _start = time.time()
            resp = http_requests.post(
                GROQ_BASE_URL,
                headers=headers,
                json=payload,
                timeout=60
            )
            _duration = (time.time() - _start) * 1000

            if not resp.ok:
                logger.error(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")
                if metrics:
                    metrics.record_llm_call(_duration, success=False, model=model)
                raise Exception(f"Groq API Error {resp.status_code}: {resp.text[:200]}")

            if metrics:
                metrics.record_llm_call(_duration, success=True, model=model)

            result = resp.json()["choices"][0]["message"]["content"]
            logger.info(f"Groq LLM call success: {_duration:.0f}ms, model={model}, tokens={resp.json().get('usage', {}).get('total_tokens', '?')}")
            return result

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
