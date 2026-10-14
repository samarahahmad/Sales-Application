/* Water Secret Contracting - sales opportunity registration.
   Vanilla JS so the app installs on any phone with no build step. */

(() => {
  'use strict';

  const API = {
    catalog: 'api/catalog',
    opportunities: 'api/opportunities',
  };
  const DRAFT_KEY = 'wsc.draft.v1';
  const REP_KEY = 'wsc.rep.v1';
  const CODE_KEY = 'wsc.code.v1';

  /* ------------------------------------------------------------------ state */

  let catalog = null;
  let state = emptyState();
  let stepIndex = 0;
  let screen = 'wizard'; // wizard | result | list
  let lastResult = null;
  let submitting = false;

  function emptyState() {
    return { clientId: null, details: {}, products: [], productDetails: {}, recipients: [], cc: [], message: '', files: [] };
  }

  const el = {
    main: document.getElementById('main'),
    title: document.getElementById('screenTitle'),
    back: document.getElementById('backBtn'),
    list: document.getElementById('listBtn'),
    navBar: document.getElementById('navBar'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    progress: document.getElementById('progress'),
    progressFill: document.getElementById('progressFill'),
    progressLabel: document.getElementById('progressLabel'),
    offline: document.getElementById('offlineBanner'),
    toast: document.getElementById('toast'),
    sheet: document.getElementById('sheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
  };

  const STEPS = [
    { id: 'client', kind: 'section', section: 'client', title: 'Client details', hint: 'Who are you meeting today?' },
    { id: 'project', kind: 'section', section: 'project', title: 'Project details', hint: 'What is the job and when do they need our offer?' },
    { id: 'opportunity', kind: 'section', section: 'opportunity', title: 'Opportunity overview', hint: 'High level information for the engineering team.' },
    { id: 'products', kind: 'products', title: 'Our products', hint: 'Select everything the client needs.' },
    { id: 'technical', kind: 'technical', title: 'Technical information', hint: 'High level details given by the client.' },
    { id: 'attachments', kind: 'attachments', title: 'Attachments', hint: 'Drawings, tender documents, site photos, water analysis.' },
    { id: 'send', kind: 'send', title: 'Review & send', hint: 'Check the summary and send it to the engineer.' },
  ];

  /* ------------------------------------------------------------- small utils */

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function toast(message, ms = 2600) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.toast.hidden = true; }, ms);
  }

  function openSheet(title, body) {
    el.sheetTitle.textContent = title;
    el.sheetBody.replaceChildren(body);
    el.sheet.hidden = false;
  }
  function closeSheet() { el.sheet.hidden = true; }
  el.sheet.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeSheet(); });

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }

  function displayValue(field, value) {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (field && field.type === 'date') return formatDate(value);
    if (field && field.type === 'number' && value !== '') return Number(value).toLocaleString('en-US');
    return value === undefined || value === null ? '' : String(value);
  }

  function isBlank(value) {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  const ICONS = {
    stp: 'M4 20h16V9l-8-5-8 5v11zM9 20v-5h6v5',
    greywater: 'M12 3s6 6.4 6 10a6 6 0 11-12 0c0-3.6 6-10 6-10z',
    ro: 'M4 6h16v12H4zM9 6v12M15 6v12',
    stormwater: 'M6 14a4 4 0 011-7.9A5 5 0 0117 7a3.5 3.5 0 01.5 7M8 18l-1 3M12 18l-1 3M16 18l-1 3',
    landscape: 'M12 21V10M12 10l4-4-4-1-4 1 4 4zM5 21h14',
    vacuum: 'M4 8h10a4 4 0 014 4v8M4 8V5m0 3v3M18 20h2M8 12h2',
    building: 'M4 21h16M6 21V5l6-2 6 2v16M10 9h1M14 9h1M10 13h1M14 13h1',
    project: 'M4 7h16v13H4zM4 7l2-3h12l2 3M9 12h6',
    chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
    check: 'M5 12l5 5 9-10',
  };
  function icon(name, size = 22) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICONS[name] || ICONS.project);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  /* --------------------------------------------------------- field rendering */

  /** Build one input bound to `target[field.name]`. */
  function renderField(field, target, keyPrefix = '') {
    const id = `f-${keyPrefix}${field.name}`;
    const wrap = h('div', { class: 'field', 'data-field': keyPrefix + field.name });
    const error = h('div', { class: 'field__error' }, `${field.label} is required`);

    const setValue = (value) => {
      if (isBlank(value) && value !== false) delete target[field.name];
      else target[field.name] = value;
      wrap.classList.remove('is-invalid');
      saveDraft();
    };

    if (field.type === 'checkbox') {
      const box = h('button', {
        type: 'button', class: 'switch__box', role: 'switch', id,
        'aria-checked': target[field.name] === true ? 'true' : 'false',
        onclick: () => {
          const next = box.getAttribute('aria-checked') !== 'true';
          box.setAttribute('aria-checked', String(next));
          setValue(next);
        },
      });
      wrap.append(h('div', { class: 'switch' }, h('label', { class: 'switch__label', for: id }, field.label), box));
      if (field.hint) wrap.append(h('div', { class: 'field__hint' }, field.hint));
      wrap.append(error);
      return wrap;
    }

    wrap.append(h('label', { class: 'field__label', for: id }, field.label, field.required ? h('span', { class: 'field__req' }, ' *') : null));

    if (field.type === 'multiselect') {
      const selected = new Set(target[field.name] || []);
      const chips = h('div', { class: 'chips', id });
      for (const option of field.options) {
        const chip = h('button', {
          type: 'button', class: 'chip', 'aria-pressed': selected.has(option) ? 'true' : 'false',
          onclick: () => {
            if (selected.has(option)) selected.delete(option); else selected.add(option);
            chip.setAttribute('aria-pressed', String(selected.has(option)));
            setValue([...selected]);
          },
        }, option);
        chips.append(chip);
      }
      wrap.append(chips);
    } else if (field.type === 'select') {
      const select = h('select', { id, onchange: (e) => setValue(e.target.value) },
        h('option', { value: '' }, 'Select...'),
        field.options.map((option) => h('option', { value: option, selected: (target[field.name] ?? field.default) === option }, option)));
      if (target[field.name] === undefined && field.default) target[field.name] = field.default;
      wrap.append(select);
    } else if (field.type === 'textarea') {
      wrap.append(h('textarea', {
        id, rows: field.rows || 3, placeholder: field.placeholder || '',
        oninput: (e) => setValue(e.target.value),
      }, target[field.name] || ''));
    } else {
      const input = h('input', {
        id,
        type: field.type === 'number' ? 'number' : field.type,
        inputmode: field.type === 'number' ? 'decimal' : undefined,
        placeholder: field.placeholder || '',
        value: target[field.name] ?? '',
        autocomplete: field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'off',
        oninput: (e) => setValue(field.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value),
      });
      wrap.append(input);
    }

    if (field.hint) wrap.append(h('div', { class: 'field__hint' }, field.hint));
    wrap.append(error);
    return wrap;
  }

  function renderFields(fields, target, prefix = '') {
    return fields.map((field) => renderField(field, target, prefix));
  }

  /* ----------------------------------------------------------------- screens */

  function render() {
    if (screen === 'result') return renderResult();
    if (screen === 'list') return renderList();
    renderStep();
  }

  function renderStep() {
    const step = STEPS[stepIndex];
    el.title.textContent = step.title;
    el.progress.hidden = false;
    el.navBar.hidden = false;
    el.back.hidden = stepIndex === 0;
    el.prev.disabled = stepIndex === 0;
    el.next.textContent = step.kind === 'send' ? 'Send to engineer' : 'Next';
    el.next.className = step.kind === 'send' ? 'btn btn--send' : 'btn btn--primary';
    el.progressFill.style.width = `${((stepIndex + 1) / STEPS.length) * 100}%`;
    el.progressLabel.textContent = `Step ${stepIndex + 1} of ${STEPS.length} - ${step.title}`;

    const body = h('div', {},
      h('h1', { class: 'step-title' }, step.title),
      h('p', { class: 'step-hint' }, step.hint));

    if (step.kind === 'section') {
      const section = catalog.sections.find((s) => s.id === step.section);
      body.append(h('div', { class: 'card' },
        h('div', { class: 'card__title' }, icon(section.icon || 'project', 18), section.title),
        renderFields(section.fields, state.details)));
    } else if (step.kind === 'products') {
      body.append(renderProducts());
    } else if (step.kind === 'technical') {
      body.append(renderTechnical());
    } else if (step.kind === 'attachments') {
      body.append(renderAttachments());
    } else if (step.kind === 'send') {
      body.append(renderSend());
    }

    el.main.replaceChildren(body);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function renderProducts() {
    const list = h('div', { class: 'product-list' });
    for (const product of catalog.products) {
      const selected = state.products.includes(product.id);
      const card = h('button', {
        type: 'button', class: 'product', 'aria-pressed': String(selected),
        onclick: () => {
          const index = state.products.indexOf(product.id);
          if (index >= 0) state.products.splice(index, 1);
          else state.products.push(product.id);
          card.setAttribute('aria-pressed', String(state.products.includes(product.id)));
          saveDraft();
        },
      },
        h('span', { class: 'product__icon' }, icon(product.icon, 24)),
        h('span', { class: 'product__body' },
          h('span', { class: 'product__name' }, product.name),
          h('span', { class: 'product__desc' }, product.description)),
        h('span', { class: 'product__check' }, icon('check', 14)));
      list.append(card);
    }
    return list;
  }

  function renderTechnical() {
    if (state.products.length === 0) {
      return h('div', { class: 'empty' }, 'No product selected yet. Go back one step and choose what the client needs.');
    }
    const wrap = h('div', {});
    for (const id of state.products) {
      const product = catalog.products.find((p) => p.id === id);
      state.productDetails[id] = state.productDetails[id] || {};
      wrap.append(h('div', { class: 'card' },
        h('div', { class: 'card__title' }, icon(product.icon, 18), product.name),
        renderFields(product.fields, state.productDetails[id], `${id}.`)));
    }
    return wrap;
  }

  function renderAttachments() {
    const wrap = h('div', { class: 'card' });
    const input = h('input', {
      type: 'file', multiple: true, id: 'fileInput', style: 'display:none',
      accept: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip',
      onchange: (e) => { addFiles(e.target.files); e.target.value = ''; },
    });
    const camera = h('input', {
      type: 'file', accept: 'image/*', capture: 'environment', id: 'cameraInput', style: 'display:none',
      onchange: (e) => { addFiles(e.target.files); e.target.value = ''; },
    });

    const listEl = h('ul', { class: 'file-list' });
    const refreshList = () => {
      listEl.replaceChildren(...state.files.map((file, index) => {
        const item = h('li', { class: 'file-item' });
        if (file.type && file.type.startsWith('image/')) {
          const img = h('img', { class: 'file-item__thumb', alt: '' });
          img.src = URL.createObjectURL(file);
          img.onload = () => URL.revokeObjectURL(img.src);
          item.append(img);
        }
        item.append(
          h('span', { class: 'file-item__name' }, file.name),
          h('span', { class: 'file-item__size' }, formatBytes(file.size)),
          h('button', { class: 'file-item__remove', type: 'button', 'aria-label': `Remove ${file.name}`, onclick: () => { state.files.splice(index, 1); refreshList(); } }, '×'));
        return item;
      }));
    };

    const addFiles = (fileList) => {
      const limit = catalog.limits.maxUploadMb * 1024 * 1024;
      for (const file of fileList) {
        if (state.files.length >= catalog.limits.maxFiles) { toast(`Maximum ${catalog.limits.maxFiles} attachments`); break; }
        if (file.size > limit) { toast(`${file.name} is larger than ${catalog.limits.maxUploadMb} MB`); continue; }
        state.files.push(file);
      }
      refreshList();
    };

    const zone = h('div', { class: 'dropzone' },
      h('p', { style: 'margin:0 0 12px' }, 'Photos of the site, drawings, tender documents or the client water analysis.'),
      h('button', { class: 'btn btn--outline btn--block', type: 'button', onclick: () => camera.click() }, 'Take a photo'),
      h('button', { class: 'btn btn--outline btn--block', type: 'button', onclick: () => input.click() }, 'Choose files'));

    wrap.append(input, camera, zone, listEl,
      h('div', { class: 'field__hint', style: 'margin-top:10px' }, `Up to ${catalog.limits.maxFiles} files, ${catalog.limits.maxUploadMb} MB each. Attachments are e-mailed with the opportunity.`));
    refreshList();
    return wrap;
  }

  function renderSend() {
    const wrap = h('div', {});

    // Sales rep block
    wrap.append(h('div', { class: 'card' },
      h('div', { class: 'card__title' }, icon('chart', 18), catalog.submission.title),
      renderFields(catalog.submission.fields, state.details)));

    // Recipients
    const recipientCard = h('div', { class: 'card' }, h('div', { class: 'card__title' }, icon('project', 18), 'Send to'));
    if (state.recipients.length === 0) {
      const suggested = catalog.recipients
        .filter((r) => r.default || (r.products || []).some((p) => state.products.includes(p)))
        .map((r) => r.email);
      state.recipients = [...new Set(suggested)];
    }
    const chips = h('div', { class: 'chips' });
    for (const person of catalog.recipients) {
      const chip = h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(state.recipients.includes(person.email)),
        onclick: () => {
          const index = state.recipients.indexOf(person.email);
          if (index >= 0) state.recipients.splice(index, 1); else state.recipients.push(person.email);
          chip.setAttribute('aria-pressed', String(state.recipients.includes(person.email)));
          saveDraft();
        },
      }, person.name);
      chips.append(chip);
    }
    recipientCard.append(chips,
      h('div', { class: 'field', style: 'margin-top:14px' },
        h('label', { class: 'field__label', for: 'extraEmail' }, 'Additional e-mail address'),
        h('input', { type: 'email', id: 'extraEmail', placeholder: 'name@watersecret.com.sa', value: state.cc.join(', '), oninput: (e) => { state.cc = e.target.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean); saveDraft(); } })),
      h('div', { class: 'field' },
        h('label', { class: 'field__label', for: 'message' }, 'Message to the engineering team'),
        h('textarea', { id: 'message', rows: 3, placeholder: 'Anything the engineer should know before preparing the offer', oninput: (e) => { state.message = e.target.value; saveDraft(); } }, state.message)));
    wrap.append(recipientCard);

    // Review
    const review = h('div', { class: 'card' }, h('div', { class: 'card__title' }, icon('check', 18), 'Summary'));
    catalog.sections.forEach((section, index) => {
      const rows = section.fields.filter((f) => !isBlank(state.details[f.name]) || state.details[f.name] === false);
      if (!rows.length) return;
      review.append(h('div', { class: 'review-group' },
        h('div', { class: 'review-group__title' }, section.title,
          h('button', { class: 'review-group__edit', type: 'button', onclick: () => goTo(index) }, 'Edit')),
        rows.map((f) => h('div', { class: 'review-row' },
          h('div', { class: 'review-row__label' }, f.label),
          h('div', { class: 'review-row__value' }, displayValue(f, state.details[f.name]))))));
    });
    for (const id of state.products) {
      const product = catalog.products.find((p) => p.id === id);
      const values = state.productDetails[id] || {};
      const rows = product.fields.filter((f) => !isBlank(values[f.name]) || values[f.name] === false);
      review.append(h('div', { class: 'review-group' },
        h('div', { class: 'review-group__title' }, product.name,
          h('button', { class: 'review-group__edit', type: 'button', onclick: () => goTo(4) }, 'Edit')),
        rows.length
          ? rows.map((f) => h('div', { class: 'review-row' },
              h('div', { class: 'review-row__label' }, f.label),
              h('div', { class: 'review-row__value' }, displayValue(f, values[f.name]))))
          : h('div', { class: 'summary-line' }, 'No technical details filled in.')));
    }
    review.append(h('div', { class: 'review-group' },
      h('div', { class: 'review-group__title' }, 'Attachments',
        h('button', { class: 'review-group__edit', type: 'button', onclick: () => goTo(5) }, 'Edit')),
      state.files.length
        ? state.files.map((f) => h('div', { class: 'review-row' },
            h('div', { class: 'review-row__label' }, f.name),
            h('div', { class: 'review-row__value' }, formatBytes(f.size))))
        : h('div', { class: 'summary-line' }, 'No attachments.')));
    wrap.append(review);

    return wrap;
  }

  function renderResult() {
    el.progress.hidden = true;
    el.navBar.hidden = true;
    el.back.hidden = true;
    el.title.textContent = 'Opportunity registered';

    const queued = lastResult.emailStatus === 'queued';
    const failed = lastResult.emailStatus === 'failed' || lastResult.emailStatus === 'not_configured';
    const wrap = h('div', { class: 'result' },
      h('div', { class: `result__icon${queued || failed ? ' result__icon--warn' : ''}` }, icon('check', 40)),
      h('h1', { style: 'margin:0;font-size:20px' }, queued ? 'Saved on your phone' : 'Registered'),
      h('div', { class: 'result__ref' }, lastResult.reference || 'Pending reference'),
      h('p', { class: 'result__note' }, lastResult.message));

    if (lastResult.sentTo && lastResult.sentTo.length) {
      const prefix = lastResult.emailStatus === 'sent' ? 'Sent to' : 'To be sent to';
      wrap.append(h('p', { class: 'summary-line' }, `${prefix}: ${lastResult.sentTo.join(', ')}`));
    }

    if (failed || queued) {
      wrap.append(h('button', { class: 'btn btn--send btn--block', type: 'button', onclick: () => sendFromMailApp() }, 'Send from my mail app'));
      if (lastResult.reference) {
        wrap.append(h('button', { class: 'btn btn--outline btn--block', type: 'button', onclick: (e) => retrySend(e.target) }, 'Try sending again'));
      }
    }
    if (canShare()) {
      wrap.append(h('button', { class: 'btn btn--outline btn--block', type: 'button', onclick: () => shareSummary() }, 'Share (WhatsApp, Teams...)'));
    }
    wrap.append(
      h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => startNew() }, 'Register another opportunity'),
      h('button', { class: 'btn btn--link btn--block', type: 'button', onclick: () => showList() }, 'View my registrations'));

    el.main.replaceChildren(wrap);
    window.scrollTo(0, 0);
  }

  async function renderList() {
    el.progress.hidden = true;
    el.navBar.hidden = true;
    el.back.hidden = false;
    el.title.textContent = 'Registrations';
    el.main.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spinner spinner--brand' })));

    try {
      const response = await apiFetch(API.opportunities);
      const { opportunities } = await response.json();
      const pending = await outbox.all();
      const wrap = h('div', {});

      if (pending.length) {
        wrap.append(h('div', { class: 'card' },
          h('div', { class: 'card__title' }, 'Waiting to be sent'),
          pending.map((item) => h('div', { class: 'record' },
            h('div', { class: 'record__project' }, item.payload.details.projectName || 'Untitled project'),
            h('div', { class: 'record__client' }, item.payload.details.clientCompany || ''),
            h('span', { class: 'tag tag--pending' }, 'Queued on this phone'))),
          h('button', { class: 'btn btn--outline btn--block', type: 'button', onclick: () => flushOutbox(true) }, 'Send now')));
      }

      if (!opportunities.length && !pending.length) {
        wrap.append(h('div', { class: 'empty' }, 'No opportunities registered yet.'));
      }

      for (const record of opportunities) {
        const statusClass = record.emailStatus === 'sent' ? 'tag--sent' : record.emailStatus === 'failed' ? 'tag--failed' : 'tag--pending';
        wrap.append(h('div', { class: 'record' },
          h('div', { class: 'record__top' },
            h('span', { class: 'record__ref' }, record.reference),
            h('span', {}, formatDate((record.createdAt || '').slice(0, 10)))),
          h('div', { class: 'record__project' }, record.projectName || 'Untitled project'),
          h('div', { class: 'record__client' }, `${record.clientCompany} · ${record.salesName}`),
          h('div', {},
            record.products.map((id) => h('span', { class: 'tag' }, (catalog.products.find((p) => p.id === id) || {}).short || id)),
            h('span', { class: `tag ${statusClass}` }, record.emailStatus === 'sent' ? 'E-mailed' : record.emailStatus === 'failed' ? 'E-mail failed' : 'Not e-mailed'),
            record.attachments ? h('span', { class: 'tag' }, `${record.attachments} file(s)`) : null)));
      }
      el.main.replaceChildren(wrap);
    } catch (error) {
      el.main.replaceChildren(h('div', { class: 'empty' }, 'Cannot load the registrations while you are offline.'));
    }
  }

  /* -------------------------------------------------------------- navigation */

  function goTo(index) {
    stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    screen = 'wizard';
    render();
  }

  function validateStep() {
    const step = STEPS[stepIndex];
    let firstInvalid = null;

    const check = (fields, target, prefix = '') => {
      for (const field of fields) {
        if (!field.required) continue;
        const value = target[field.name];
        if (isBlank(value) && value !== false) {
          const node = el.main.querySelector(`[data-field="${prefix}${field.name}"]`);
          if (node) { node.classList.add('is-invalid'); firstInvalid = firstInvalid || node; }
        }
      }
    };

    if (step.kind === 'section') {
      check(catalog.sections.find((s) => s.id === step.section).fields, state.details);
    } else if (step.kind === 'products') {
      if (state.products.length === 0) { toast('Select at least one product'); return false; }
    } else if (step.kind === 'technical') {
      for (const id of state.products) {
        const product = catalog.products.find((p) => p.id === id);
        check(product.fields, state.productDetails[id] || {}, `${id}.`);
      }
    } else if (step.kind === 'send') {
      check(catalog.submission.fields, state.details);
      if (state.recipients.length === 0) { toast('Select who should receive this opportunity'); return false; }
    }

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Please fill in the highlighted fields');
      return false;
    }
    return true;
  }

  el.next.addEventListener('click', () => {
    if (!validateStep()) return;
    if (STEPS[stepIndex].kind === 'send') submit();
    else goTo(stepIndex + 1);
  });
  el.prev.addEventListener('click', () => goTo(stepIndex - 1));
  el.back.addEventListener('click', () => {
    if (screen !== 'wizard') { screen = 'wizard'; render(); }
    else goTo(stepIndex - 1);
  });
  el.list.addEventListener('click', () => showList());

  function showList() { screen = 'list'; render(); }

  function startNew() {
    const rep = {};
    for (const field of catalog.submission.fields) {
      if (field.remember && state.details[field.name]) rep[field.name] = state.details[field.name];
    }
    localStorage.setItem(REP_KEY, JSON.stringify(rep));
    state = emptyState();
    Object.assign(state.details, rep);
    localStorage.removeItem(DRAFT_KEY);
    lastResult = null;
    stepIndex = 0;
    screen = 'wizard';
    render();
  }

  /* ------------------------------------------------------------ draft saving */

  function saveDraft() {
    clearTimeout(saveDraft._t);
    saveDraft._t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          details: state.details, products: state.products, productDetails: state.productDetails,
          recipients: state.recipients, cc: state.cc, message: state.message, savedAt: Date.now(),
        }));
      } catch { /* storage full or private mode - the form still works */ }
    }, 250);
  }

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
  }

  /* --------------------------------------------------- offline outbox (IDB) */

  const outbox = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('wsc-sales', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
        request.onsuccess = () => { this.db = request.result; resolve(this.db); };
        request.onerror = () => reject(request.error);
      });
    },
    async tx(mode, run) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('outbox', mode);
        const result = run(transaction.objectStore('outbox'));
        transaction.oncomplete = () => resolve(result.result !== undefined ? result.result : result);
        transaction.onerror = () => reject(transaction.error);
      });
    },
    add(item) { return this.tx('readwrite', (store) => store.add(item)); },
    remove(id) { return this.tx('readwrite', (store) => store.delete(id)); },
    all() { return this.tx('readonly', (store) => store.getAll()).catch(() => []); },
  };

  /* ------------------------------------------------------------- submission */

  function newClientId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function buildPayload() {
    return {
      clientId: state.clientId || (state.clientId = newClientId()),
      details: state.details,
      products: state.products,
      productDetails: state.productDetails,
      recipients: state.recipients,
      cc: state.cc,
      message: state.message,
    };
  }

  function apiFetch(url, options = {}) {
    const code = localStorage.getItem(CODE_KEY);
    const headers = { ...(options.headers || {}) };
    if (code) headers['x-access-code'] = code;
    return fetch(url, { ...options, headers });
  }

  async function submit() {
    if (submitting) return;
    submitting = true;
    el.next.disabled = true;
    el.next.replaceChildren(h('span', { class: 'spinner' }), document.createTextNode(' Sending...'));

    const payload = buildPayload();
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    for (const file of state.files) form.append('attachments', file, file.name);

    try {
      const response = await apiFetch(API.opportunities, { method: 'POST', body: form });

      if (response.status === 401) {
        submitting = false;
        el.next.disabled = false;
        el.next.textContent = 'Send to engineer';
        return askAccessCode(() => submit());
      }

      const result = await response.json();
      if (!response.ok && response.status !== 207) {
        toast(result.error || 'Could not register the opportunity');
        if (result.errors) markServerErrors(result.errors);
        return;
      }

      lastResult = result;
      localStorage.removeItem(DRAFT_KEY);
      screen = 'result';
      render();
    } catch (error) {
      // No signal on site: keep everything, including the photos, and retry later.
      await outbox.add({ payload, files: state.files, createdAt: new Date().toISOString() });
      lastResult = {
        reference: '',
        emailStatus: 'queued',
        message: 'No internet connection. The opportunity is saved on your phone and will be sent automatically as soon as you have signal.',
      };
      localStorage.removeItem(DRAFT_KEY);
      screen = 'result';
      render();
    } finally {
      submitting = false;
      el.next.disabled = false;
      el.next.textContent = 'Send to engineer';
    }
  }

  function markServerErrors(errors) {
    let first = null;
    for (const item of errors) {
      const node = el.main.querySelector(`[data-field="${item.field}"]`);
      if (node) { node.classList.add('is-invalid'); first = first || node; }
    }
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function retrySend(button) {
    button.disabled = true;
    try {
      const response = await apiFetch(`${API.opportunities}/${lastResult.reference}/resend`, { method: 'POST' });
      const result = await response.json();
      if (result.emailStatus === 'sent') {
        lastResult.emailStatus = 'sent';
        lastResult.message = 'Opportunity e-mailed to the engineering team.';
        render();
        toast('E-mail sent');
      } else {
        toast(result.error || 'Still could not send the e-mail');
      }
    } catch {
      toast('No connection');
    } finally {
      button.disabled = false;
    }
  }

  /** Flush anything that was registered while the phone had no signal.
   *  Guarded: the boot flush and the "online" event can fire together. */
  let flushing = false;
  async function flushOutbox(manual = false) {
    if (flushing) { if (manual) toast('Sending...'); return; }
    flushing = true;
    try {
      await flushOutboxOnce(manual);
    } finally {
      flushing = false;
    }
  }

  async function flushOutboxOnce(manual) {
    let items = [];
    try { items = await outbox.all(); } catch { return; }
    if (!items.length) { if (manual) toast('Nothing waiting to be sent'); return; }
    let sent = 0;
    for (const item of items) {
      const form = new FormData();
      form.append('payload', JSON.stringify(item.payload));
      for (const file of item.files || []) form.append('attachments', file, file.name);
      try {
        const response = await apiFetch(API.opportunities, { method: 'POST', body: form });
        if (response.ok || response.status === 207) { await outbox.remove(item.id); sent += 1; }
      } catch { break; }
    }
    if (sent) {
      toast(`${sent} saved opportunit${sent === 1 ? 'y' : 'ies'} sent to the office`);
      if (screen === 'list') render();
    } else if (manual) {
      toast('Still no connection');
    }
  }

  /* ------------------------------------------- fallbacks: mail app & sharing */

  function summaryText(payload = buildPayload()) {
    const lines = [];
    lines.push(`${catalog.company.name} - new sales opportunity`);
    if (lastResult && lastResult.reference) lines.push(`Reference: ${lastResult.reference}`);
    lines.push('');
    lines.push(`Products: ${payload.products.map((id) => (catalog.products.find((p) => p.id === id) || {}).name || id).join(', ')}`);
    lines.push('');
    for (const section of [...catalog.sections, catalog.submission]) {
      const rows = section.fields.filter((f) => !isBlank(payload.details[f.name]) || payload.details[f.name] === false);
      if (!rows.length) continue;
      lines.push(`== ${section.title} ==`);
      for (const field of rows) lines.push(`  ${field.label}: ${displayValue(field, payload.details[field.name])}`);
      lines.push('');
    }
    for (const id of payload.products) {
      const product = catalog.products.find((p) => p.id === id);
      const values = payload.productDetails[id] || {};
      lines.push(`== ${product.name} ==`);
      for (const field of product.fields) {
        if (isBlank(values[field.name]) && values[field.name] !== false) continue;
        lines.push(`  ${field.label}: ${displayValue(field, values[field.name])}`);
      }
      lines.push('');
    }
    if (payload.message) { lines.push('== Message =='); lines.push(`  ${payload.message}`); lines.push(''); }
    if (state.files.length) lines.push(`Attachments to follow: ${state.files.map((f) => f.name).join(', ')}`);
    return lines.join('\n');
  }

  function mailSubject() {
    const products = state.products.map((id) => (catalog.products.find((p) => p.id === id) || {}).short || id).join(' + ');
    const reference = lastResult && lastResult.reference ? `[${lastResult.reference}] ` : '';
    return `${reference}${products} - ${state.details.projectName || 'New opportunity'} (${state.details.clientCompany || ''})`;
  }

  function sendFromMailApp() {
    const to = (lastResult.sentTo || state.recipients).join(',');
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(mailSubject())}&body=${encodeURIComponent(summaryText())}`;
    window.location.href = url;
  }

  function canShare() {
    return typeof navigator.share === 'function';
  }

  async function shareSummary() {
    const data = { title: mailSubject(), text: summaryText() };
    try {
      if (state.files.length && navigator.canShare && navigator.canShare({ files: state.files })) data.files = state.files;
      await navigator.share(data);
    } catch { /* the user cancelled the share sheet */ }
  }

  /* ------------------------------------------------------------ access code */

  function askAccessCode(then) {
    const input = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'Team access code', id: 'accessCode' });
    const body = h('div', {},
      h('p', { class: 'summary-line', style: 'margin-top:0' }, 'Enter the code given by the office to use the app on this phone.'),
      h('div', { class: 'field' }, input),
      h('button', {
        class: 'btn btn--primary btn--block', type: 'button',
        onclick: () => { localStorage.setItem(CODE_KEY, input.value.trim()); closeSheet(); then(); },
      }, 'Continue'));
    openSheet('Access code', body);
    setTimeout(() => input.focus(), 120);
  }

  /* ------------------------------------------------------------------- boot */

  function updateOnlineBanner() {
    el.offline.hidden = navigator.onLine;
  }
  window.addEventListener('online', () => { updateOnlineBanner(); flushOutbox(); });
  window.addEventListener('offline', updateOnlineBanner);

  async function boot() {
    updateOnlineBanner();
    el.main.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spinner spinner--brand' })));
    try {
      const response = await apiFetch(API.catalog);
      catalog = await response.json();
      localStorage.setItem('wsc.catalog.v1', JSON.stringify(catalog));
    } catch {
      try { catalog = JSON.parse(localStorage.getItem('wsc.catalog.v1')); } catch { catalog = null; }
      if (!catalog) {
        el.main.replaceChildren(h('div', { class: 'empty' }, 'Cannot reach the server. Connect once while online to load the form.'));
        return;
      }
      toast('Working offline with the saved form');
    }

    try { Object.assign(state.details, JSON.parse(localStorage.getItem(REP_KEY)) || {}); } catch { /* no saved rep yet */ }

    const draft = loadDraft();
    if (draft && (draft.details?.clientCompany || draft.products?.length)) {
      render();
      openSheet('Continue where you stopped?', h('div', {},
        h('p', { class: 'summary-line', style: 'margin-top:0' },
          `You have an unfinished registration${draft.details?.clientCompany ? ` for ${draft.details.clientCompany}` : ''}.`),
        h('button', {
          class: 'btn btn--primary btn--block', type: 'button',
          onclick: () => {
            state = { ...emptyState(), ...draft, files: [] };
            closeSheet();
            render();
          },
        }, 'Continue'),
        h('button', {
          class: 'btn btn--ghost btn--block', type: 'button', style: 'flex:1',
          onclick: () => { localStorage.removeItem(DRAFT_KEY); closeSheet(); startNew(); },
        }, 'Start a new one')));
    } else {
      render();
    }

    flushOutbox();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline shell is optional */ });
    }
  }

  boot();
})();
