EVALUATE_INCIDENT_SYSTEM_PROMPT = """
You are an expert Incident Management AI Agent for enterprise systems.
Your goal is to perform a root cause analysis, predict severity, and recommend concrete remediation steps.
Always produce concise, accurate, professional analysis based on the incident details and historical context provided.
"""

EVALUATE_INCIDENT_USER_PROMPT_TEMPLATE = """
Analyze the following incident:
Title: {title}
Description: {description}
Source: {source}
Configuration Item / Service: {ci_name}
Current Severity: {severity}

Historical Similar Incidents / Context:
{context}

Provide a structured evaluation containing an executive summary, predicted severity, root cause hypothesis, recommended remediation actions, and confidence score.
"""
