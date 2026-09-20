from datetime import datetime
from typing import Dict, Any, List
from loguru import logger
from app.tools.email_tool import send_email_notification
from app.tools.teams_tool import send_teams_webhook
from app.schemas.notification import NotificationDispatch, NotificationResult

class NotificationService:
    """Service encapsulating resilient notification dispatch orchestrations with automatic fallback email."""

    async def dispatch(self, payload: NotificationDispatch) -> List[NotificationResult]:
        results: List[NotificationResult] = []
        meta = payload.metadata or {}
        now_ts = datetime.utcnow().isoformat() + "Z"

        # Resolve recipient metadata
        recipient_name = meta.get("assigneeName") or meta.get("assignee") or payload.recipient
        recipient_email = meta.get("assigneeEmail") or (payload.recipient if "@" in payload.recipient else f"{payload.recipient}@company.com")
        snow_url = meta.get("servicenowUrl")

        teams_attempted = False
        teams_succeeded = False

        if payload.channel in ("teams", "all"):
            teams_attempted = True
            logger.info(f"Dispatching Teams Adaptive Card for Incident {payload.incident_id} to {recipient_name} ({recipient_email})...")
            
            teams_succeeded = await send_teams_webhook(
                title=f"Incident Notification: {payload.incident_id}",
                summary=payload.message_body,
                facts={
                    "Incident ID": payload.incident_id,
                    "Assignee": recipient_name,
                    "Email": recipient_email,
                    "Assignment Group": meta.get("assignmentGroup", "N/A"),
                    "Audit Score": f"{meta.get('score', 'N/A')}%"
                },
                color="Attention" if meta.get("statusColor") == "Red" else "Warning",
                mention_name=recipient_name,
                mention_email=recipient_email,
                action_url=snow_url
            )

            results.append(
                NotificationResult(
                    success=teams_succeeded,
                    channel="teams",
                    recipient=recipient_email,
                    message="Teams Adaptive Card dispatched successfully" if teams_succeeded else "Failed to send Teams Adaptive Card",
                    timestamp=now_ts
                )
            )

            # Resilient Fallback Email if Teams failed
            if not teams_succeeded and payload.channel == "teams":
                logger.warning(
                    f"⚠️ [Notification Fallback] Teams dispatch failed for incident {payload.incident_id}. "
                    f"Engaging automatic Fallback Email dispatch to {recipient_email}..."
                )
                fb_subject = f"[FALLBACK EMAIL - Teams Failed] Incident Notification {payload.incident_id}"
                fb_body = (
                    f"<h3>Incident SLA Quality Notification (Fallback Route)</h3>"
                    f"<p><strong>Attention {recipient_name}:</strong> A Microsoft Teams notification could not be delivered.</p>"
                    f"<p>{payload.message_body}</p>"
                    f"<p><em>Please review this incident in ServiceNow immediately.</em></p>"
                )
                fb_success = await send_email_notification(
                    to_email=recipient_email,
                    subject=fb_subject,
                    body_html=fb_body
                )
                results.append(
                    NotificationResult(
                        success=fb_success,
                        channel="email-fallback",
                        recipient=recipient_email,
                        message="Automatic fallback email sent upon Teams failure" if fb_success else "Fallback email also failed",
                        timestamp=datetime.utcnow().isoformat() + "Z"
                    )
                )

        if payload.channel in ("email", "all"):
            subject = payload.subject or f"[ALERT] Incident Notification {payload.incident_id}"
            body_html = (
                f"<h3>ServiceNow Incident Audit Alert</h3>"
                f"<p><strong>Incident Reference:</strong> {payload.incident_id}</p>"
                f"<p><strong>Recipient:</strong> {recipient_name}</p>"
                f"<p>{payload.message_body}</p>"
            )
            if snow_url:
                body_html += f"<p><a href='{snow_url}'>Open in ServiceNow</a></p>"

            success = await send_email_notification(
                to_email=recipient_email,
                subject=subject,
                body_html=body_html
            )
            results.append(
                NotificationResult(
                    success=success,
                    channel="email",
                    recipient=recipient_email,
                    message="Email dispatched successfully" if success else "Failed to send email",
                    timestamp=now_ts
                )
            )

        return results

notification_service = NotificationService()
