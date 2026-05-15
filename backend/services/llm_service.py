import json
import os
import logging
import requests as http_requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

try:
    from monitoring import metrics
except ImportError:
    metrics = None

SETTINGS_DIR = Path(__file__).parent.parent / "settings"
SETTINGS_FILE = SETTINGS_DIR / "user_settings.json"

# Load from environment or use a placeholder (not hardcoded secret)
DEFAULT_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


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
        self._load_key()

    def _load_key(self):
        # Always start with the working OpenRouter key
        self.api_key = DEFAULT_API_KEY

        try:
            if SETTINGS_FILE.exists():
                with open(SETTINGS_FILE) as f:
                    settings = json.load(f)
                user_key = settings.get("api_key", "").strip()
                # Only override if it's actually an OpenRouter key (sk-or-...)
                if user_key and user_key.startswith("sk-or-"):
                    self.api_key = user_key
        except Exception:
            pass

        env_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if env_key and env_key.startswith("sk-or-"):
            self.api_key = env_key

        if self.api_key:
            logger.info("LLMService initialized with OpenRouter (Gemini via requests)")
        else:
            logger.warning("No API key found for OpenRouter")

    def refresh_key(self):
        self._initialized = False
        self._load_key()
        self._initialized = True

    def call(self, prompt, system_prompt=None, json_mode=False, model="openai/gpt-4o-mini", max_tokens=1500):
        if not self.api_key:
            raise Exception("OpenRouter API key not configured. Set it in Settings.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "KrishiSync Vani AI"
        }

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            import time
            _start = time.time()
            resp = http_requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            _duration = (time.time() - _start) * 1000
            if not resp.ok:
                logger.error(f"OpenRouter HTTP {resp.status_code}: {resp.text[:300]}")
                if metrics:
                    metrics.record_llm_call(_duration, success=False, model=model)
                raise Exception(f"OpenRouter API Error {resp.status_code}: {resp.text[:200]}")
            if metrics:
                metrics.record_llm_call(_duration, success=True, model=model)
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenRouter API error: {e}")
            raise
