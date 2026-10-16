import { URL } from 'url';

/**
 * Checks if an IPv4 address is in private, loopback, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed or non-canonical IP notation is treated as blocked
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local / AWS & GCP cloud instance metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Validates whether a user-supplied webhook or target URL is safe from SSRF attacks.
 * Blocks private subnets, localhost, cloud metadata services, and unsupported protocols.
 */
export function isBlockedSsrfUrl(targetUrl: string): { blocked: boolean; reason?: string } {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { blocked: true, reason: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl.trim());
  } catch {
    return { blocked: true, reason: 'Malformed URL' };
  }

  // Only permit HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { blocked: true, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Block localhost and standard loopback hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname === '[::]'
  ) {
    return { blocked: true, reason: 'Loopback and localhost destinations are prohibited' };
  }

  // Detect IPv6 link-local or unique local
  if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
    return { blocked: true, reason: 'IPv6 local and link-local ranges are prohibited' };
  }

  // Detect IPv4 addresses
  const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { blocked: true, reason: 'Private or cloud metadata IP addresses are prohibited' };
    }
  }

  // Detect numeric integer IP format bypass (e.g. http://2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    return { blocked: true, reason: 'Integer encoded IP addresses are prohibited' };
  }

  // Detect hex IP format bypass (e.g. 0x7f000001)
  if (/^0x[0-9a-fA-F]+$/.test(hostname)) {
    return { blocked: true, reason: 'Hexadecimal encoded IP addresses are prohibited' };
  }

  return { blocked: false };
}

/**
 * Masks a password or credential string, returning '********' if set or empty string if unset.
 */
export function maskPassword(secret?: string): string {
  return (secret && secret.trim() !== '') ? '********' : '';
}

/**
 * Strips/masks sensitive secrets from ServiceNow credential responses.
 */
export function maskServiceNowCredentials<T extends Record<string, any>>(creds: T): T {
  return {
    ...creds,
    password: maskPassword(creds.password)
  };
}

/**
 * Strips/masks sensitive secrets from SMTP settings responses.
 */
export function maskSmtpSettings<T extends Record<string, any>>(settings: T): T {
  return {
    ...settings,
    pass: maskPassword(settings.pass)
  };
}

/**
 * Validates email addresses and prevents SMTP header injection (CRLF).
 */
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Prevent CRLF header injection
  if (/[\r\n]/.test(trimmed)) return false;
  // Standard RFC 5322 simplified email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates that an email recipient is permitted based on optional domain allowlist.
 */
export function isAllowedRecipientDomain(email: string, allowedDomains?: string): boolean {
  if (!allowedDomains || allowedDomains.trim() === '' || allowedDomains === '*') {
    return true; // No domain restriction active
  }
  const domains = allowedDomains.split(',').map(d => d.trim().toLowerCase().replace(/^@/, ''));
  const domainPart = email.split('@')[1]?.toLowerCase();
  if (!domainPart) return false;
  return domains.some(allowed => domainPart === allowed || domainPart.endsWith(`.${allowed}`));
}

/**
 * Validates email dispatch payload against header injection and open relay abuse.
 */
export function validateEmailPayload(params: {
  to: string;
  cc?: string;
  subject: string;
  allowedDomains?: string;
}): { valid: boolean; error?: string } {
  const { to, cc, subject, allowedDomains } = params;

  if (!to || typeof to !== 'string') {
    return { valid: false, error: 'Recipient email is required.' };
  }
  if (!subject || typeof subject !== 'string') {
    return { valid: false, error: 'Email subject is required.' };
  }
  // Prevent SMTP header injection in subject
  if (/[\r\n]/.test(subject)) {
    return { valid: false, error: 'CRLF characters are prohibited in email subject.' };
  }

  // Parse comma or semicolon separated recipients in 'to'
  const toRecipients = to.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  if (toRecipients.length === 0) {
    return { valid: false, error: 'At least one valid recipient is required.' };
  }
  for (const r of toRecipients) {
    if (!isValidEmailAddress(r)) {
      return { valid: false, error: `Invalid recipient email address format: ${r}` };
    }
    if (!isAllowedRecipientDomain(r, allowedDomains)) {
      return { valid: false, error: `Recipient domain not authorized for dispatch: ${r}` };
    }
  }

  // Validate 'cc' if present
  if (cc && typeof cc === 'string') {
    const ccRecipients = cc.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    for (const r of ccRecipients) {
      if (!isValidEmailAddress(r)) {
        return { valid: false, error: `Invalid CC email address format: ${r}` };
      }
      if (!isAllowedRecipientDomain(r, allowedDomains)) {
        return { valid: false, error: `CC recipient domain not authorized for dispatch: ${r}` };
      }
    }
  }

  return { valid: true };
}


