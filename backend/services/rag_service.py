import json
import os
import logging
from pathlib import Path

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_DIR = DATA_DIR / "chromadb"

class RAGService:
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
        self.model = None
        self.chroma_client = None
        self.collections = {}
        self.ready = False
        self._init_attempted = False

    def _lazy_init(self):
        if self.ready or self._init_attempted:
            return
        self._init_attempted = True
        try:
            import chromadb
            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(str(CHROMA_DIR))
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.ready = True
        except Exception as e:
            logger.warning(f"RAG init failed (non-critical): {e}")
            self.ready = False

    def _get_collection(self, name):
        if name not in self.collections:
            try:
                self.collections[name] = self.chroma_client.get_collection(name)
            except:
                self.collections[name] = self.chroma_client.create_collection(name)
        return self.collections[name]

    def index_all(self):
        self._lazy_init()
        if not self.ready:
            return
        try:
            self._index_knowledge_cores()
            self._index_icar_data()
            self._index_economics()
            self._index_schemes()
        except Exception as e:
            logger.warning(f"RAG indexing error: {e}")

    def _index_knowledge_cores(self):
        collection = self._get_collection("crops")
        if collection.count() > 0:
            return
        chunks, metadatas, ids = [], [], []
        for fpath in DATA_DIR.glob("knowledge_core_*.json"):
            try:
                with open(fpath) as f:
                    data = json.load(f)
            except:
                continue
            crop = data.get("crop_info", {}).get("name", fpath.stem.replace("knowledge_core_", "").title())
            for phase in data.get("lifecycle_phases", []):
                text = f"[{crop}] Phase: {phase['phase_name']}. {phase.get('description','')} "
                text += "Procedures: " + "; ".join(str(s) for s in phase.get("procedures", [])) + " "
                text += "Preventive tips: " + "; ".join(str(s) for s in phase.get("preventive_tips", []))
                chunks.append(text)
                metadatas.append({"crop": crop, "type": "phase", "phase": phase["phase_name"]})
                ids.append(f"{crop.lower()}_phase_{phase['phase_id']}")
            for did, ddata in data.get("disease_protocols", {}).items():
                text = f"[{crop}] Disease: {ddata.get('name', did)}. "
                text += f"Scientific: {ddata.get('scientific', 'N/A')}. "
                text += f"Risk: {ddata.get('risk', 'N/A')}. "
                text += f"Symptoms: {'; '.join(str(s) for s in ddata.get('symptoms', []))}. "
                text += f"Preventive: {'; '.join(str(s) for s in ddata.get('preventive_measures', []))}. "
                mgmt = ddata.get("management_procedures", {})
                text += f"Organic: {'; '.join(str(s) for s in mgmt.get('organic', []))}. "
                text += f"Chemical: {'; '.join(str(s) for s in mgmt.get('chemical', []))}."
                chunks.append(text)
                metadatas.append({"crop": crop, "type": "disease", "disease": ddata.get("name", did)})
                ids.append(f"{crop.lower()}_disease_{did}")
        if chunks:
            try:
                embeddings = self.model.encode(chunks).tolist()
                collection.add(embeddings=embeddings, documents=chunks, metadatas=metadatas, ids=ids)
            except:
                pass

    def _index_icar_data(self):
        collection = self._get_collection("icar")
        if collection.count() > 0:
            return
        entries = []
        for fname in ["synthetic_icar_data.json", "scraped_icar_data.json"]:
            icar_path = DATA_DIR / fname
            if icar_path.exists():
                try:
                    with open(icar_path) as f:
                        entries.extend(json.load(f))
                except Exception as e:
                    logger.warning(f"Failed to load {fname}: {e}")
        
        if not entries:
            return
        chunks, metadatas, ids = [], [], []
        for entry in entries:
            text = f"[{entry['crop']}] {entry['topic']} (Stage: {entry['stage']}, DAP {entry['dap_start']}-{entry['dap_end']}): {entry['content']}"
            chunks.append(text)
            metadatas.append({"crop": entry["crop"], "topic": entry["topic"], "stage": entry["stage"]})
            ids.append(entry["id"])
        if chunks:
            try:
                embeddings = self.model.encode(chunks).tolist()
                collection.add(embeddings=embeddings, documents=chunks, metadatas=metadatas, ids=ids)
            except:
                pass

    def _index_economics(self):
        collection = self._get_collection("market")
        if collection.count() > 0:
            return
        econ_path = DATA_DIR / "crop_economics.json"
        if not econ_path.exists():
            return
        try:
            with open(econ_path) as f:
                data = json.load(f)
        except:
            return
        chunks, metadatas, ids = [], [], []
        for crop_name, info in data.get("crops", {}).items():
            text = f"[{crop_name}] Season: {info.get('season','N/A')}. MSP: ₹{info['msp_per_quintal']}/quintal. "
            text += f"Avg yield: {info.get('avg_yield_quintal_per_hectare','N/A')} q/ha. "
            costs = info.get("input_costs_per_hectare", {})
            text += "Input costs: " + ", ".join(str(f"{k}: ₹{v}") for k, v in costs.items()) + ". "
            text += f"Total cost: ₹{info.get('total_a2fl_cost_per_hectare','N/A')}/ha."
            chunks.append(text)
            metadatas.append({"crop": crop_name, "season": info.get("season",""), "msp": str(info["msp_per_quintal"])})
            ids.append(f"econ_{crop_name}")
        if chunks:
            try:
                embeddings = self.model.encode(chunks).tolist()
                collection.add(embeddings=embeddings, documents=chunks, metadatas=metadatas, ids=ids)
            except:
                pass

    def _index_schemes(self):
        collection = self._get_collection("schemes")
        if collection.count() > 0:
            return
        spath = DATA_DIR / "government_schemes.json"
        if not spath.exists():
            return
        try:
            with open(spath) as f:
                entries = json.load(f)
        except:
            return
        chunks, metadatas, ids = [], [], []
        for s in entries:
            text = f"[{s.get('name','Scheme')}] Type: {s.get('type','N/A')}. Benefit: {s.get('benefit','N/A')}. "
            el = s.get("eligibility", {})
            text += "Eligibility: " + "; ".join(f"{k}: {v}" for k, v in el.items()) + ". "
            text += f"State: {s.get('state','N/A')}."
            if s.get("description"):
                text += f" Desc: {s['description']}"
            chunks.append(text)
            metadatas.append({"name": s["name"], "type": s.get("type",""), "state": s.get("state","")})
            ids.append(s["id"])
        if chunks:
            try:
                embeddings = self.model.encode(chunks).tolist()
                collection.add(embeddings=embeddings, documents=chunks, metadatas=metadatas, ids=ids)
            except:
                pass

    def semantic_search(self, query, collections=None, top_k=5):
        self._lazy_init()
        if not self.ready:
            return []
        self.index_all()
        if collections is None:
            collections = ["crops", "icar", "market", "schemes"]
        try:
            query_emb = self.model.encode(query).tolist()
        except:
            return []
        results = []
        for coll_name in collections:
            try:
                coll = self._get_collection(coll_name)
                res = coll.query(query_embeddings=[query_emb], n_results=top_k)
                for i in range(len(res["documents"][0])):
                    results.append({
                        "document": res["documents"][0][i],
                        "metadata": res["metadatas"][0][i],
                        "score": res["distances"][0][i] if res.get("distances") else 0,
                        "collection": coll_name
                    })
            except:
                continue
        results.sort(key=lambda x: x["score"])
        return results[:top_k]

    def augment_prompt(self, query, top_k=5):
        self._lazy_init()
        if not self.ready:
            return ""
        results = self.semantic_search(query, top_k=top_k)
        if not results:
            return ""
        context_parts = []
        for r in results:
            meta = r["metadata"]
            source = meta.get('crop') or meta.get('name') or "General Knowledge"
            topic = meta.get('topic') or meta.get('type') or "Guide"
            context_parts.append(f"--- DATA FROM {source.upper()} ({topic.upper()}) ---\n{r['document']}")
        return "\n\n".join(context_parts)
