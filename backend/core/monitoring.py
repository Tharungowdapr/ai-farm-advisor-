"""
MLOps Monitoring Module for KrishiVigyan
=========================================
Provides structured logging, request metrics, model tracking,
and a /metrics endpoint for Prometheus-compatible monitoring.
"""

import time
import logging
import functools
import json
import os
import traceback
from datetime import datetime
from collections import defaultdict
from threading import Lock

logger = logging.getLogger(__name__)


# ── Metrics Store ────────────────────────────────────────────────
class MetricsCollector:
    """Thread-safe in-process metrics collector with Prometheus-compatible output."""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._lock = Lock()
        self.start_time = time.time()

        # Counters
        self.request_count = defaultdict(int)           # endpoint -> count
        self.error_count = defaultdict(int)              # endpoint -> count
        self.status_count = defaultdict(int)              # status_code -> count
        self.llm_call_count = 0
        self.llm_error_count = 0
        self.llm_total_latency = 0.0
        self.rag_query_count = 0
        self.rag_miss_count = 0
        self.model_inference_count = defaultdict(int)    # model_name -> count

        # Histograms (simplified - store last N values)
        self._request_durations = defaultdict(list)      # endpoint -> [durations]
        self._llm_durations = []
        self._max_history = 1000

        # Model tracking
        self.model_versions = {}                         # model_name -> version info
        self.model_load_times = {}                       # model_name -> load_time

        # Error log (last 100 errors)
        self._recent_errors = []
        self._max_errors = 100

    def record_request(self, endpoint, method, status_code, duration_ms):
        with self._lock:
            key = f"{method}:{endpoint}"
            self.request_count[key] += 1
            self.status_count[str(status_code)] += 1
            self._request_durations[key].append(duration_ms)
            if len(self._request_durations[key]) > self._max_history:
                self._request_durations[key] = self._request_durations[key][-self._max_history:]
            if status_code >= 400:
                self.error_count[key] += 1

    def record_llm_call(self, duration_ms, success=True, model="default"):
        with self._lock:
            self.llm_call_count += 1
            self.llm_total_latency += duration_ms
            self._llm_durations.append(duration_ms)
            if len(self._llm_durations) > self._max_history:
                self._llm_durations = self._llm_durations[-self._max_history:]
            if not success:
                self.llm_error_count += 1

    def record_rag_query(self, hit=True):
        with self._lock:
            self.rag_query_count += 1
            if not hit:
                self.rag_miss_count += 1

    def record_model_inference(self, model_name, duration_ms=0):
        with self._lock:
            self.model_inference_count[model_name] += 1

    def record_model_loaded(self, model_name, version="unknown", load_time_ms=0):
        with self._lock:
            self.model_versions[model_name] = {
                "version": version,
                "loaded_at": datetime.now().isoformat(),
            }
            self.model_load_times[model_name] = load_time_ms

    def record_error(self, endpoint, error_type, error_message, stack_trace=None):
        with self._lock:
            self._recent_errors.append({
                "timestamp": datetime.now().isoformat(),
                "endpoint": endpoint,
                "error_type": error_type,
                "message": str(error_message)[:500],
                "stack_trace": stack_trace[:1000] if stack_trace else None,
            })
            if len(self._recent_errors) > self._max_errors:
                self._recent_errors = self._recent_errors[-self._max_errors:]

    def get_summary(self):
        with self._lock:
            uptime = time.time() - self.start_time
            total_requests = sum(self.request_count.values())
            total_errors = sum(self.error_count.values())

            # Compute avg response times per endpoint
            avg_durations = {}
            for ep, durations in self._request_durations.items():
                if durations:
                    avg_durations[ep] = {
                        "avg_ms": round(sum(durations) / len(durations), 2),
                        "p95_ms": round(sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 2),
                        "count": len(durations),
                    }

            return {
                "uptime_seconds": round(uptime, 1),
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": round(total_errors / max(total_requests, 1) * 100, 2),
                "requests_per_endpoint": dict(self.request_count),
                "errors_per_endpoint": dict(self.error_count),
                "status_codes": dict(self.status_count),
                "response_times": avg_durations,
                "llm": {
                    "total_calls": self.llm_call_count,
                    "errors": self.llm_error_count,
                    "avg_latency_ms": round(self.llm_total_latency / max(self.llm_call_count, 1), 2),
                    "error_rate": round(self.llm_error_count / max(self.llm_call_count, 1) * 100, 2),
                },
                "rag": {
                    "total_queries": self.rag_query_count,
                    "misses": self.rag_miss_count,
                    "hit_rate": round((self.rag_query_count - self.rag_miss_count) / max(self.rag_query_count, 1) * 100, 2),
                },
                "models": {
                    "versions": self.model_versions,
                    "load_times_ms": self.model_load_times,
                    "inference_counts": dict(self.model_inference_count),
                },
                "recent_errors": self._recent_errors[-10:],
            }

    def get_prometheus_metrics(self):
        """Return Prometheus-compatible text format."""
        lines = []
        lines.append("# HELP krishivigyan_uptime_seconds Server uptime in seconds")
        lines.append("# TYPE krishivigyan_uptime_seconds gauge")
        lines.append(f"krishivigyan_uptime_seconds {time.time() - self.start_time:.1f}")

        lines.append("# HELP krishivigyan_requests_total Total HTTP requests")
        lines.append("# TYPE krishivigyan_requests_total counter")
        for ep, count in self.request_count.items():
            method, path = ep.split(":", 1) if ":" in ep else ("GET", ep)
            lines.append(f'krishivigyan_requests_total{{method="{method}",endpoint="{path}"}} {count}')

        lines.append("# HELP krishivigyan_errors_total Total HTTP errors")
        lines.append("# TYPE krishivigyan_errors_total counter")
        for ep, count in self.error_count.items():
            lines.append(f'krishivigyan_errors_total{{endpoint="{ep}"}} {count}')

        lines.append("# HELP krishivigyan_llm_calls_total Total LLM API calls")
        lines.append("# TYPE krishivigyan_llm_calls_total counter")
        lines.append(f"krishivigyan_llm_calls_total {self.llm_call_count}")

        lines.append("# HELP krishivigyan_llm_errors_total Total LLM API errors")
        lines.append("# TYPE krishivigyan_llm_errors_total counter")
        lines.append(f"krishivigyan_llm_errors_total {self.llm_error_count}")

        lines.append("# HELP krishivigyan_llm_avg_latency_ms Average LLM latency")
        lines.append("# TYPE krishivigyan_llm_avg_latency_ms gauge")
        avg = self.llm_total_latency / max(self.llm_call_count, 1)
        lines.append(f"krishivigyan_llm_avg_latency_ms {avg:.2f}")

        lines.append("# HELP krishivigyan_rag_queries_total Total RAG queries")
        lines.append("# TYPE krishivigyan_rag_queries_total counter")
        lines.append(f"krishivigyan_rag_queries_total {self.rag_query_count}")

        lines.append("# HELP krishivigyan_rag_hit_rate RAG cache hit rate")
        lines.append("# TYPE krishivigyan_rag_hit_rate gauge")
        hit_rate = (self.rag_query_count - self.rag_miss_count) / max(self.rag_query_count, 1) * 100
        lines.append(f"krishivigyan_rag_hit_rate {hit_rate:.2f}")

        for model, count in self.model_inference_count.items():
            lines.append(f'krishivigyan_model_inferences_total{{model="{model}"}} {count}')

        return "\n".join(lines) + "\n"


# ── Global singleton ─────────────────────────────────────────────
metrics = MetricsCollector()


# ── Flask Middleware ─────────────────────────────────────────────
def setup_monitoring(app):
    """Attach request/response monitoring middleware to a Flask app."""

    @app.before_request
    def _before_request():
        from flask import request as req, g
        g.start_time = time.time()
        g.request_id = f"{int(time.time()*1000)}-{os.getpid()}"

    @app.after_request
    def _after_request(response):
        from flask import request as req, g
        duration_ms = (time.time() - getattr(g, 'start_time', time.time())) * 1000
        endpoint = req.path
        method = req.method

        # Skip metrics/health endpoints from tracking
        if endpoint not in ("/api/health", "/api/metrics", "/api/metrics/prometheus"):
            metrics.record_request(endpoint, method, response.status_code, duration_ms)

        # Add timing header
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
        response.headers["X-Request-Id"] = getattr(g, 'request_id', 'unknown')
        return response

    @app.errorhandler(Exception)
    def _handle_exception(e):
        from flask import request as req, jsonify
        tb = traceback.format_exc()
        endpoint = req.path
        metrics.record_error(endpoint, type(e).__name__, str(e), tb)
        logger.error(f"Unhandled exception on {endpoint}: {e}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if app.debug else "An unexpected error occurred",
            "request_id": getattr(req, 'request_id', 'unknown'),
        }), 500

    # ── Health & Metrics Endpoints ────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health_check():
        from flask import jsonify
        checks = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": round(time.time() - metrics.start_time, 1),
            "checks": {}
        }

        # Check database
        try:
            from core.database import get_db
            conn = get_db()
            conn.execute("SELECT 1")
            conn.close()
            checks["checks"]["database"] = {"status": "ok"}
        except Exception as e:
            checks["checks"]["database"] = {"status": "error", "message": str(e)}
            checks["status"] = "degraded"

        # Check LLM service
        try:
            from services.llm_service import LLMService
            llm_svc = LLMService()
            checks["checks"]["llm"] = {
                "status": "ok" if llm_svc.api_key else "unconfigured",
                "provider": "OpenRouter"
            }
        except Exception as e:
            checks["checks"]["llm"] = {"status": "error", "message": str(e)}

        # Check RAG service
        try:
            from services.rag_service import RAGService
            rag_svc = RAGService()
            checks["checks"]["rag"] = {
                "status": "ok" if rag_svc.ready else "not_initialized",
            }
        except Exception as e:
            checks["checks"]["rag"] = {"status": "error", "message": str(e)}

        # Check ML models
        try:
            from services.local_inference_service import LocalInferenceService
            model_loaded = LocalInferenceService.load_model()
            checks["checks"]["ml_model"] = {
                "status": "loaded" if model_loaded else "fallback_mode",
            }
        except Exception as e:
            checks["checks"]["ml_model"] = {"status": "unavailable", "message": str(e)}

        status_code = 200 if checks["status"] == "healthy" else 503
        return jsonify(checks), status_code

    @app.route("/api/metrics", methods=["GET"])
    def get_metrics():
        from flask import jsonify
        return jsonify(metrics.get_summary())

    @app.route("/api/metrics/prometheus", methods=["GET"])
    def get_prometheus_metrics():
        from flask import Response
        return Response(metrics.get_prometheus_metrics(), mimetype="text/plain")

    @app.route("/api/metrics/errors", methods=["GET"])
    def get_error_log():
        from flask import jsonify
        return jsonify({"errors": metrics._recent_errors})

    logger.info("MLOps monitoring middleware attached")


# ── Decorators for Service-Level Tracking ────────────────────────
def track_llm_call(operation_name="unspecified"):
    """Decorator factory to track LLM API call latency and errors."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                metrics.record_llm_call(duration_ms, success=True)
                logger.info(f"LLM call [{operation_name}] success: {duration_ms:.0f}ms")
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                metrics.record_llm_call(duration_ms, success=False)
                logger.error(f"LLM call [{operation_name}] failed after {duration_ms:.0f}ms: {e}")
                raise
        return wrapper
    # Support both @track_llm_call and @track_llm_call("name")
    if callable(operation_name):
        f = operation_name
        operation_name = "unspecified"
        return decorator(f)
    return decorator


def track_model_inference(model_name):
    """Decorator factory to track ML model inference."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            duration_ms = (time.time() - start) * 1000
            metrics.record_model_inference(model_name, duration_ms)
            return result
        return wrapper
    return decorator


def track_rag_query(func):
    """Decorator to track RAG query hit/miss rates."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        hit = bool(result)  # Non-empty result = hit
        metrics.record_rag_query(hit=hit)
        return result
    return wrapper
