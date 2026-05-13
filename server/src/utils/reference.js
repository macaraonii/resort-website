export const buildReference = (id, date = new Date()) => {
  const year = date.getFullYear();
  const suffix = String(id).padStart(5, '0');
  return `CW-${year}-${suffix}`;
};
