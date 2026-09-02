const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('./config');
const { subjectFor, buildHtml, buildText } = require('./email');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.mailConfigured) return null;
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
  return transporter;
}

/** Without SMTP credentials we still produce the e-mail, on disk, so the flow
 * can be demonstrated and the message can be forwarded manually. */
function writePreview(record, message) {
  const dir = path.join(config.dataDir, 'outbox');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${record.reference}.html`);
  fs.writeFileSync(file, message.html);
  fs.writeFileSync(path.join(dir, `${record.reference}.txt`), `To: ${message.to}\nCc: ${message.cc || ''}\nSubject: ${message.subject}\n\n${message.text}`);
  return file;
}

/**
 * Send the opportunity to the engineering team.
 * Never throws - the caller records the outcome on the saved opportunity so a
 * failed send can be retried instead of losing the visit report.
 */
async function sendOpportunity(record) {
  const to = (record.recipients || []).join(', ');
  const ccList = [...(record.cc || [])];
  if (config.mail.ccSales && record.details?.salesEmail && !ccList.includes(record.details.salesEmail)) {
    ccList.push(record.details.salesEmail);
  }

  const message = {
    from: config.mail.from,
    to,
    cc: ccList.join(', ') || undefined,
    replyTo: config.mail.replyToSales && record.details?.salesEmail ? record.details.salesEmail : undefined,
    subject: subjectFor(record),
    text: buildText(record),
    html: buildHtml(record),
    attachments: (record.attachments || []).map((a) => ({ filename: a.originalName, path: a.storedPath })),
  };

  const transport = getTransporter();
  if (!transport) {
    const preview = writePreview(record, message);
    return { status: 'not_configured', to, cc: ccList, subject: message.subject, preview, sentAt: null };
  }

  try {
    const info = await transport.sendMail(message);
    return { status: 'sent', to, cc: ccList, subject: message.subject, messageId: info.messageId, sentAt: new Date().toISOString() };
  } catch (error) {
    return { status: 'failed', to, cc: ccList, subject: message.subject, error: error.message, sentAt: null };
  }
}

async function verify() {
  const transport = getTransporter();
  if (!transport) return { ok: false, reason: 'SMTP is not configured (set SMTP_HOST in .env)' };
  try {
    await transport.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

module.exports = { sendOpportunity, verify };
