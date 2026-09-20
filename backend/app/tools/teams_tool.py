import httpx
from typing import Dict, Any, Optional
from loguru import logger
from app.config import settings

async def send_teams_webhook(
    webhook_url: str = None,
    title: str = "Incident Alert",
    summary: str = "",
    facts: Dict[str, str] = None,
    color: str = "Attention",
    mention_name: Optional[str] = None,
    mention_email: Optional[str] = None,
    action_url: Optional[str] = None
) -> bool:
    """
    Modular Tool: Send Microsoft Teams Adaptive Card 1.4 via Power Automate Webhook or Incoming Webhook.
    Supports @mention entity resolution for direct user DM tagging in Teams channels and FlowBot.
    """
    url = webhook_url or settings.TEAMS_WEBHOOK_URL
    if not url or url.strip() == "" or "..." in url:
        logger.warning("Teams Webhook URL not configured. Mocking Teams Adaptive Card dispatch.")
        logger.info(f"[Teams Card Simulation] Title: {title} | Tag: {mention_name or 'None'} | Summary: {summary}")
        return True

    # Build Adaptive Card 1.4 payload
    body_elements = [
        {
            "type": "TextBlock",
            "size": "Medium",
            "weight": "Bolder",
            "text": f"⚠️ {title}" + (f" - <at>{mention_name}</at>" if mention_name else ""),
            "color": color
        },
        {
            "type": "TextBlock",
            "text": summary,
            "wrap": True,
            "spacing": "Medium"
        }
    ]

    if facts:
        body_elements.append({
            "type": "FactSet",
            "facts": [{"title": str(k), "value": str(v)} for k, v in facts.items()]
        })

    adaptive_card_content: Dict[str, Any] = {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": body_elements
    }

    if mention_name and mention_email:
        adaptive_card_content["msteams"] = {
            "width": "Full",
            "entities": [
                {
                    "type": "mention",
                    "text": f"<at>{mention_name}</at>",
                    "mentioned": {
                        "id": mention_email,
                        "name": mention_name
                    }
                }
            ]
        }

    if action_url:
        adaptive_card_content["actions"] = [
            {
                "type": "Action.OpenUrl",
                "title": "View Incident in ServiceNow",
                "url": action_url
            }
        ]

    payload = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": adaptive_card_content
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in (200, 201, 202):
                logger.info("Teams Adaptive Card 1.4 successfully posted to webhook.")
                return True
            else:
                logger.error(f"Teams webhook returned HTTP {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to post to Teams Webhook: {e}")
        return False
