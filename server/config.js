const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function list(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The engineers an opportunity can be sent to. Edit config/recipients.json (it
 * is read on every request so the office can update it without a restart), or
 * override with the DEFAULT_RECIPIENTS environment variable.
 */
function loadRecipients() {
  const file = process.env.RECIPIENTS_FILE || path.join(ROOT, 'config', 'recipients.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(parsed)) return parsed.filter((r) => r && r.email);
  } catch {
    /* fall through to the environment based default */
  }
  return list(process.env.DEFAULT_RECIPIENTS).map((email) => ({ name: email, email, default: true }));
}

const config = {
  root: ROOT,
  port: Number(process.env.PORT || 3000),
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  accessCode: process.env.TEAM_ACCESS_CODE || '',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 15),
  maxFiles: Number(process.env.MAX_FILES || 10),
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: bool(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT) === 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Water Secret Sales App <no-reply@watersecret.local>',
    replyToSales: bool(process.env.MAIL_REPLY_TO_SALES, true),
    ccSales: bool(process.env.MAIL_CC_SALES, true),
  },
  get recipients() {
    return loadRecipients();
  },
  get mailConfigured() {
    return Boolean(this.mail.host);
  },
};

module.exports = config;
