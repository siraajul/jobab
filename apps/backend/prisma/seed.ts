/**
 * Seed Rongdhonu Boutique — one org, one Facebook Page, a small catalog with
 * realistic Bangla product names. Idempotent: re-running upserts everything.
 *
 *   npm run seed
 *
 * After running, the script logs the org id + page external id; drop those
 * into the web .env.local and into `DEFAULT_PAGE_ID` for `npm run send`.
 */
import { PrismaClient, Platform, CommentIntent, CommentReplyMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@rongdhonu.dev';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'jobab-dev-12345';

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'org_rongdhonu' },
    update: {},
    create: {
      id: 'org_rongdhonu',
      name: 'Rongdhonu Boutique',
      status: 'active',
      catalogSource: 'csv',
      aiInstructions: [
        "You are the Rongdhonu Boutique sales agent.",
        "We sell handloom sarees and three-piece sets out of Dhaka.",
        "Standard Dhaka delivery is ৳80 (2–3 days); outside Dhaka is ৳130.",
        "Cash on delivery is fine for first orders under ৳3,000; otherwise insist on bKash advance.",
        "Be warm. Use the customer's language (Bangla, Banglish, or English).",
      ].join('\n'),
    },
  });

  const page = await prisma.page.upsert({
    where: { platform_externalPageId: { platform: Platform.facebook, externalPageId: 'page_rongdhonu' } },
    update: {},
    create: {
      id: 'page_rongdhonu',
      organizationId: org.id,
      platform: Platform.facebook,
      externalPageId: 'page_rongdhonu',
      accessToken: 'dev-token-not-used-in-fake-mode',
      webhookSubscribed: true,
      status: 'connected',
    },
  });

  const products = [
    {
      id: 'p_lal_jamdani',
      external: 'sku-lal-jamdani',
      title: 'Lal Jamdani Shari',
      description: 'লাল জামদানি শাড়ি · cotton handloom · red with gold zari border',
      price: 1650,
      variants: [
        { id: 'v_lal_med', name: 'Medium · Red', sku: 'LJ-M-R', price: 1650, stock: 6 },
        { id: 'v_lal_lrg', name: 'Large · Red', sku: 'LJ-L-R', price: 1650, stock: 2 },
      ],
    },
    {
      id: 'p_karchupi',
      external: 'sku-karchupi-3pc',
      title: 'Karchupi Three-Piece',
      description: 'কারচুপি থ্রি-পিস · festive · embroidery on viscose georgette',
      price: 1850,
      variants: [
        { id: 'v_karchupi_teal', name: 'Large · Teal', sku: 'K3-L-T', price: 1850, stock: 4 },
        { id: 'v_karchupi_pink', name: 'Medium · Pink', sku: 'K3-M-P', price: 1850, stock: 3 },
      ],
    },
    {
      id: 'p_cotton_kurti',
      external: 'sku-cotton-kurti',
      title: 'Cotton Kurti',
      description: 'কটন কুর্তি · daily wear · mustard / olive / cream',
      price: 990,
      variants: [
        { id: 'v_kurti_mustard', name: 'Medium · Mustard', sku: 'CK-M-MU', price: 990, stock: 8 },
        { id: 'v_kurti_olive', name: 'Large · Olive', sku: 'CK-L-OL', price: 990, stock: 5 },
      ],
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { organizationId_externalId: { organizationId: org.id, externalId: p.external } },
      update: { title: p.title, description: p.description, price: p.price },
      create: {
        id: p.id,
        organizationId: org.id,
        externalId: p.external,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: 'BDT',
      },
    });
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { id: v.id },
        update: { stockQty: v.stock, price: v.price },
        create: {
          id: v.id,
          productId: p.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stockQty: v.stock,
        },
      });
    }
  }

  // ── Owner user ──────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 11);
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL.toLowerCase() },
    update: { passwordHash, name: 'Rongdhonu Owner' },
    create: {
      email: OWNER_EMAIL.toLowerCase(),
      name: 'Rongdhonu Owner',
      passwordHash,
    },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    update: { role: 'owner' },
    create: { userId: owner.id, organizationId: org.id, role: 'owner' },
  });

  // ── Default comment rules ──────────────────────────────────────────────
  for (const intent of Object.values(CommentIntent)) {
    const isSpam = intent === CommentIntent.spam;
    await prisma.commentRule.upsert({
      where: { organizationId_intent: { organizationId: org.id, intent } },
      update: {},
      create: {
        organizationId: org.id,
        intent,
        replyMode: isSpam ? CommentReplyMode.off : CommentReplyMode.ai,
        privateAllowed: !isSpam,
        publicTemplate:
          intent === CommentIntent.price
            ? 'apnake inbox e details pathiyechi 🙂'
            : intent === CommentIntent.buy
              ? 'inbox e order confirm korte parben, apa 🌸'
              : intent === CommentIntent.question
                ? 'inbox check korle reply pabachen 😊'
                : null,
      },
    });
  }

  console.log('\nSeeded ✓');
  console.log(`  Organization id      : ${org.id}`);
  console.log(`  Page (external id)   : ${page.externalPageId}`);
  console.log(`  Owner login          : ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log('\nNext:');
  console.log(`  Web .env.local       NEXT_PUBLIC_ORG_ID=${org.id}`);
  console.log(`  Send a fake msg      DEFAULT_PAGE_ID=${page.externalPageId} pnpm send -- "lal shari ache?"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
