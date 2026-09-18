import httpx
from typing import Dict, Any
from loguru import logger
from app.config import settings

async def send_teams_webhook(
    webhook_url: str = None,
    title: str = "Incident Alert",
    summary: str = "",
    facts: Dict[str, str] = None,
    color: str = "FF0000"
) -> bool:
    """Modular Tool: Send Microsoft Teams Adaptive Card / MessageCard via Webhook."""
    url = webhook_url or settings.TEAMS_WEBHOOK_URL
    if not url:
        logger.warning("Teams Webhook URL not provided. Mocking Teams notification dispatch.")
        logger.info(f"Teams Card: {title} - {summary}")
        return True

    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": color,
        "summary": summary,
        "sections": [
            {
                "activityTitle": title,
                "activitySubtitle": summary,
                "facts": [{"name": k, "value": str(v)} for k, v in (facts or {}).items()],
                "markdown": True
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in (200, 202):
                logger.info(f"Teams notification successfully dispatched to webhook")
                return True
            else:
                logger.error(f"Teams webhook returned status {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to post to Teams Webhook: {e}")
        return False
