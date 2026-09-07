const generateQuantificationId = () =>
  `quant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const toNumber = (value) => {
  if (value == null || (typeof value === 'string' && ['','\u2014'].includes(value.trim()))) return null;
  const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeQuantificationQuantity = ({ nos, length, breadth, height }) => {
  if ([nos, length, breadth, height].every(value => value == null)) {
    return { quantity: null, unit: '' };
  }
  const n = Number.isFinite(nos) ? nos : 1;
  const l = Number.isFinite(length) ? length : 0;
  const b = Number.isFinite(breadth) ? breadth : 0;
  const h = Number.isFinite(height) ? height : 0;

  const hasDim = l > 0 || b > 0 || h > 0;
  const dimMultiplier = (l > 0 ? l : 1) * (b > 0 ? b : 1) * (h > 0 ? h : 1);
  const quantity = hasDim ? n * dimMultiplier : n;

  let unit = "NO'S";
  if (h > 0) unit = 'CUM';
  else if (b > 0) unit = 'SQM';
  else if (l > 0) unit = 'RM';

  return { quantity, unit };
};

const normalizeQuantificationEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const nos = toNumber(entry.nos);
  const length = toNumber(entry.length);
  const breadth = toNumber(entry.breadth);
  const height = toNumber(entry.height);
  const { quantity, unit } = computeQuantificationQuantity({ nos, length, breadth, height });

  return {
    entry_id: entry.entry_id || generateQuantificationId(),
    category: (entry.category || '').toString().trim(),
    location_of_distress: (entry.location_of_distress || '').toString().trim(),
    nos,
    length,
    breadth,
    height,
    quantity,
    unit,
    repair_methodology: (entry.repair_methodology || '').toString().trim(),
    updated_at: new Date()
  };
};

const normalizeQuantificationList = (entries) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(normalizeQuantificationEntry)
    .filter(Boolean);
};

module.exports = { normalizeQuantificationEntry, normalizeQuantificationList };
