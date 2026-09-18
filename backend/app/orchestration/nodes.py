from loguru import logger
from app.orchestration.state import IncidentProcessingState
from app.llm.gemini import GeminiLLMProvider
from app.llm.prompts import EVALUATE_INCIDENT_SYSTEM_PROMPT, EVALUATE_INCIDENT_USER_PROMPT_TEMPLATE
from app.schemas.evaluation import AIEvaluationResult
from app.memory.vector_store import vector_memory
from app.services.rule_engine import rule_engine

llm_provider = GeminiLLMProvider()

async def node_retrieve_context(state: IncidentProcessingState) -> IncidentProcessingState:
    """Pipeline Stage 1: Vector Memory Retrieval."""
    logger.info("[LangGraph Pipeline] Node 1: Retrieving historical similar incidents...")
    incident = state["incident"]
    query = f"{incident.title} {incident.description}"
    similar_docs = vector_memory.search_similar(query, top_k=2)
    state["vector_context"] = [d["text"] for d in similar_docs]
    return state

async def node_match_rules_and_ci(state: IncidentProcessingState) -> IncidentProcessingState:
    """Pipeline Stage 2: Rule Engine & CI Matrix lookup."""
    logger.info("[LangGraph Pipeline] Node 2: Matching alert rules and CI matrix...")
    incident = state["incident"]
    state["matched_rule"] = rule_engine.evaluate_rules(incident)
    state["ci_matrix"] = rule_engine.match_ci_matrix(incident.ci_name)
    return state

async def node_llm_evaluation(state: IncidentProcessingState) -> IncidentProcessingState:
    """Pipeline Stage 3: LLM Structured Evaluation via Gemini."""
    logger.info("[LangGraph Pipeline] Node 3: Invoking Gemini for structured AI evaluation...")
    incident = state["incident"]
    context_str = "\n".join(state["vector_context"]) if state["vector_context"] else "No prior history."

    prompt = EVALUATE_INCIDENT_USER_PROMPT_TEMPLATE.format(
        title=incident.title,
        description=incident.description,
        source=incident.source,
        ci_name=incident.ci_name or "N/A",
        severity=incident.severity,
        context=context_str
    )

    try:
        evaluation: AIEvaluationResult = await llm_provider.generate_structured(
            prompt=prompt,
            schema=AIEvaluationResult,
            system_instruction=EVALUATE_INCIDENT_SYSTEM_PROMPT
        )
        state["ai_evaluation"] = evaluation
    except Exception as e:
        logger.error(f"LLM Evaluation failed: {e}")
        state["error"] = str(e)
        # Fallback structured evaluation
        state["ai_evaluation"] = AIEvaluationResult(
            summary=f"Incident: {incident.title}",
            predicted_severity=incident.severity,
            root_cause_hypothesis="Pending detailed investigation",
            recommended_action="Inspect application server logs",
            confidence_score=0.5,
            tags=[]
        )
    return state
