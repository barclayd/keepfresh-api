export const toTitleCase = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) =>
      w.length && w[0] ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w,
    )
    .join(' ');
