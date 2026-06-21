import json
import os
import base64
import logging
import requests as http_requests
from pathlib import Path
from dotenv import load_dotenv

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

load_dotenv()

logger = logging.getLogger(__name__)

try:
    from monitoring import metrics
except ImportError:
    metrics = None

SETTINGS_DIR = Path(__file__).parent.parent / "settings"
SETTINGS_FILE = SETTINGS_DIR / "user_settings.json"

DEFAULT_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


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
        self.provider = "openrouter"
        self.model = "openai/gpt-4o-mini"
        self._load_key()

    def _decrypt_key(self, encrypted_key):
        if not CRYPTO_AVAILABLE or not encrypted_key:
            return encrypted_key
        try:
            secret = os.getenv("SECRET_KEY") or os.urandom(32).hex()
            key_bytes = secret.encode() if len(secret.encode()) >= 32 else secret.encode().ljust(32, b'x')[:32]
            kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=b'kv_salt_2024', iterations=100000)
            fernet_key = base64.urlsafe_b64encode(kdf.derive(key_bytes))
            cipher = Fernet(fernet_key)
            return cipher.decrypt(encrypted_key.encode()).decode()
        except Exception:
            return encrypted_key

    def _load_key(self):
        self.api_key = DEFAULT_API_KEY
        self.provider = "openrouter"
        self.model = "openai/gpt-4o-mini"

        try:
            if SETTINGS_FILE.exists():
                with open(SETTINGS_FILE) as f:
                    settings = json.load(f)
                user_key = settings.get("api_key", "").strip()
                self.provider = settings.get("provider", "openrouter")
                self.model = settings.get("llm_model", "openai/gpt-4o-mini")

                if user_key:
                    if user_key.startswith("sk-or-") or user_key.startswith("gsk_"):
                        self.api_key = user_key
                    else:
                        decrypted = self._decrypt_key(user_key)
                        if decrypted:
                            self.api_key = decrypted
        except Exception:
            pass

        env_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        env_groq_key = os.getenv("GROQ_API_KEY", "").strip()

        # Only use env vars if settings didn't provide a working API key
        if not self.api_key:
            if env_key:
                self.api_key = env_key
                self.provider = "openrouter"
            elif env_groq_key:
                self.api_key = env_groq_key
                self.provider = "groq"

        if self.api_key:
            logger.info(f"LLMService initialized with provider={self.provider}")
        else:
            logger.warning("No API key found for any LLM provider")

    def refresh_key(self):
        self._initialized = False
        self._load_key()
        self._initialized = True

    def call(self, prompt, system_prompt=None, json_mode=False, model=None, max_tokens=1500):
        if not self.api_key:
            raise Exception("LLM API key not configured. Set it in Settings.")

        provider = self.provider
        actual_model = model or self.model

        if provider == "groq":
            return self._call_groq(prompt, system_prompt, json_mode, actual_model, max_tokens)
        else:
            return self._call_openrouter(prompt, system_prompt, json_mode, actual_model, max_tokens)

    def _call_openrouter(self, prompt, system_prompt, json_mode, model, max_tokens):
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost:5173"),
            "X-Title": "KrishiSync Vani AI"
        }

        payload = {"model": model, "messages": messages, "max_tokens": max_tokens}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            import time
            _start = time.time()
            resp = http_requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers, json=payload, timeout=60
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

    def _call_groq(self, prompt, system_prompt, json_mode, model, max_tokens):
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {"model": model, "messages": messages, "max_tokens": max_tokens}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            import time
            _start = time.time()
            resp = http_requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers, json=payload, timeout=60
            )
            _duration = (time.time() - _start) * 1000
            if not resp.ok:
                logger.error(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")
                if metrics:
                    metrics.record_llm_call(_duration, success=False, model=model)
                raise Exception(f"Groq API Error {resp.status_code}: {resp.text[:200]}")
            if metrics:
                metrics.record_llm_call(_duration, success=True, model=model)
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
