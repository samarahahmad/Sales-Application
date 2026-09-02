const fs = require('fs');
const path = require('path');

/**
 * Tiny file backed store. Every opportunity becomes one JSON file plus a folder
 * of attachments, which keeps the app deployable on any small VM without a
 * database to look after.
 */
class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.recordsDir = path.join(dataDir, 'opportunities');
    this.uploadsDir = path.join(dataDir, 'uploads');
    this.counterFile = path.join(dataDir, 'counter.json');
    this.clientIndexFile = path.join(dataDir, 'client-index.json');
    fs.mkdirSync(this.recordsDir, { recursive: true });
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  /** Sequential, human readable reference: WSC-2026-0007 */
  nextReference(now = new Date()) {
    const year = now.getFullYear();
    let counters = {};
    try {
      counters = JSON.parse(fs.readFileSync(this.counterFile, 'utf8'));
    } catch {
      counters = {};
    }
    const next = (counters[year] || 0) + 1;
    counters[year] = next;
    fs.writeFileSync(this.counterFile, JSON.stringify(counters, null, 2));
    return `WSC-${year}-${String(next).padStart(4, '0')}`;
  }

  attachmentDir(reference) {
    const dir = path.join(this.uploadsDir, reference);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** A phone that retries a queued submission sends the same clientId twice;
   *  this is what stops the engineer receiving the visit report twice. */
  findByClientId(clientId) {
    if (!clientId) return null;
    let index = {};
    try {
      index = JSON.parse(fs.readFileSync(this.clientIndexFile, 'utf8'));
    } catch {
      return null;
    }
    return index[clientId] ? this.get(index[clientId]) : null;
  }

  rememberClientId(clientId, reference) {
    if (!clientId) return;
    let index = {};
    try {
      index = JSON.parse(fs.readFileSync(this.clientIndexFile, 'utf8'));
    } catch {
      index = {};
    }
    index[clientId] = reference;
    fs.writeFileSync(this.clientIndexFile, JSON.stringify(index, null, 2));
  }

  save(record) {
    fs.writeFileSync(path.join(this.recordsDir, `${record.reference}.json`), JSON.stringify(record, null, 2));
    return record;
  }

  get(reference) {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.recordsDir, `${path.basename(reference)}.json`), 'utf8'));
    } catch {
      return null;
    }
  }

  /** Newest first, trimmed down for the list screen. */
  list(limit = 50) {
    let files = [];
    try {
      files = fs.readdirSync(this.recordsDir).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
    return files
      .map((file) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(this.recordsDir, file), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit)
      .map((r) => ({
        reference: r.reference,
        createdAt: r.createdAt,
        clientCompany: r.details?.clientCompany || '',
        projectName: r.details?.projectName || '',
        products: r.products || [],
        priority: r.details?.priority || '',
        salesName: r.details?.salesName || '',
        deadline: r.details?.submissionDeadline || '',
        emailStatus: r.email?.status || 'unknown',
        attachments: (r.attachments || []).length,
      }));
  }

  /** Record the outcome of the e-mail attempt against an existing record. */
  updateEmailStatus(reference, email) {
    const record = this.get(reference);
    if (!record) return null;
    record.email = { ...(record.email || {}), ...email };
    return this.save(record);
  }
}

module.exports = { Store };
