const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const config = require('./config');
const catalog = require('./catalog');
const { Store } = require('./store');
const { validateSubmission } = require('./validate');
const { sendOpportunity, verify } = require('./mailer');
const { subjectFor, buildText } = require('./email');

const app = express();
const store = new Store(config.dataDir);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: config.maxFiles },
});

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

/** Optional shared team code, so the app can be exposed on the internet. */
function requireAccess(req, res, next) {
  if (!config.accessCode) return next();
  const provided = req.get('x-access-code') || req.query.code;
  if (provided === config.accessCode) return next();
  return res.status(401).json({ error: 'Access code required', needsAccessCode: true });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mailConfigured: config.mailConfigured, time: new Date().toISOString() });
});

app.get('/api/catalog', (req, res) => {
  res.json({
    company: catalog.COMPANY,
    sections: catalog.OPPORTUNITY_SECTIONS,
    products: catalog.PRODUCTS,
    submission: catalog.SUBMISSION_SECTION,
    recipients: config.recipients,
    mailConfigured: config.mailConfigured,
    accessCodeRequired: Boolean(config.accessCode),
    limits: { maxUploadMb: config.maxUploadMb, maxFiles: config.maxFiles },
  });
});

function safeName(name) {
  return String(name || 'attachment')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 120);
}

app.post('/api/opportunities', requireAccess, upload.array('attachments', config.maxFiles), async (req, res) => {
  let payload;
  try {
    payload = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { valid, errors, data } = validateSubmission(payload);
  if (!valid) return res.status(422).json({ error: 'Please complete the form', errors });

  const defaults = config.recipients.filter((r) => r.default).map((r) => r.email);
  const recipients = data.recipients.length ? data.recipients : defaults;
  if (!recipients.length) {
    return res.status(422).json({ error: 'No recipient selected and no default recipient configured', errors: [{ field: 'recipients', message: 'Select who should receive this opportunity' }] });
  }

  // The same submission arriving twice (retry from the phone outbox, double tap)
  // must not create a second opportunity.
  const existing = store.findByClientId(data.clientId);
  if (existing) {
    return res.status(200).json({
      reference: existing.reference,
      emailStatus: existing.email?.status || 'unknown',
      sentTo: existing.recipients || [],
      duplicate: true,
      message: `This opportunity was already registered as ${existing.reference}.`,
    });
  }

  const reference = store.nextReference();
  const dir = store.attachmentDir(reference);
  const attachments = (req.files || []).map((file, i) => {
    const filename = `${String(i + 1).padStart(2, '0')}-${safeName(file.originalname)}`;
    const storedPath = path.join(dir, filename);
    fs.writeFileSync(storedPath, file.buffer);
    return { originalName: file.originalname, storedPath, size: file.size, mimeType: file.mimetype };
  });

  const record = {
    reference,
    createdAt: new Date().toISOString(),
    ...data,
    recipients,
    attachments,
    email: { status: 'pending' },
  };
  store.save(record);
  store.rememberClientId(data.clientId, reference);

  const email = await sendOpportunity(record);
  store.updateEmailStatus(reference, email);

  const status = email.status === 'failed' ? 207 : 201;
  res.status(status).json({
    reference,
    emailStatus: email.status,
    sentTo: recipients,
    cc: email.cc || [],
    subject: email.subject,
    // Lets the phone fall back to its own mail app when SMTP is down.
    fallback: email.status === 'sent' ? null : { subject: subjectFor(record), body: buildText(record), to: recipients },
    message:
      email.status === 'sent'
        ? 'Opportunity registered and e-mailed to the engineering team.'
        : email.status === 'not_configured'
          ? 'Opportunity saved. E-mail is not configured on the server - use "Send from my mail app".'
          : `Opportunity saved but the e-mail failed: ${email.error}`,
  });
});

app.get('/api/opportunities', requireAccess, (req, res) => {
  res.json({ opportunities: store.list(Number(req.query.limit) || 50) });
});

app.get('/api/opportunities/:reference', requireAccess, (req, res) => {
  const record = store.get(req.params.reference);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

/** Retry a send that failed while the sales rep was on site. */
app.post('/api/opportunities/:reference/resend', requireAccess, async (req, res) => {
  const record = store.get(req.params.reference);
  if (!record) return res.status(404).json({ error: 'Not found' });
  const email = await sendOpportunity(record);
  store.updateEmailStatus(record.reference, email);
  res.json({ reference: record.reference, emailStatus: email.status, error: email.error });
});

app.get('/api/mail-check', requireAccess, async (req, res) => res.json(await verify()));

app.use(express.static(path.join(config.root, 'public'), { maxAge: '1h' }));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `Each attachment must be under ${config.maxUploadMb} MB`
        : error.code === 'LIMIT_FILE_COUNT'
          ? `Maximum ${config.maxFiles} attachments`
          : error.message;
    return res.status(413).json({ error: message });
  }
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`${catalog.COMPANY.name} sales app running on http://localhost:${config.port}`);
    if (!config.mailConfigured) console.log('SMTP is not configured - e-mails will be written to data/outbox instead.');
  });
}

module.exports = app;
