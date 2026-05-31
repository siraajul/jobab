export type StepKey = 'shop' | 'page' | 'catalog' | 'ai' | 'whatsapp' | 'test' | 'done';

export const STEPS: Array<{ key: StepKey; title: string; body: string }> = [
  { key: 'shop', title: 'Name your shop', body: "What customers will see in the AI's replies." },
  {
    key: 'page',
    title: 'Connect a Facebook Page',
    body: 'Or use the sample page to try it without Meta access.',
  },
  {
    key: 'catalog',
    title: 'Load your catalog',
    body: 'Upload a CSV, or seed the sample boutique to play.',
  },
  {
    key: 'ai',
    title: 'Teach the AI your voice',
    body: 'Tone, delivery rates, returns — anything you tell new staff.',
  },
  {
    key: 'whatsapp',
    title: 'Where should we ping you?',
    body: 'WhatsApp number for "Tahmina needs you" alerts.',
  },
  {
    key: 'test',
    title: 'Send yourself a test DM',
    body: 'See the AI reply to a fake customer in 5 seconds.',
  },
  { key: 'done', title: "You're live", body: 'Open the inbox and let Jobab run.' },
];

export const SAMPLE_CSV = `external_id,title,description,price,currency,variant_external_id,variant_name,sku,variant_price,stock_qty
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-m,Medium · Red,SS-M-R,1250,6
sample-saree,Sample Cotton Saree,light handloom cotton in red,1250,BDT,sample-saree-l,Large · Red,SS-L-R,1250,3
`;

export interface CsvFile {
  name: string;
  content: string;
  rows: string[][];
}

/** Minimal CSV splitter for the preview — handles quoted commas. Production
 *  imports still go through the backend's catalog adapter. */
export function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
