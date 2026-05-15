"""
Supervisor Agent — routes queries to specialist agents using LLM.
Synthesis Agent — combines all outputs + RAG + LLM final response.
"""
import json
import logging

logger = logging.getLogger(__name__)

from services.llm_service import LLMService
from services.rag_service import RAGService
from agents.specialist_agents import ALL_AGENTS, AGENT_DESCRIPTIONS

llm = LLMService()
rag = RAGService()

SUPERVISOR_PROMPT = """You are the Senior Intelligence Routing Agent for KrishiVigyan, an advanced agricultural advisory system.
Given a farmer's query and their local environmental context, determine which specialized expert models must be activated to provide a comprehensive answer.

Available Specialists:
{agents}

Routing Logic:
- ACTIVATE 'weather' for ANY query involving location, sowing time, or forecast.
- ACTIVATE 'soil' if NPK levels, pH, land size, or nutrient deficiencies are mentioned.
- ACTIVATE 'price' for queries about MSP, current market rates, or selling profit.
- ACTIVATE 'pest' for any mention of disease symptoms, insects, or crop damage.
- ACTIVATE 'scheme' for government policies, subsidies, PM-Kisan, or insurance.
- ACTIVATE 'market' for complex economic advice, mandi arrivals, or price trends.

Farmer Query: {query}
Context Crop: {context_crop}

Return a valid JSON object with:
- "detected_crop": The specific crop the user is asking about (if none, return the Context Crop).
- "selected_agents": Array of agent IDs to activate.

Example: {"detected_crop": "Tomato", "selected_agents": ["pest", "weather"]}"""

SYNTHESIS_PROMPT = """You are 'Vani AI', KrishiVigyan's lead Agricultural Intelligence Scientist.

USER QUESTION: {user_query}

MISSION CONTEXT:
- Location: {location}
- Detected Crop: {crop}
- Season: {season}

DATA INTELLIGENCE REPORTS (Local sensors & market):
{agent_reports}

SCIENTIFIC KNOWLEDGE (RAG Context - use this for technical answers):
{rag_context}

INSTRUCTIONS:
1. **CRITICAL**: Your primary objective is to answer the USER QUESTION. 
2. If the user asks about a specific crop (e.g., Tomato) but the local sensors report on another (e.g., Paddy), acknowledge the sensors but focus your expertise on the user's crop using the RAG Context.
3. Use bold headers for sections.
4. Structure your response to be actionable for the user's specific problem.

RESPONSE STRUCTURE:
**📊 CURRENT STATUS**
(Quick situational summary relevant to the question)

**✅ ACTIONABLE STEPS**
(What the farmer should do to address their specific question)

**🛡️ PROTECTIVE ADVICE**
(Prevention, risks, and scientific guidance)

**💡 VANI'S WISDOM**
(Final authoritative tip)

Tone: Empathetic, expert, and actionable. Language: {language_instruction}
"""


def supervisor(state):
    query = state.get("query", "")
    ctx = state.get("context", {})
    context_crop = ctx.get("crop", "Paddy")
    
    try:
        prompt = SUPERVISOR_PROMPT.format(agents=AGENT_DESCRIPTIONS, query=query, context_crop=context_crop)
        response = llm.call(prompt, json_mode=True, max_tokens=500)
        
        # Parse JSON
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            state["selected_agents"] = [a for a in data.get("selected_agents", []) if a in ALL_AGENTS]
            # Update crop context if a specific crop is detected
            if data.get("detected_crop"):
                state["context"]["crop"] = data["detected_crop"]
        
        if not state.get("selected_agents"):
            state["selected_agents"] = ["weather", "soil", "price"]
            
    except Exception as e:
        logger.warning(f"Supervisor routing failed: {e}")
        state["selected_agents"] = ["weather", "soil", "price"]
    return state


def run_agents(state):
    selected = state.get("selected_agents", ["weather", "soil", "price"])
    results = {}
    for name in selected:
        agent = ALL_AGENTS.get(name)
        if agent:
            try:
                results[name] = agent.run(state)
            except Exception as e:
                logger.error(f"Agent {name} failed: {e}")
                results[name] = {"agent": name, "status": "error", "summary": f"Analysis unavailable"}
    state["agent_results"] = results
    return state


def synthesis(state):
    ctx = state.get("context", {})
    results = state.get("agent_results", {})
    query = state.get("query", "")

    agent_reports = "\n\n".join(
        f"[{r.get('agent','?').upper()}] {r.get('summary','No data')}"
        for r in results.values()
    )

    rag_context = ""
    try:
        rag_context = rag.augment_prompt(f"{query} " + " ".join(r.get('summary','') for r in results.values()))
    except Exception as e:
        logger.warning(f"RAG augment failed in synthesis: {e}")
        rag_context = ""

    location = ctx.get("city") or f"{ctx.get('lat','?')},{ctx.get('lon','?')}"
    crop = ctx.get("crop") or "general"
    month = __import__('datetime').datetime.now().month
    season = "Kharif (Monsoon)" if month in [6,7,8,9] else "Rabi (Winter)" if month in [10,11,12,1] else "Summer"
    lang_instr = state.get("lang_instruction") or ctx.get("lang_instruction") or "Respond in English."
    prompt = SYNTHESIS_PROMPT.format(
        user_query=query,
        location=location, crop=crop, season=season,
        agent_reports=agent_reports, rag_context=rag_context[:2000],
        language_instruction=lang_instr
    )

    try:
        response = llm.call(prompt, max_tokens=1000)
        state["final_response"] = response
    except Exception as e:
        logger.warning(f"Synthesis LLM failed, using template: {e}")
        parts = [f"**🌾 Analysis for {crop} in {location} ({season})**\n\n"]
        parts.append("**📊 CURRENT STATUS**\n")
        for r in results.values():
            parts.append(f"- {r.get('summary','No data')}\n")
        parts.append("\n**✅ ACTIONABLE STEPS**\n- Monitor crop health daily\n- Check local mandi prices\n")
        state["final_response"] = "".join(parts)

    return state


def build_agent_graph():
    try:
        from langgraph.graph import StateGraph
        import langgraph.graph

        class AgentState(dict):
            query: str = ""
            context: dict = {}
            selected_agents: list = []
            agent_results: dict = {}
            final_response: str = ""

        graph = StateGraph(AgentState)

        graph.add_node("supervisor", supervisor)
        graph.add_node("agents", run_agents)
        graph.add_node("synthesis", synthesis)

        graph.set_entry_point("supervisor")
        graph.add_edge("supervisor", "agents")
        graph.add_edge("agents", "synthesis")
        graph.add_edge("synthesis", langgraph.graph.END)

        return graph.compile()
    except Exception as e:
        logger.warning(f"LangGraph unavailable, using sequential: {e}")
        return None


def run_agent_pipeline(query, context=None):
    if context is None:
        context = {}

    graph = build_agent_graph()

    if graph:
        try:
            result = graph.invoke({
                "query": query,
                "context": context,
                "selected_agents": [],
                "agent_results": {},
                "final_response": ""
            })
            return result.get("final_response", "Analysis complete.")
        except Exception as e:
            logger.error(f"LangGraph failed: {e}")

    lang_instr = context.get("lang_instruction") or "Respond in English."
    state = {"query": query, "context": context, "selected_agents": [], "agent_results": {}, "final_response": "", "lang_instruction": lang_instr}
    state = supervisor(state)
    state = run_agents(state)
    state = synthesis(state)
    return state.get("final_response", "Analysis complete.")
