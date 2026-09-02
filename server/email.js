const { COMPANY, OPPORTUNITY_SECTIONS, SUBMISSION_SECTION, getProduct } = require('./catalog');

const BRAND = '#0f5c8c';
const ACCENT = '#12a3a0';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayValue(field, value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (field?.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  if (field?.type === 'number' && typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}

/** [{ title, rows: [[label, value]] }] for every filled part of the record. */
function buildBlocks(record) {
  const blocks = [];

  for (const section of [...OPPORTUNITY_SECTIONS, SUBMISSION_SECTION]) {
    const rows = section.fields
      .filter((f) => record.details?.[f.name] !== undefined && record.details[f.name] !== '')
      .map((f) => [f.label, displayValue(f, record.details[f.name])]);
    if (rows.length) blocks.push({ title: section.title, rows });
  }

  for (const id of record.products || []) {
    const product = getProduct(id);
    if (!product) continue;
    const values = record.productDetails?.[id] || {};
    const rows = product.fields
      .filter((f) => values[f.name] !== undefined && values[f.name] !== '')
      .map((f) => [f.label, displayValue(f, values[f.name])]);
    blocks.push({ title: product.name, rows, product: true });
  }

  return blocks;
}

function subjectFor(record) {
  const products = (record.products || []).map((id) => getProduct(id)?.short || id).join(' + ');
  const client = record.details?.clientCompany || 'New client';
  const project = record.details?.projectName || 'New opportunity';
  const urgent = record.details?.priority === 'High - urgent' ? '[URGENT] ' : '';
  return `${urgent}[${record.reference}] ${products} - ${project} (${client})`;
}

function buildText(record) {
  const lines = [];
  lines.push(`${COMPANY.name} - New sales opportunity`);
  lines.push(`Reference: ${record.reference}`);
  lines.push(`Registered: ${new Date(record.createdAt).toUTCString()}`);
  lines.push('');
  const products = (record.products || []).map((id) => getProduct(id)?.name || id);
  lines.push(`Products: ${products.join(', ')}`);
  lines.push('');
  for (const block of buildBlocks(record)) {
    lines.push(`== ${block.title} ==`);
    for (const [label, value] of block.rows) lines.push(`  ${label}: ${value}`);
    lines.push('');
  }
  if (record.message) {
    lines.push('== Message to the engineering team ==');
    lines.push(`  ${record.message}`);
    lines.push('');
  }
  const attachments = record.attachments || [];
  lines.push(`Attachments: ${attachments.length ? attachments.map((a) => a.originalName).join(', ') : 'none'}`);
  lines.push('');
  lines.push(`Sent from the ${COMPANY.name} sales application.`);
  return lines.join('\n');
}

function buildHtml(record) {
  const blocks = buildBlocks(record);
  const products = (record.products || []).map((id) => getProduct(id)?.name || id);
  const priority = record.details?.priority || '';
  const priorityColour = priority.startsWith('High') ? '#c0392b' : priority === 'Low' ? '#7f8c8d' : '#c98a12';
  const deadline = record.details?.submissionDeadline
    ? displayValue({ type: 'date' }, record.details.submissionDeadline)
    : 'Not given';

  const blockHtml = blocks
    .map(
      (block) => `
      <tr><td style="padding:20px 22px 6px 22px;">
        <div style="font:600 13px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${block.product ? ACCENT : BRAND};border-bottom:2px solid ${block.product ? ACCENT : BRAND};padding-bottom:6px;">${escapeHtml(block.title)}</div>
      </td></tr>
      <tr><td style="padding:0 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${block.rows
            .map(
              ([label, value], i) => `
            <tr style="background:${i % 2 ? '#ffffff' : '#f5f8fa'};">
              <td style="padding:9px 10px;font:400 13px/1.5 Arial,sans-serif;color:#5a6b76;width:42%;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:9px 10px;font:600 13px/1.5 Arial,sans-serif;color:#12232e;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
            </tr>`,
            )
            .join('')}
        </table>
      </td></tr>`,
    )
    .join('');

  const attachments = record.attachments || [];
  const attachmentHtml = attachments.length
    ? `<tr><td style="padding:18px 22px 0 22px;font:400 13px/1.6 Arial,sans-serif;color:#5a6b76;">
         <strong style="color:#12232e;">Attachments (${attachments.length}):</strong><br>
         ${attachments.map((a) => `&bull; ${escapeHtml(a.originalName)} (${Math.max(1, Math.round(a.size / 1024))} KB)`).join('<br>')}
       </td></tr>`
    : '';

  const messageHtml = record.message
    ? `<tr><td style="padding:18px 22px 0 22px;">
         <div style="background:#fff8e6;border-left:4px solid #e8b53f;padding:12px 14px;font:400 13px/1.6 Arial,sans-serif;color:#12232e;">
           <strong>Message from ${escapeHtml(record.details?.salesName || 'sales')}:</strong><br>${escapeHtml(record.message).replace(/\n/g, '<br>')}
         </div>
       </td></tr>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef2f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5;padding:18px 0;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(15,92,140,.12);">
  <tr><td style="background:${BRAND};padding:20px 22px;">
    <div style="font:700 19px/1.3 Arial,sans-serif;color:#ffffff;">${escapeHtml(COMPANY.name)}</div>
    <div style="font:400 13px/1.5 Arial,sans-serif;color:#bfe0f0;">New sales opportunity registered from site</div>
  </td></tr>
  <tr><td style="padding:16px 22px;background:#f5f8fa;border-bottom:1px solid #e2e9ee;">
    <table role="presentation" width="100%"><tr>
      <td style="font:400 12px/1.6 Arial,sans-serif;color:#5a6b76;">
        Reference<br><span style="font:700 16px/1.4 Arial,sans-serif;color:${BRAND};">${escapeHtml(record.reference)}</span>
      </td>
      <td style="font:400 12px/1.6 Arial,sans-serif;color:#5a6b76;">
        Priority<br><span style="font:700 14px/1.4 Arial,sans-serif;color:${priorityColour};">${escapeHtml(priority || 'Not set')}</span>
      </td>
      <td style="font:400 12px/1.6 Arial,sans-serif;color:#5a6b76;">
        Offer deadline<br><span style="font:700 14px/1.4 Arial,sans-serif;color:#12232e;">${escapeHtml(deadline)}</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:16px 22px 0 22px;">
    ${products
      .map(
        (name) =>
          `<span style="display:inline-block;background:${ACCENT};color:#ffffff;font:600 12px/1 Arial,sans-serif;padding:7px 11px;border-radius:14px;margin:0 6px 6px 0;">${escapeHtml(name)}</span>`,
      )
      .join('')}
  </td></tr>
  ${blockHtml}
  ${messageHtml}
  ${attachmentHtml}
  <tr><td style="padding:22px;font:400 11px/1.6 Arial,sans-serif;color:#8b9aa5;border-top:1px solid #e2e9ee;margin-top:10px;">
    Registered on ${escapeHtml(new Date(record.createdAt).toUTCString())} by ${escapeHtml(record.details?.salesName || 'sales team')}
    ${record.details?.salesPhone ? ` &bull; ${escapeHtml(record.details.salesPhone)}` : ''}<br>
    Generated automatically by the ${escapeHtml(COMPANY.name)} sales application.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = { subjectFor, buildHtml, buildText, buildBlocks, displayValue };
