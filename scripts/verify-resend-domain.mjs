#!/usr/bin/env node
// One-time operational script: registers a sending domain with Resend
// and (optionally) creates the required DNS records automatically via
// Cloudflare's API, then asks Resend to verify.
//
// Why this exists: the app's transactional email (magic links, invoice
// notices, job request decisions, weekly digests, health/CRM alerts) has
// been unable to reach any recipient except the Resend account's own
// registered address, because Resend has no verified sending domain --
// confirmed live via the actual Resend API error: "You can only send
// testing emails to your own email address... please verify a domain at
// resend.com/domains." See PROGRESS.md's 2026-07-06 session entry for
// the full investigation.
//
// This script cannot be run by an AI agent on your behalf: it needs (a)
// the exact domain name you want to send from, which nothing in this
// codebase specifies (the code's fallback default, 'lionjobs.co', does
// not resolve in public DNS -- it was never actually registered), and
// (b) your own DNS provider's API credentials, which no MCP/tool
// available to this session has access to. Run it yourself once you
// have both.
//
// Usage:
//   RESEND_API_KEY=re_xxx DOMAIN_NAME=yourdomain.com node scripts/verify-resend-domain.mjs
//
// Add these two to also auto-create the DNS records via Cloudflare
// instead of adding them by hand in the Cloudflare dashboard:
//   CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ZONE_ID=xxx
//
// (Cloudflare API token needs Zone:DNS:Edit permission on the zone for
// DOMAIN_NAME. Create one at dash.cloudflare.com -> My Profile -> API
// Tokens -> Create Token -> "Edit zone DNS" template, scoped to that
// one zone.)
//
// After this succeeds, still needed (this script does not do it):
//   vercel env add RESEND_FROM_EMAIL production --force \
//     --value="Lion Jobs Agency <noreply@yourdomain.com>"
//   vercel env add RESEND_FROM_EMAIL preview --force \
//     --value="Lion Jobs Agency <noreply@yourdomain.com>"
//   vercel redeploy <production-url> --target production
// (env var changes don't apply to already-running serverless functions --
// same rotation lesson as CRON_SECRET in CTO_HANDOVER.md.)

const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const DOMAIN_NAME          = process.env.DOMAIN_NAME;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID   = process.env.CLOUDFLARE_ZONE_ID;

if (!RESEND_API_KEY || !DOMAIN_NAME) {
  console.error('Usage: RESEND_API_KEY=re_xxx DOMAIN_NAME=yourdomain.com node scripts/verify-resend-domain.mjs');
  process.exit(1);
}

async function resendRequest(path, options = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function cloudflareCreateRecord(record) {
  // Resend record.type is one of: MX, TXT, CNAME. Cloudflare's create
  // record endpoint takes the same shape with minor field-name differences.
  const body = {
    type:     record.type,
    name:     record.name,
    content:  record.value,
    ttl:      1, // "Auto" in Cloudflare's dashboard
    priority: record.priority ?? undefined,
  };
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!json.success) {
    // Cloudflare returns success:false with an errors array even on a
    // 200 -- surface it either way rather than assuming ok.
    throw new Error(`Cloudflare error creating ${record.type} ${record.name}: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

async function main() {
  console.log(`Registering domain ${DOMAIN_NAME} with Resend...`);
  const domain = await resendRequest('/domains', {
    method: 'POST',
    body:   JSON.stringify({ name: DOMAIN_NAME }),
  });
  console.log(`Domain created: id=${domain.id}, status=${domain.status}`);
  console.log('Required DNS records:');
  console.table(domain.records.map((r) => ({ type: r.type, name: r.name, value: r.value, priority: r.priority ?? '' })));

  if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID) {
    console.log('\nCLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID provided -- creating records automatically...');
    for (const record of domain.records) {
      try {
        await cloudflareCreateRecord(record);
        console.log(`  Created ${record.type} ${record.name}`);
      } catch (err) {
        console.error(`  FAILED ${record.type} ${record.name}:`, err.message);
        console.error('  Add this record manually in the Cloudflare dashboard instead.');
      }
    }
  } else {
    console.log('\nNo CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID provided -- add the records above manually');
    console.log('at your DNS provider (Cloudflare dashboard, or wherever this domain is hosted), then re-run');
    console.log('this script (or just POST /domains/{id}/verify) once DNS has propagated (can take a few minutes to a few hours).');
  }

  console.log('\nRequesting verification from Resend...');
  try {
    const verify = await resendRequest(`/domains/${domain.id}/verify`, { method: 'POST' });
    console.log('Verify response:', verify);
  } catch (err) {
    console.error('Verification not ready yet (expected if DNS hasn\'t propagated):', err.message);
    console.error(`Re-check anytime at https://resend.com/domains/${domain.id}, or re-run this script.`);
  }

  console.log('\nNext steps once verified (this script does not do this part):');
  console.log(`  vercel env add RESEND_FROM_EMAIL production --force --value="Lion Jobs Agency <noreply@${DOMAIN_NAME}>"`);
  console.log(`  vercel env add RESEND_FROM_EMAIL preview --force --value="Lion Jobs Agency <noreply@${DOMAIN_NAME}>"`);
  console.log('  vercel redeploy <production-url> --target production');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
