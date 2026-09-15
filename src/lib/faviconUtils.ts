/**
 * Utilities for Dynamic Favicon Management and Processing
 */

/**
 * Updates all favicon and touch icon links in the browser document dynamically
 */
export function updateDocumentFavicon(faviconUrl?: string): void {
  if (typeof document === 'undefined') return;

  const url = faviconUrl?.trim() || '/favicon.svg';

  // Selectors for favicon and touch icons
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]'
  ];

  let foundAny = false;

  iconSelectors.forEach((selector) => {
    const links = document.querySelectorAll(selector);
    links.forEach((link) => {
      foundAny = true;
      link.setAttribute('href', url);
    });
  });

  // Ensure at least one standard favicon link exists
  if (!foundAny) {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = url;
    document.head.appendChild(newLink);
  }
}

/**
 * Compresses and formats an uploaded image specifically as a square Favicon (128x128)
 * preserving transparency and maintaining optimal aspect ratio.
 */
export function compressFaviconImage(file: File, targetSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas harus berupa gambar (PNG, SVG, ICO, JPG, WebP)'));
      return;
    }

    // Direct SVG handling
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Gagal membaca berkas SVG'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas SVG'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.clearRect(0, 0, targetSize, targetSize);

        // Fit image centered within the square canvas
        const aspect = img.width / img.height;
        let drawW = targetSize;
        let drawH = targetSize;
        let drawX = 0;
        let drawY = 0;

        if (aspect > 1) {
          drawH = Math.round(targetSize / aspect);
          drawY = Math.round((targetSize - drawH) / 2);
        } else {
          drawW = Math.round(targetSize * aspect);
          drawX = Math.round((targetSize - drawW) / 2);
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar favicon'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas'));
    reader.readAsDataURL(file);
  });
}
