export const formatDateRange = (start, end) => {
  if (!start) return 'Select dates';
  if (!end || start === end) return start;
  return `${start} to ${end}`;
};
