from typing import Dict, Any, List
from loguru import logger
from app.tools.email_tool import send_email_notification
from app.tools.teams_tool import send_teams_webhook
from app.schemas.notification import NotificationDispatch, NotificationResult

class NotificationService:
    """Service encapsulating notification dispatch orchestrations."""

    async def dispatch(self, payload: NotificationDispatch) -> List[NotificationResult]:
        results: List[NotificationResult] = []

        if payload.channel in ("teams", "all"):
            success = await send_teams_webhook(
                title=f"Incident Notification: {payload.incident_id}",
                summary=payload.message_body,
                facts={
                    "Incident ID": payload.incident_id,
                    "Recipient": payload.recipient,
                    "Body": payload.message_body
                }
            )
            results.append(
                NotificationResult(
                    success=success,
                    channel="teams",
                    recipient=payload.recipient,
                    message="Teams webhook dispatched" if success else "Failed to send Teams webhook",
                    timestamp=""
                )
            )

        if payload.channel in ("email", "all"):
            subject = payload.subject or f"[ALERT] Incident Notification {payload.incident_id}"
            body_html = f"<h3>Incident Alert</h3><p>{payload.message_body}</p>"
            success = await send_email_notification(
                to_email=payload.recipient,
                subject=subject,
                body_html=body_html
            )
            results.append(
                NotificationResult(
                    success=success,
                    channel="email",
                    recipient=payload.recipient,
                    message="Email sent" if success else "Failed to send email",
                    timestamp=""
                )
            )

        return results

notification_service = NotificationService()
