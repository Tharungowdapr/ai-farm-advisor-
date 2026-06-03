import json
import os
import logging
from datetime import datetime, timedelta
from pathlib import Path
from google import genai
from dotenv import load_dotenv

# Load key from .env
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DATA_DIR = Path(__file__).parent / "data"
# KNOWLEDGE_CORE_FILE is now dynamic
USER_STATE_FILE = DATA_DIR / "user_cultivation_state.json"

class CultivationManager:
    """
    Manages the user's cultivation lifecycle, integrates static knowledge 
    with dynamic user state and AI insights. Supports Multiple Crops.
    """

    @staticmethod
    def _get_knowledge_file(crop_name):
        """Returns the path to the knowledge file for a specific crop."""
        filename = f"knowledge_core_{crop_name.lower()}.json"
        return DATA_DIR / filename

    @staticmethod
    def _load_json(file_path):
        if not file_path.exists():
            return None
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return None

    @staticmethod
    def _save_json(file_path, data):
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving {file_path}: {e}")
            return False

    @staticmethod
    def get_static_knowledge(crop_name="Paddy"):
        """Returns the READ-ONLY knowledge core data for a specific crop."""
        # Clean crop name
        crop_name = crop_name.split()[0] # Handle cases like 'Paddy (Rice)' -> 'Paddy'
        return CultivationManager._load_json(CultivationManager._get_knowledge_file(crop_name))

    @staticmethod
    def get_user_state():
        """Returns current user cultivation state."""
        state = CultivationManager._load_json(USER_STATE_FILE)
        if not state:
            return {
                "active": False,
                "current_crop": None,
                "current_phase_index": 0,
                "start_date": None,
                "last_updated": None
            }
        return state

    @staticmethod
    def start_cultivation(crop_name="Paddy", start_date_str=None):
        """Initializes a new cultivation cycle for the specified Crop."""
        if not start_date_str:
            start_date_str = datetime.now().strftime("%Y-%m-%d")

        # Validate we have knowledge for this crop
        knowledge = CultivationManager.get_static_knowledge(crop_name)
        if not knowledge:
             return {"success": False, "message": f"Knowledge base for {crop_name} not found."}

        # Reset to Phase 1 (Index 0)
        new_state = {
            "active": True,
            "current_crop": crop_name, 
            "current_phase_index": 0, # Matrix index 0
            "start_date": start_date_str,
            "last_updated": datetime.now().isoformat()
        }
        
        if CultivationManager._save_json(USER_STATE_FILE, new_state):
            return {"success": True, "message": f"Cultivation for {crop_name} started!", "state": new_state}
        return {"success": False, "message": "Failed to save state."}

    @staticmethod
    def update_phase(action="next"):
        """
        Updates the cultivation phase. 
        """
        state = CultivationManager.get_user_state()
        if not state.get("active"):
            return {"success": False, "message": "No active cultivation found."}

        current_crop = state.get("current_crop", "Paddy")
        knowledge = CultivationManager.get_static_knowledge(current_crop)
        
        if not knowledge:
            return {"success": False, "message": "Knowledge core missing."}
        
        total_phases = len(knowledge["lifecycle_phases"])
        current_idx = state["current_phase_index"]

        if action == "next":
            if current_idx < total_phases - 1:
                current_idx += 1
            else:
                 return {"success": False, "message": "Already at final phase."}
        elif action == "prev":
             if current_idx > 0:
                current_idx -= 1
        elif isinstance(action, int):
             if 0 <= action < total_phases:
                 current_idx = action
        
        state["current_phase_index"] = current_idx
        state["last_updated"] = datetime.now().isoformat()
        
        CultivationManager._save_json(USER_STATE_FILE, state)
        
        phase_name = knowledge["lifecycle_phases"][current_idx]["phase_name"]
        return {"success": True, "message": f"Moved to {phase_name}", "state": state}

    @staticmethod
    def log_disease_detection(disease_name, confidence, image_url=None):
        """
        Logs a detected disease into the user's history.
        """
        state = CultivationManager.get_user_state()
        
        # Initialize history if missing
        if "disease_history" not in state:
            state["disease_history"] = []

        entry = {
            "date": datetime.now().isoformat(),
            "phase_index": state.get("current_phase_index", 0),
            "disease_name": disease_name,
            "confidence": confidence,
            "image_url": image_url,
            "status": "Detected"
        }
        state["disease_history"].insert(0, entry) # Prepend
        CultivationManager._save_json(USER_STATE_FILE, state)
        return state

    @staticmethod
    def _fetch_ai_trending_updates(region="Karnataka", crop="Paddy"):
        """
        Uses Gemini to get recent disease outbreaks or trending agricultural news.
        Returns a structured summary.
        """
        try:
            # Check availability of API key (loaded in app.py logic, but we need to ensure genai is configured)
            
            # Simple prompt for trending issues
            prompt = f"""
            You are an expert agricultural news analyst for {region}.
            task: Identify RECENT (last 30 days) or SEASONALLY TRENDING disease outbreaks or pest issues for {crop} in {region}.
            
            Return a valid JSON object with key "trending_alerts" which is a list.
            Each item in "trending_alerts" should have:
            - "title": Short title (e.g., "Blast Outbreak in Raichur")
            - "severity": "High", "Medium", or "Low"
            - "description": 1 sentence summary.
            - "source": "News/Report" (Simulated if real-time web search not active, but prefer realistic inference based on current month/season).
            
            If current date is {datetime.now().strftime('%B %Y')}, infer probable outbreaks if no specific news is found.
            Preventive approach: "Prevention is better than cure".
            """
            
            if not client:
                return {"trending_alerts": []}

            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"AI Trend Fetch Error: {e}")
            return {"trending_alerts": []} # Fallback

    @staticmethod
    def generate_and_learn_new_disease(disease_name):
        """
        If a disease is not in the DB, ask Gemini for its details (symptoms, cures),
        add it to the DB, and return the new protocol.
        """
        try:
            logger.info(f"Learning new disease: {disease_name}")
            prompt = f"""
            You are an expert plant pathologist. 
            Task: Generate a structured technical protocol for the crop disease "{disease_name}" (specifically for Paddy/Rice if applicable, otherwise general).
            
            Output MUST be valid JSON with this exact structure:
            {{
                "name": "{disease_name}",
                "scientific": "Scientific Name",
                "risk": "High" or "Moderate" or "Low",
                "symptoms": ["symptom 1", "symptom 2"],
                "favorable_conditions": "brief description",
                "monitor_freq": "Weekly" or "Daily",
                "preventive_measures": ["measure 1", "measure 2"],
                "management_procedures": {{
                    "organic": ["organic cure 1", "organic cure 2"],
                    "chemical": ["chemical cure 1", "chemical cure 2"]
                }}
            }}
            Do not include markdown formatting, just the JSON string.
            """
            
            if not client:
                return None

            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            new_protocol = json.loads(response.text)
            
            # Generate a simple ID
            new_id = f"d_{int(datetime.now().timestamp())}"
            
            # Save to DB
            CultivationManager._add_disease_to_db(new_id, new_protocol)
            
            return new_protocol
            
        except Exception as e:
            logger.error(f"Failed to learn disease {disease_name}: {e}")
            return None

    @staticmethod
    def _add_disease_to_db(disease_id, protocol_data):
        """
        Persists a new disease protocol to the knowledge core JSON.
        """
        # Determine active crop to identify which DB to save to
        state = CultivationManager.get_user_state()
        current_crop = state.get("current_crop", "Paddy")
        
        knowledge = CultivationManager.get_static_knowledge(current_crop)
        if not knowledge:
            return False
            
        if "disease_protocols" not in knowledge:
            knowledge["disease_protocols"] = {}
            
        knowledge["disease_protocols"][disease_id] = protocol_data
        
        # Determine filepath
        filepath = CultivationManager._get_knowledge_file(current_crop)
        return CultivationManager._save_json(filepath, knowledge)

    @staticmethod
    def get_dashboard_data():
        """
        Aggregates everything for the frontend dashboard:
        1. User State
        2. Current Phase Details (Procedures, Tips)
        3. Next Phase Preview
        4. AI Trending Alerts
        """
        state = CultivationManager.get_user_state()
        current_crop = state.get("current_crop", "Paddy")
        
        # Load correct knowledge base
        knowledge = CultivationManager.get_static_knowledge(current_crop)
        
        if not state.get("active") or not knowledge:
             return {
                 "active": False,
                 "current_crop": current_crop,
                 "message": "Start cultivation to see dashboard.",
                 "knowledge_preview": knowledge["lifecycle_phases"] if knowledge else [],
                 "lifecycle_phases": knowledge.get("lifecycle_phases", []) if knowledge else []
             }

        current_idx = state["current_phase_index"]
        phases = knowledge["lifecycle_phases"]
        current_phase_data = phases[current_idx]
        
        # Enrich with detailed disease protocols
        disease_details = []
        protocols = knowledge.get("disease_protocols", {})
        for d_id in current_phase_data.get("common_diseases", []):
            if d_id in protocols:
                disease_details.append(protocols[d_id])
        
        # Get Next Phase Info
        next_phase = phases[current_idx + 1] if current_idx < len(phases) - 1 else None

        # AI Insights 
        # Pass the correct crop to AI
        ai_trends = CultivationManager._fetch_ai_trending_updates(crop=current_crop)

        dashboard = {
            "active": True,
            "user_state": state,
            "current_phase": {
                **current_phase_data,
                "disease_details": disease_details
            },
            "next_phase_preview": {
                "phase_name": next_phase["phase_name"] if next_phase else "Harvest Complete",
                "preventive_tips": next_phase["preventive_tips"] if next_phase else []
            },
            "ai_insights": ai_trends
        }

        return dashboard
