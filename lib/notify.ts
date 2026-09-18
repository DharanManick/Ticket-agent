// Shared Utility Library for MS Teams and MS Outlook Notifications via Microsoft Graph & Power Automate
// Compatible with both Express and Next.js App Router

export interface NotificationTicket {
  ticketNumber: string;
  assigneeName: string;
  assigneeUpn: string;
  auditScore: number;
  scoreColor: 'Red' | 'Amber' | 'Green';
  issues: string[];
  managerUpn: string;
  managerName: string;
}

/**
 * Checks if a UPN looks like a real individual email (rather than a distribution list, helpdesk group, or shared mailbox)
 */
export function isIndividualUpn(upn: string): boolean {
  if (!upn) return false;
  const lower = upn.toLowerCase().trim();
  const groupKeywords = [
    'group', 'dl-', 'dl.', '-dl', 'team', 'support', 'helpdesk', 'service', 
    'info', 'admin', 'contact', 'shared', 'mailbox', 'list', 'distribution', 
    'notifications', 'alerts', 'compliance', 'desk', 'api', 'bot'
  ];
  return !groupKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Normalizes input ticket structures into standard NotificationTicket interface
 */
export function normalizeTicket(t: any): NotificationTicket {
  const ticketNumber = t.ticketNumber || t.incNumber || t.id || 'INC0000000';
  const assigneeName = t.assigneeName || t.assignee || 'Unassigned';
  const assigneeUpn = t.assigneeUpn || t.assigneeEmail || t.assignee_upn || t.assignedToEmail || 'assignee@company.com';
  
  const auditScore = Number(
    t.auditScore !== undefined ? t.auditScore : 
    (t.percentage !== undefined ? t.percentage : 
    (t.score !== undefined ? t.score : 0))
  );
  
  let scoreColor = t.scoreColor || t.color || 'Green';
  if (auditScore < 50) scoreColor = 'Red';
  else if (auditScore < 75) scoreColor = 'Amber';
  else scoreColor = 'Green';

  const issues = Array.isArray(t.issues) ? t.issues : (Array.isArray(t.infractions) ? t.infractions : []);
  const managerUpn = t.managerUpn || t.managerEmail || t.manager_upn || t.managerToEmail || 'manager@company.com';
  const managerName = t.managerName || t.manager || 'Line Manager';

  return {
    ticketNumber,
    assigneeName,
    assigneeUpn,
    auditScore,
    scoreColor: scoreColor as 'Red' | 'Amber' | 'Green',
    issues,
    managerUpn,
    managerName
  };
}

/**
 * Fetches an app-only access token for Microsoft Graph via client_credentials flow
 */
export async function getGraphAccessToken(): Promise<string> {
  const tenantId = process.env.OUTLOOK_TENANT_ID || process.env.TENANT_ID;
  const clientId = process.env.OUTLOOK_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET || process.env.CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph Azure AD App credentials missing in environmental variables (OUTLOOK_TENANT_ID, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET).');
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const bodyParams = new URLSearchParams();
  bodyParams.append('client_id', clientId);
  bodyParams.append('client_secret', clientSecret);
  bodyParams.append('scope', 'https://graph.microsoft.com/.default');
  bodyParams.append('grant_type', 'client_credentials');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to acquire MS Graph Access Token (HTTP ${res.status}): ${text}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

/**
 * Sends HTML Email via Microsoft Graph API sendMail endpoint
 */
export async function sendOutlookEmail(
  senderEmail: string,
  recipientEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; simulated: boolean; message?: string; error?: string }> {
  // If credentials are not fully defined, trigger simulated fallback safely
  const tenantId = process.env.OUTLOOK_TENANT_ID || process.env.TENANT_ID;
  const clientId = process.env.OUTLOOK_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET || process.env.CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.warn('[Outlook Email Simulator] Credentials missing. Simulating delivery to:', recipientEmail);
    return {
      success: true,
      simulated: true,
      message: `Simulated Email Sent Successfully! Sender: <${senderEmail || 'system@compliance.local'}>, Recipient: <${recipientEmail}>, Subject: "${subject}".`
    };
  }

  try {
    const token = await getGraphAccessToken();
    const activeFrom = senderEmail || 'audit-notifications@company.com';
    const mailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(activeFrom)}/sendMail`;

    const response = await fetch(mailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: htmlContent
          },
          toRecipients: [
            { emailAddress: { address: recipientEmail } }
          ]
        },
        saveToSentItems: 'false'
      })
    });

    if (response.status === 200 || response.status === 202) {
      return { success: true, simulated: false };
    } else {
      const errTxt = await response.text();
      return { success: false, simulated: false, error: `Microsoft Graph API status ${response.status}: ${errTxt}` };
    }
  } catch (err: any) {
    console.error('[sendOutlookEmail Error]', err);
    return { success: false, simulated: false, error: err.message || String(err) };
  }
}

/**
 * Dispatches a formatted webhook request to MS Teams via Power Automate Webhook URL
 */
export async function sendTeamsMessage(
  webhookUrl: string,
  payload: any
): Promise<{ success: boolean; simulated: boolean; message?: string; error?: string }> {
  if (!webhookUrl || webhookUrl.includes('placeholder') || webhookUrl.length < 15) {
    console.warn('[Teams Webhook Simulator] Invalid or empty webhook URL. Simulating dispatch.');
    return {
      success: true,
      simulated: true,
      message: 'Simulated MS Teams alert delivered successfully.'
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      return { success: true, simulated: false };
    } else {
      const errTxt = await response.text();
      return { success: false, simulated: false, error: `Teams Power Automate status ${response.status}: ${errTxt}` };
    }
  } catch (err: any) {
    console.error('[sendTeamsMessage Error]', err);
    return { success: false, simulated: false, error: err.message || String(err) };
  }
}

/**
 * Builds standard individual assignee alert HTML body
 */
export function buildIndividualEmailBody(ticketNumber: string, score: number, color: string, issues: string[]): string {
  const colorHex = color === 'Red' ? '#e53e3e' : (color === 'Amber' ? '#dd6b20' : '#319795');
  const badgeEmoji = color === 'Red' ? '🔴' : (color === 'Amber' ? '🟡' : '🟢');
  const issuesListHtml = issues.map(issue => `<li style="margin: 6px 0; color: #4a5568;">${issue}</li>`).join('');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: ${colorHex}; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 600;">SLA Compliance Audit Notification</h2>
        <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Quality and Compliance Sweep Alert</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #2d3748; line-height: 1.5; margin-top: 0;">
          Your recent incident closing procedure for ticket <strong>${ticketNumber}</strong> has been audited and scored.
        </p>
        
        <div style="background-color: #f7fafc; border-left: 4px solid ${colorHex}; padding: 15px; margin: 20px 0; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 14px; color: #718096; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Audit Compliance Score</span>
            <div style="font-size: 28px; font-weight: 800; color: #1a202c;">${score}% ${badgeEmoji}</div>
          </div>
          <div style="background-color: ${colorHex}22; padding: 6px 12px; border-radius: 9999px; font-weight: bold; color: ${colorHex}; font-size: 14px;">
            ${color} Category
          </div>
        </div>

        ${issues.length > 0 ? `
          <h3 style="font-size: 16px; color: #2d3748; border-bottom: 2px solid #edf2f7; padding-bottom: 8px; margin-top: 24px;">🚨 Compliance Issues Found:</h3>
          <ul style="padding-left: 20px; margin: 10px 0 0 0;">
            ${issuesListHtml}
          </ul>
        ` : `
          <p style="color: #38a169; font-weight: 500; display: flex; align-items: center; margin-top: 24px;">
            ✨ Congratulations! Your ticket closing procedure successfully aligns with all active audit guidelines.
          </p>
        `}

        <div style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px;">
          <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0;">
            This is an automated notification from the **SLA Compliance and Governance Office**. Please review your incident documentation on ServiceNow to make required corrections or align future operations.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds consolidated manager weekly/wave review email HTML body
 */
export function buildManagerEmailBody(managerName: string, tickets: NotificationTicket[], cutoffThreshold: number = 75): string {
  const total = tickets.length;
  const failed = tickets.filter(t => t.auditScore < cutoffThreshold || t.scoreColor === 'Red' || t.scoreColor === 'Amber').length;
  const average = total > 0 ? Math.round(tickets.reduce((sum, t) => sum + t.auditScore, 0) / total) : 100;
  
  const rowsHtml = tickets.map(t => {
    const badgeEmoji = t.scoreColor === 'Red' ? '🔴' : (t.scoreColor === 'Amber' ? '🟡' : '🟢');
    const colorHex = t.scoreColor === 'Red' ? '#e53e3e' : (t.scoreColor === 'Amber' ? '#dd6b20' : '#38a169');
    const issuesList = t.issues.length > 0 
      ? t.issues.map(iss => `<div style="margin: 2px 0;">• ${iss}</div>`).join('') 
      : '<span style="color:#38a169; font-weight:500;">Compliant</span>';

    return `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 12px; font-weight: bold; font-family: monospace; font-size: 14px; color: #0078D7;">${t.ticketNumber}</td>
        <td style="padding: 12px; font-size: 14px; color: #2d3748;">
          <strong>${t.assigneeName}</strong><br/>
          <span style="font-size: 11px; color: #718096;">${t.assigneeUpn}</span>
        </td>
        <td style="padding: 12px; font-size: 15px; font-weight: bold; color: ${colorHex};">
          ${t.auditScore}% ${badgeEmoji}
        </td>
        <td style="padding: 12px; font-size: 12px; color: #4a5568; line-height: 1.4;">
          ${issuesList}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #2b6cb0; color: white; padding: 22px 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h2 style="margin: 0; font-size: 22px; font-weight: 600;">Executive Team Compliance Review</h2>
          <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">Aggregated SLA Audit Results for Direct Reports</p>
        </div>
        <div style="background-color: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 6px; text-align: right; min-width: 120px;">
          <div style="font-size: 11px; text-transform: uppercase; opacity: 0.8; font-weight: bold;">Team Average</div>
          <div style="font-size: 22px; font-weight: 800;">${average}%</div>
        </div>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <p style="font-size: 15px; color: #2d3748; line-height: 1.5; margin-top: 0;">
          Dear <strong>${managerName}</strong>,
        </p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.5;">
          A scheduled quality sweep has completed auditing closing workflows for incidents logged under your supervisees. A total of <strong>${total}</strong> tickets were reviewed, with <strong>${failed}</strong> flagged below the standard compliance cutoff threshold of <strong>${cutoffThreshold}%</strong>.
        </p>

        <div style="background-color: #f7fafc; border-left: 4px solid #2b6cb0; padding: 16px; border-radius: 4px; margin: 24px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div style="text-align: center; border-right: 1px solid #e2e8f0;">
            <div style="font-size: 12px; color: #718096; text-transform: uppercase; font-weight: 600;">Audited</div>
            <div style="font-size: 24px; font-weight: bold; color: #2d3748; margin-top: 4px;">${total}</div>
          </div>
          <div style="text-align: center; border-right: 1px solid #e2e8f0;">
            <div style="font-size: 12px; color: #718096; text-transform: uppercase; font-weight: 600;">Flagged</div>
            <div style="font-size: 24px; font-weight: bold; color: #e53e3e; margin-top: 4px;">${failed}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 12px; color: #718096; text-transform: uppercase; font-weight: 600;">Quality Metric</div>
            <div style="font-size: 24px; font-weight: bold; color: #319795; margin-top: 4px;">${average >= 75 ? 'Pass' : 'Warning'}</div>
          </div>
        </div>

        <h3 style="font-size: 16px; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; margin-bottom: 12px;">🚨 Detailed SLA Audit Matrix</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #edf2f7; text-align: left; font-size: 11px; text-transform: uppercase; color: #4a5568; border-bottom: 2px solid #cbd5e0;">
              <th style="padding: 10px;">Incident</th>
              <th style="padding: 10px;">Engineer</th>
              <th style="padding: 10px;">Audit Score</th>
              <th style="padding: 10px;">Infractions & Discrepancies</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <p style="font-size: 13px; color: #718096; line-height: 1.5; margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px;">
          *Please review these findings with your engineers to support continuous improvement and incident document fidelity. This summary is generated dynamically. Please do not reply.*
        </p>
      </div>
    </div>
  `;
}
