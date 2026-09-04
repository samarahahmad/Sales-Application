/**
 * Builds a single self-contained HTML file from the real app, for demos and for
 * showing the sales team what they will get before the server is deployed.
 *
 * It is the same markup, stylesheet and application code that runs in
 * production; only the API is replaced by a stand-in that keeps registrations
 * in the phone's own storage. "Send" then hands the summary to the phone's mail
 * app, exactly like the fallback the real app uses when SMTP is unreachable.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const catalog = require('../server/catalog');
const recipients = JSON.parse(read('config', 'recipients.json'));

const catalogPayload = {
  company: catalog.COMPANY,
  sections: catalog.OPPORTUNITY_SECTIONS,
  products: catalog.PRODUCTS,
  submission: catalog.SUBMISSION_SECTION,
  recipients,
  mailConfigured: false,
  accessCodeRequired: false,
  limits: { maxUploadMb: 15, maxFiles: 10 },
};

// Body markup of the real app, without the document shell.
const html = read('public', 'index.html');
const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/<script src="app\.js"><\/script>/, '')
  .trim();

const styles = read('public', 'styles.css');
const app = read('public', 'app.js');

const demoStyles = `
/* Demo strip: this build has no server behind it, and must say so. */
.demo-note {
  display: flex; gap: 8px; align-items: baseline; justify-content: center; flex-wrap: wrap;
  background: #0b4467; color: #cfe6f4; font-size: 12px; line-height: 1.45;
  padding: 7px 14px; text-align: center;
}
.demo-note strong { color: #ffffff; letter-spacing: .06em; text-transform: uppercase; font-size: 11px; }
`;

const shim = `
/* ------------------------------------------------------------------
   Stand-in for the server: keeps this preview working on its own.
   The production app talks to the Express API in server/.
   ------------------------------------------------------------------ */
(() => {
  const CATALOG = ${JSON.stringify(catalogPayload)};
  const KEY = 'wsc.demo.records.v1';
  const realFetch = window.fetch.bind(window);

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = (records) => { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* private mode */ } };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  function reference(records) {
    const year = new Date().getFullYear();
    const used = records.filter((r) => r.reference.startsWith('WSC-' + year)).length;
    return 'WSC-' + year + '-' + String(used + 1).padStart(4, '0');
  }

  function summary(payload) {
    const lines = [CATALOG.company.name + ' - new sales opportunity', ''];
    const show = (field, value) => {
      if (value === true) return 'Yes';
      if (value === false) return 'No';
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };
    for (const section of [...CATALOG.sections, CATALOG.submission]) {
      const rows = section.fields.filter((f) => payload.details[f.name] !== undefined && payload.details[f.name] !== '');
      if (!rows.length) continue;
      lines.push('== ' + section.title + ' ==');
      for (const f of rows) lines.push('  ' + f.label + ': ' + show(f, payload.details[f.name]));
      lines.push('');
    }
    for (const id of payload.products) {
      const product = CATALOG.products.find((p) => p.id === id);
      const values = payload.productDetails[id] || {};
      lines.push('== ' + product.name + ' ==');
      for (const f of product.fields) {
        if (values[f.name] === undefined || values[f.name] === '') continue;
        lines.push('  ' + f.label + ': ' + show(f, values[f.name]));
      }
      lines.push('');
    }
    if (payload.message) lines.push('== Message ==', '  ' + payload.message);
    return lines.join('\\n');
  }

  window.fetch = async (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url || '');
    const method = String(init.method || 'GET').toUpperCase();

    if (url.includes('api/catalog')) return reply(CATALOG);

    if (url.includes('api/opportunities') && url.includes('/resend')) {
      return reply({ emailStatus: 'not_configured', error: 'This is the preview - connect the app to your mail server to send automatically.' });
    }

    if (url.includes('api/opportunities') && method === 'POST') {
      const form = init.body;
      const payload = JSON.parse(form.get('payload'));
      const files = form.getAll ? form.getAll('attachments') : [];
      const records = load();

      const already = records.find((r) => payload.clientId && r.clientId === payload.clientId);
      if (already) {
        return reply({ reference: already.reference, emailStatus: 'not_configured', sentTo: already.recipients, duplicate: true,
          message: 'This opportunity was already registered as ' + already.reference + '.' });
      }

      const record = {
        reference: reference(records),
        clientId: payload.clientId,
        createdAt: new Date().toISOString(),
        clientCompany: payload.details.clientCompany || '',
        projectName: payload.details.projectName || '',
        salesName: payload.details.salesName || '',
        priority: payload.details.priority || '',
        deadline: payload.details.submissionDeadline || '',
        products: payload.products,
        recipients: payload.recipients,
        attachments: files.length,
      };
      records.unshift(record);
      save(records);

      return reply({
        reference: record.reference,
        emailStatus: 'not_configured',
        sentTo: payload.recipients,
        fallback: { subject: record.reference, body: summary(payload), to: payload.recipients },
        message: 'Preview: the registration is saved on this device. Tap "Send from my mail app" to send the full summary to the engineer now.',
      }, 201);
    }

    if (url.includes('api/opportunities')) {
      return reply({ opportunities: load().map((r) => ({ ...r, emailStatus: 'not_sent' })) });
    }

    return realFetch(input, init);
  };

  const note = document.createElement('div');
  note.className = 'demo-note';
  note.innerHTML = '<strong>Preview</strong><span>Try the full form. Nothing is e-mailed automatically here &mdash; "Send" opens your own mail app.</span>';
  document.getElementById('offlineBanner').insertAdjacentElement('afterend', note);
})();
`;

const out = `<title>Water Secret Sales</title>
<style>
${styles}
${demoStyles}</style>

${body}

<script>${shim}</script>
<script>${app}</script>
`;

const outDir = path.join(root, 'preview');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'sales-app-preview.html');
fs.writeFileSync(outFile, out);
console.log(`${outFile} (${Math.round(out.length / 1024)} KB)`);
