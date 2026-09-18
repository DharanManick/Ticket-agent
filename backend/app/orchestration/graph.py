from langgraph.graph import StateGraph, END
from app.orchestration.state import IncidentProcessingState
from app.orchestration.nodes import (
    node_retrieve_context,
    node_match_rules_and_ci,
    node_llm_evaluation
)
from loguru import logger

def build_incident_pipeline():
    """Builds stateful LangGraph pipeline for incident processing."""
    workflow = StateGraph(IncidentProcessingState)

    # Add Nodes
    workflow.add_node("retrieve_context", node_retrieve_context)
    workflow.add_node("match_rules", node_match_rules_and_ci)
    workflow.add_node("evaluate_llm", node_llm_evaluation)

    # Define Edges / Transitions
    workflow.set_entry_point("retrieve_context")
    workflow.add_edge("retrieve_context", "match_rules")
    workflow.add_edge("match_rules", "evaluate_llm")
    workflow.add_edge("evaluate_llm", END)

    app = workflow.compile()
    logger.info("LangGraph Incident Pipeline compiled successfully")
    return app

incident_pipeline = build_incident_pipeline()
