const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Read paths from public/logo.svg
const logoSvg = fs.readFileSync(path.join(__dirname, '../public/logo.svg'), 'utf8');
const innerContent = logoSvg.slice(logoSvg.indexOf('<g transform'), logoSvg.lastIndexOf('</svg>'));

function getSvg(size, logoScale, bg = '#ffffff') {
  const targetH = size * logoScale;
  const targetW = targetH * (1508 / 1669);
  const offsetX = (size - targetW) / 2;
  const offsetY = (size - targetH) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <svg x="${offsetX}" y="${offsetY}" width="${targetW}" height="${targetH}" viewBox="0 0 1508 1669" preserveAspectRatio="xMidYMid meet">
    ${innerContent}
  </svg>
</svg>`;
}

function getFaviconSvg() {
  const size = 512;
  const targetH = size * 0.80;
  const targetW = targetH * (1508 / 1669);
  const offsetX = (size - targetW) / 2;
  const offsetY = (size - targetH) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="105" fill="#ffffff"/>
  <svg x="${offsetX}" y="${offsetY}" width="${targetW}" height="${targetH}" viewBox="0 0 1508 1669" preserveAspectRatio="xMidYMid meet">
    ${innerContent}
  </svg>
</svg>`;
}

async function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4); // count
  
  let offset = 6 + count * 16;
  const entries = [];
  
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width === 256 ? 0 : width, 0);
    entry.writeUInt8(height === 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }
  
  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  const publicDir = path.join(__dirname, '../public');

  // 1. apple-touch-icon.png (180x180, scale 0.80 for perfect squircle safe zone on iOS)
  const appleSvg = getSvg(180, 0.80, '#ffffff');
  const appleBuf = await sharp(Buffer.from(appleSvg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleBuf);

  // 2. pwa-192x192.png (192x192, scale 0.82)
  const pwa192Svg = getSvg(192, 0.82, '#ffffff');
  const pwa192Buf = await sharp(Buffer.from(pwa192Svg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192Buf);

  // 3. pwa-512x512.png (512x512, scale 0.82)
  const pwa512Svg = getSvg(512, 0.82, '#ffffff');
  const pwa512Buf = await sharp(Buffer.from(pwa512Svg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512Buf);

  // 4. pwa-maskable-512x512.png (512x512, scale 0.58 for safe circular mask)
  const maskableSvg = getSvg(512, 0.58, '#ffffff');
  const maskableBuf = await sharp(Buffer.from(maskableSvg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskableBuf);

  // 5. favicon-32x32.png and favicon-16x16.png
  const fav32Svg = getSvg(32, 0.84, '#ffffff');
  const fav32Buf = await sharp(Buffer.from(fav32Svg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32Buf);

  const fav16Svg = getSvg(16, 0.84, '#ffffff');
  const fav16Buf = await sharp(Buffer.from(fav16Svg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), fav16Buf);

  const fav48Svg = getSvg(48, 0.84, '#ffffff');
  const fav48Buf = await sharp(Buffer.from(fav48Svg)).png().toBuffer();

  // 6. favicon.ico
  const icoBuf = await createIco([
    { width: 16, height: 16, buffer: fav16Buf },
    { width: 32, height: 32, buffer: fav32Buf },
    { width: 48, height: 48, buffer: fav48Buf }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

  // 7. favicon.svg
  const faviconSvgContent = getFaviconSvg();
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvgContent);
  
  console.log('Official PKBM icons generated successfully for Android, iPhone, and Web favicon!');
}

run();
