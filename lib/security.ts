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

