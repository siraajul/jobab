import { BadRequestException } from '@nestjs/common';
import { isIP } from 'node:net';

/** Operator-approved hosts prevent catalog credentials being sent to arbitrary/internal URLs. */
export function approvedStoreUrl(input: string, allowedHosts: string[]): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestException('Invalid store URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    isIP(url.hostname) ||
    !allowedHosts.includes(url.hostname.toLowerCase()) ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.local')
  ) {
    throw new BadRequestException(
      'This HTTPS store must be approved by the administrator before connecting',
    );
  }
  return url;
}
