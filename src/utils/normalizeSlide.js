const ALLOWED_TYPES = ['hook', 'data', 'comparison', 'body', 'cta'];

function normalizeSlide(slide, index) {
  if (!slide || typeof slide !== 'object') {
    return {
      index,
      type: 'body',
      title: 'Slide sem conteúdo',
      body: '',
      eyebrow: null,
      subtitle: null,
      label: null,
      reference: null,
    };
  }

  let type = slide.type;
  if (!ALLOWED_TYPES.includes(type)) {
    console.warn(`[normalize] unknown slide type "${type}" at index ${index}, falling back to "body"`);
    type = 'body';
  }

  const normalized = {
    index: slide.index ?? index,
    type,
    eyebrow: slide.eyebrow ?? null,
    title: slide.title ?? '',
    subtitle: slide.subtitle ?? null,
    body: slide.body ?? null,
    label: slide.label ?? null,
    reference: slide.reference ?? null,
  };

  if (type === 'comparison') {
    const cols = slide.columns || { left: { heading: '', points: [] }, right: { heading: '', points: [] } };
    normalized.columns = {
      left:  { heading: cols.left?.heading  ?? '', points: Array.isArray(cols.left?.points)  ? cols.left.points  : [] },
      right: { heading: cols.right?.heading ?? '', points: Array.isArray(cols.right?.points) ? cols.right.points : [] },
    };
  }

  if (type === 'cta') {
    normalized.cta_medico   = slide.cta_medico   ?? null;
    normalized.cta_paciente = slide.cta_paciente ?? null;
    normalized.signature    = slide.signature    ?? 'Dr. Paulo Guimarães Jr. • CRM-SC 21.698';
  }

  return normalized;
}

function normalizeSlides(slides) {
  if (!Array.isArray(slides)) return [];
  return slides.map((s, i) => normalizeSlide(s, i));
}

module.exports = { normalizeSlide, normalizeSlides, ALLOWED_TYPES };
