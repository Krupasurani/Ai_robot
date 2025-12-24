/**
 * Extract file data (name, size, path) from File object or string URL
 */
export function fileData(file: File | string) {
  if (typeof file === 'string') {
    const parts = file.split('/');
    const name = parts[parts.length - 1] || file;
    return { name, size: 0, path: file };
  }
  return { name: file.name, size: file.size, path: file.name };
}
