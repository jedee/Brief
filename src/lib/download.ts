/** Save a Blob as a file. The link must be in the document for some browsers to honour the file name. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * A file name every browser and OS accepts: accents and long dashes are
 * simplified (some browsers silently fall back to "download" otherwise).
 */
export function safeFileName(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/\p{M}/gu, '') // drop combining accents: Adébáyọ̀ → Adebayo
      .replace(/[‒-―−]/g, '-') // en/em dashes → hyphen
      .replace(/[^\w .,&()'-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
      .trim() || 'document'
  );
}
