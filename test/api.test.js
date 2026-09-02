const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsc-test-'));
process.env.DATA_DIR = dataDir;
process.env.SMTP_HOST = '';
process.env.TEAM_ACCESS_CODE = '';

const app = require('../server/index');
const { validateSubmission } = require('../server/validate');
const { subjectFor, buildText, buildHtml } = require('../server/email');

const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

function fullPayload(overrides = {}) {
  return {
    details: {
      clientCompany: 'Al Naboodah Contracting',
      clientType: 'Main contractor',
      contactName: 'Khalid Rahman',
      contactPhone: '+971 50 123 4567',
      contactEmail: 'khalid@naboodah.ae',
      projectName: 'Dubai South Labour Village Ph.2',
      projectLocation: 'Dubai South',
      projectStage: 'Tender',
      submissionDeadline: '2026-10-15',
      priority: 'High - urgent',
      summary: 'Client needs a 500 m3/day STP plus greywater reuse for landscape.',
      salesName: 'Samarah Ahmad',
      salesEmail: 'samarah@watersecret.ae',
      visitDate: '2026-09-02',
    },
    products: ['stp', 'greywater'],
    productDetails: {
      stp: { designFlow: 500, influentSource: 'Labour accommodation', technology: 'MBBR', odourControl: true },
      greywater: { designFlow: 120, greywaterSources: ['Showers / bath', 'Laundry'], reuseApplication: ['Landscape irrigation'] },
    },
    recipients: ['engineering@watersecret.ae'],
    message: 'Client wants a budgetary offer before Thursday.',
    ...overrides,
  };
}

test('validation accepts a complete submission', () => {
  const result = validateSubmission(fullPayload());
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
  assert.strictEqual(result.data.productDetails.stp.designFlow, 500);
  assert.strictEqual(result.data.productDetails.stp.odourControl, true);
  assert.deepStrictEqual(result.data.productDetails.greywater.greywaterSources, ['Showers / bath', 'Laundry']);
});

test('validation reports every missing required field', () => {
  const result = validateSubmission({ details: {}, products: [] });
  assert.strictEqual(result.valid, false);
  const fields = result.errors.map((e) => e.field);
  assert.ok(fields.includes('clientCompany'));
  assert.ok(fields.includes('submissionDeadline'));
  assert.ok(fields.includes('products'));
});

test('validation rejects a bad e-mail and a product field that is required', () => {
  const payload = fullPayload();
  payload.details.contactEmail = 'not-an-email';
  payload.productDetails.stp.designFlow = '';
  const result = validateSubmission(payload);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.field === 'contactEmail'));
  assert.ok(result.errors.some((e) => e.field === 'stp.designFlow'));
});

test('the e-mail carries the reference, the products and the technical answers', () => {
  const { data } = validateSubmission(fullPayload());
  const record = { reference: 'WSC-2026-0001', createdAt: new Date().toISOString(), ...data, attachments: [] };
  assert.match(subjectFor(record), /^\[URGENT\] \[WSC-2026-0001\] STP \+ Greywater/);
  const text = buildText(record);
  assert.match(text, /Design flow \(m³\/day\): 500/);
  assert.match(text, /Odour control required: Yes/);
  const html = buildHtml(record);
  assert.match(html, /Sewage Treatment Plant/);
  assert.match(html, /Showers \/ bath, Laundry/);
});

test('the catalogue endpoint serves the form definition', async () => {
  const response = await fetch(`${base()}/api/catalog`);
  const body = await response.json();
  assert.strictEqual(response.status, 200);
  assert.strictEqual(body.products.length, 6);
  assert.ok(body.products.some((p) => p.id === 'vacuum'));
  assert.ok(body.recipients.length > 0);
});

test('an opportunity with an attachment is stored, listed and e-mailed', async () => {
  const form = new FormData();
  form.append('payload', JSON.stringify(fullPayload()));
  form.append('attachments', new Blob(['drawing'], { type: 'application/pdf' }), 'site-layout.pdf');

  const response = await fetch(`${base()}/api/opportunities`, { method: 'POST', body: form });
  const body = await response.json();
  assert.strictEqual(response.status, 201);
  assert.match(body.reference, /^WSC-\d{4}-\d{4}$/);
  // No SMTP in the test environment: the message is written to the outbox and
  // the phone is handed a mailto fallback.
  assert.strictEqual(body.emailStatus, 'not_configured');
  assert.ok(body.fallback.body.includes('Al Naboodah Contracting'));

  const record = JSON.parse(fs.readFileSync(path.join(dataDir, 'opportunities', `${body.reference}.json`), 'utf8'));
  assert.strictEqual(record.attachments.length, 1);
  assert.strictEqual(record.attachments[0].originalName, 'site-layout.pdf');
  assert.ok(fs.existsSync(record.attachments[0].storedPath));
  assert.ok(fs.existsSync(path.join(dataDir, 'outbox', `${body.reference}.html`)));

  const list = await (await fetch(`${base()}/api/opportunities`)).json();
  assert.ok(list.opportunities.some((o) => o.reference === body.reference && o.projectName === 'Dubai South Labour Village Ph.2'));
});

test('the same submission sent twice registers only one opportunity', async () => {
  const payload = fullPayload({ clientId: 'phone-abc-123' });
  const send = () => {
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    return fetch(`${base()}/api/opportunities`, { method: 'POST', body: form }).then((r) => r.json());
  };
  const [first, second] = [await send(), await send()];
  assert.strictEqual(second.reference, first.reference);
  assert.strictEqual(second.duplicate, true);
});

test('an incomplete submission is rejected with field errors', async () => {
  const form = new FormData();
  form.append('payload', JSON.stringify({ details: { clientCompany: 'Test' }, products: ['stp'] }));
  const response = await fetch(`${base()}/api/opportunities`, { method: 'POST', body: form });
  assert.strictEqual(response.status, 422);
  const body = await response.json();
  assert.ok(body.errors.some((e) => e.field === 'contactName'));
});

test('references keep counting up', () => {
  const { Store } = require('../server/store');
  const store = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'wsc-ref-')));
  const first = store.nextReference(new Date('2026-01-01'));
  const second = store.nextReference(new Date('2026-06-01'));
  assert.strictEqual(first, 'WSC-2026-0001');
  assert.strictEqual(second, 'WSC-2026-0002');
});
