/**
 * Send a fake customer message into the local backend, as if it came from
 * Meta. Drives the full agent loop without needing a Facebook Page.
 *
 * Usage:
 *   npm run send -- [--customer <id>] [--page <id>] [--image <url>]* "<message text>"
 *
 * Examples:
 *   npm run send -- --customer fb_tahmina "lal jamdani ache?"
 *   npm run send -- --customer fb_nusrat --image https://example.com/saree.jpg "ei ta?"
 */
import { argv, exit } from 'node:process';

const API = process.env.API_URL ?? 'http://localhost:3000';

interface Args {
  pageId: string;
  customerId: string;
  text: string;
  imageUrls: string[];
}

function parse(args: string[]): Args {
  let pageId = process.env.DEFAULT_PAGE_ID ?? '';
  let customerId = '';
  let customerIdExplicit = false;
  const imageUrls: string[] = [];
  const free: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--page') pageId = args[++i];
    else if (a === '--customer') {
      customerId = args[++i];
      customerIdExplicit = true;
    } else if (a === '--image') {
      imageUrls.push(args[++i]);
    } else free.push(a);
  }

  if (free.length === 0 && imageUrls.length === 0) {
    console.error('Usage: npm run send -- [--customer <id>] [--page <id>] [--image <url>]* "<message text>"');
    exit(1);
  }

  let text: string;
  if (free.length >= 2) {
    if (!customerIdExplicit) {
      customerId = `fb_${free[0].toLowerCase().replace(/\s+/g, '_')}`;
    }
    text = free.slice(1).join(' ');
  } else {
    text = free[0] ?? '';
    if (!customerId) customerId = 'fb_tahmina';
  }

  if (!pageId) {
    console.error('No page id. Set DEFAULT_PAGE_ID env var or pass --page <id>.');
    exit(1);
  }

  return { pageId, customerId, text, imageUrls };
}

async function main() {
  const { pageId, customerId, text, imageUrls } = parse(argv.slice(2));
  const body: Record<string, unknown> = { pageId, customerId };
  if (text) body.text = text;
  if (imageUrls.length > 0) body.imageUrls = imageUrls;
  const res = await fetch(`${API}/webhooks/meta/fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const out = await res.text();
  console.log(`POST /webhooks/meta/fake → ${res.status}`);
  console.log(out);
  if (!res.ok) exit(1);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
