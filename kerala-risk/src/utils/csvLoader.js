import Papa from 'papaparse';

/**
 * Generic CSV loader — reads any CSV from /public/data/ folder.
 * Returns a promise that resolves to an array of row objects.
 *
 * @param {string} filename  — filename inside /public/data/  e.g. 'districts.csv'
 * @param {object} opts      — PapaParse overrides (optional)
 */
export async function loadCSV(filename, opts = {}) {
  const url = `${process.env.PUBLIC_URL}/data/${filename}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${filename}: ${response.status}`);
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: h => h.trim(),
      ...opts,
      complete: result => resolve(result.data),
      error: err => reject(err),
    });
  });
}
