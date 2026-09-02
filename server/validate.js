const { OPPORTUNITY_SECTIONS, SUBMISSION_SECTION, PRODUCTS, getProduct } = require('./catalog');

const MAX_TEXT = 5000;

function asString(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(', ');
  return String(value).trim().slice(0, MAX_TEXT);
}

function asList(value) {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  const single = asString(value);
  return single ? [single] : [];
}

function isBlank(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Coerce one raw value according to its catalogue field definition. */
function coerce(field, raw) {
  switch (field.type) {
    case 'multiselect':
      return asList(raw);
    case 'checkbox':
      return raw === true || raw === 'true' || raw === 'on' || raw === '1';
    case 'number': {
      const text = asString(raw);
      if (text === '') return '';
      const num = Number(text.replace(/[, ]/g, ''));
      return Number.isFinite(num) ? num : text;
    }
    default:
      return asString(raw);
  }
}

function validateField(field, value, errors, prefix = '') {
  const key = prefix ? `${prefix}.${field.name}` : field.name;
  if (field.required && isBlank(value) && value !== false) {
    errors.push({ field: key, message: `${field.label} is required` });
    return;
  }
  if (isBlank(value)) return;
  if (field.type === 'number' && typeof value !== 'number') {
    errors.push({ field: key, message: `${field.label} must be a number` });
  }
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push({ field: key, message: `${field.label} must be a valid e-mail address` });
  }
  if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push({ field: key, message: `${field.label} must be a valid date` });
  }
}

/**
 * Validate an incoming submission against the catalogue.
 * Returns { valid, errors, data } where data only contains known fields.
 */
function validateSubmission(payload = {}) {
  const errors = [];
  const details = {};
  const rawDetails = payload.details && typeof payload.details === 'object' ? payload.details : {};

  for (const section of [...OPPORTUNITY_SECTIONS, SUBMISSION_SECTION]) {
    for (const field of section.fields) {
      const value = coerce(field, rawDetails[field.name]);
      validateField(field, value, errors);
      if (!isBlank(value) || value === false) details[field.name] = value;
    }
  }

  const selected = asList(payload.products).filter((id) => PRODUCTS.some((p) => p.id === id));
  if (selected.length === 0) {
    errors.push({ field: 'products', message: 'Select at least one product' });
  }

  const productData = {};
  const rawProducts = payload.productDetails && typeof payload.productDetails === 'object' ? payload.productDetails : {};
  for (const id of selected) {
    const product = getProduct(id);
    const raw = rawProducts[id] && typeof rawProducts[id] === 'object' ? rawProducts[id] : {};
    const values = {};
    for (const field of product.fields) {
      const value = coerce(field, raw[field.name]);
      validateField(field, value, errors, id);
      if (!isBlank(value) || value === false) values[field.name] = value;
    }
    productData[id] = values;
  }

  const recipients = asList(payload.recipients);
  const ccRecipients = asList(payload.cc);
  for (const address of [...recipients, ...ccRecipients]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      errors.push({ field: 'recipients', message: `"${address}" is not a valid e-mail address` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      details,
      products: selected,
      productDetails: productData,
      recipients,
      cc: ccRecipients,
      message: asString(payload.message),
      clientRef: asString(payload.clientRef),
      clientId: asString(payload.clientId).slice(0, 64),
    },
  };
}

module.exports = { validateSubmission, coerce, asString, asList };
