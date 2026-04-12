const fs = require('fs');
const path = require('path');

const BASE_CSS = fs.readFileSync(path.join(__dirname, 'base.css'), 'utf8');

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidHex(c) {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

function buildAccentOverride(options) {
  if (!options || !isValidHex(options.accent)) return '';
  return `:root { --gold: ${options.accent}; --gold-dark: ${options.accent}; }`;
}

function wrap(bodyHtml, options = {}) {
  const override = buildAccentOverride(options);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>${BASE_CSS}${override}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function renderHook(slide, options) {
  const titleClass = slide.title && slide.title.length > 24 ? 'title medium' : 'title';
  return wrap(`
    <div class="slide light">
      ${slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : ''}
      <h1 class="${titleClass}">${escape(slide.title)}</h1>
      <div class="divider"></div>
      ${slide.subtitle ? `<p class="subtitle">${escape(slide.subtitle)}</p>` : ''}
      <div class="spacer"></div>
      <div class="brand-mark">DR. PAULO GUIMARÃES JR.</div>
    </div>
  `, options);
}

function renderData(slide, options) {
  return wrap(`
    <div class="slide dark">
      ${slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : ''}
      <div style="font-weight:900;font-size:200px;line-height:0.9;letter-spacing:-0.04em;color:#FFFFFF;margin-top:40px;">
        ${escape(slide.title)}
      </div>
      ${slide.subtitle ? `<p class="subtitle" style="margin-top:24px;font-size:30px;">${escape(slide.subtitle)}</p>` : ''}
      <div class="divider"></div>
      ${slide.body ? `<p class="body-text" style="color:#E8E8E8;">${escape(slide.body)}</p>` : ''}
      <div class="spacer"></div>
      ${slide.reference ? `<p class="reference">📖 ${escape(slide.reference)}</p>` : ''}
      <div class="brand-mark">DR. PAULO GUIMARÃES JR.</div>
    </div>
  `, options);
}

function renderBody(slide, options) {
  const isDark = slide.background === 'dark';
  return wrap(`
    <div class="slide ${isDark ? 'dark' : 'light'}">
      ${slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : ''}
      <h2 class="title small">${escape(slide.title)}</h2>
      <div class="divider"></div>
      ${slide.body ? `<p class="body-text">${escape(slide.body)}</p>` : ''}
      <div class="spacer"></div>
      ${slide.reference ? `<p class="reference">📖 ${escape(slide.reference)}</p>` : ''}
      <div class="brand-mark">DR. PAULO GUIMARÃES JR.</div>
    </div>
  `, options);
}

function renderComparison(slide, options) {
  const cols = slide.columns || { left: { heading: '', points: [] }, right: { heading: '', points: [] } };
  const renderPoints = (points = []) =>
    points.map(p => `<li style="font-size:22px;line-height:1.5;margin-bottom:18px;font-weight:500;list-style:none;padding-left:24px;position:relative;">
      <span style="position:absolute;left:0;color:var(--gold);font-weight:900;">›</span>${escape(p)}
    </li>`).join('');

  return wrap(`
    <div class="slide light">
      ${slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : ''}
      <h2 class="title small">${escape(slide.title)}</h2>
      <div class="divider"></div>
      <div style="display:flex;gap:40px;flex:1;margin-top:32px;">
        <div style="flex:1;">
          <div class="eyebrow" style="font-size:14px;margin-bottom:20px;">${escape(cols.left?.heading || '')}</div>
          <ul style="padding:0;margin:0;">${renderPoints(cols.left?.points)}</ul>
        </div>
        <div style="width:3px;background:var(--gold);border-radius:2px;"></div>
        <div style="flex:1;">
          <div class="eyebrow" style="font-size:14px;margin-bottom:20px;">${escape(cols.right?.heading || '')}</div>
          <ul style="padding:0;margin:0;">${renderPoints(cols.right?.points)}</ul>
        </div>
      </div>
      <div class="brand-mark">DR. PAULO GUIMARÃES JR.</div>
    </div>
  `, options);
}

function renderCta(slide, options) {
  return wrap(`
    <div class="slide dark">
      ${slide.eyebrow ? `<div class="eyebrow">${escape(slide.eyebrow)}</div>` : ''}
      <h2 class="title medium" style="margin-top:20px;">${escape(slide.title)}</h2>
      <div class="divider"></div>
      <div style="display:flex;flex-direction:column;gap:32px;margin-top:40px;flex:1;">
        ${slide.cta_medico ? `
          <div>
            <div class="eyebrow" style="font-size:14px;margin-bottom:12px;">MÉDICO</div>
            <p class="body-text" style="color:#E8E8E8;font-size:22px;">${escape(slide.cta_medico)}</p>
          </div>
        ` : ''}
        ${slide.cta_paciente ? `
          <div style="border-top:2px solid var(--gold);padding-top:24px;">
            <div class="eyebrow" style="font-size:14px;margin-bottom:12px;">PACIENTE</div>
            <p class="body-text" style="color:#E8E8E8;font-size:22px;">${escape(slide.cta_paciente)}</p>
          </div>
        ` : ''}
      </div>
      <div style="border-top:1px solid #333;padding-top:24px;margin-top:auto;">
        <div class="signature">
          ${escape(slide.signature || 'Dr. Paulo Guimarães Jr.')}
        </div>
      </div>
    </div>
  `, options);
}

function renderSlideHtml(slide, options = {}) {
  switch (slide.type) {
    case 'hook':       return renderHook(slide, options);
    case 'data':       return renderData(slide, options);
    case 'comparison': return renderComparison(slide, options);
    case 'cta':        return renderCta(slide, options);
    case 'body':
    default:           return renderBody(slide, options);
  }
}

module.exports = { renderSlideHtml };
