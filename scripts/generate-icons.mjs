import sharp from 'sharp';
import { writeFileSync } from 'fs';

function createIconSVG(size) {
  const s = size;
  const pad = s * 0.08;
  const center = s / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#060a14"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#1e3a5f" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="url(#bg)"/>
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="url(#glow)"/>

  <!-- Cannon body (barrel) -->
  <g transform="translate(${center}, ${center * 0.92}) rotate(-35)">
    <!-- Barrel -->
    <rect x="${-s * 0.04}" y="${-s * 0.28}" width="${s * 0.08}" height="${s * 0.3}" rx="${s * 0.02}" fill="#c0c0c0"/>
    <rect x="${-s * 0.05}" y="${-s * 0.28}" width="${s * 0.1}" height="${s * 0.04}" rx="${s * 0.01}" fill="#d4d4d4"/>
    <!-- Barrel flare/muzzle -->
    <rect x="${-s * 0.055}" y="${-s * 0.30}" width="${s * 0.11}" height="${s * 0.035}" rx="${s * 0.012}" fill="#e0e0e0"/>
  </g>

  <!-- Cannon base (carriage) -->
  <ellipse cx="${center}" cy="${center * 1.08}" rx="${s * 0.14}" ry="${s * 0.06}" fill="#8B4513"/>
  <rect x="${center - s * 0.13}" y="${center * 0.99}" width="${s * 0.26}" height="${s * 0.09}" rx="${s * 0.02}" fill="#A0522D"/>

  <!-- Left wheel -->
  <circle cx="${center - s * 0.11}" cy="${center * 1.15}" r="${s * 0.08}" fill="none" stroke="#654321" stroke-width="${s * 0.015}"/>
  <circle cx="${center - s * 0.11}" cy="${center * 1.15}" r="${s * 0.02}" fill="#654321"/>
  <!-- Spokes -->
  ${[0, 45, 90, 135].map(angle => {
    const cx = center - s * 0.11;
    const cy = center * 1.15;
    const r = s * 0.07;
    const rad = angle * Math.PI / 180;
    return `<line x1="${cx - r * Math.cos(rad)}" y1="${cy - r * Math.sin(rad)}" x2="${cx + r * Math.cos(rad)}" y2="${cy + r * Math.sin(rad)}" stroke="#654321" stroke-width="${s * 0.008}"/>`;
  }).join('\n  ')}

  <!-- Right wheel -->
  <circle cx="${center + s * 0.11}" cy="${center * 1.15}" r="${s * 0.08}" fill="none" stroke="#654321" stroke-width="${s * 0.015}"/>
  <circle cx="${center + s * 0.11}" cy="${center * 1.15}" r="${s * 0.02}" fill="#654321"/>
  ${[0, 45, 90, 135].map(angle => {
    const cx = center + s * 0.11;
    const cy = center * 1.15;
    const r = s * 0.07;
    const rad = angle * Math.PI / 180;
    return `<line x1="${cx - r * Math.cos(rad)}" y1="${cy - r * Math.sin(rad)}" x2="${cx + r * Math.cos(rad)}" y2="${cy + r * Math.sin(rad)}" stroke="#654321" stroke-width="${s * 0.008}"/>`;
  }).join('\n  ')}

  <!-- Muzzle flash / spark -->
  <g transform="translate(${center - s * 0.2}, ${center * 0.52})">
    <circle r="${s * 0.04}" fill="#FFD700" opacity="0.9"/>
    <circle r="${s * 0.025}" fill="#FFF8DC" opacity="0.95"/>
    <!-- Spark rays -->
    ${[0, 60, 120, 180, 240, 300].map(angle => {
      const rad = angle * Math.PI / 180;
      return `<line x1="0" y1="0" x2="${s * 0.06 * Math.cos(rad)}" y2="${s * 0.06 * Math.sin(rad)}" stroke="#FFD700" stroke-width="${s * 0.006}" opacity="0.7"/>`;
    }).join('\n    ')}
  </g>

  <!-- "RISK" text -->
  <text x="${center}" y="${s * 0.88}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${s * 0.12}" fill="white" letter-spacing="${s * 0.01}">RISK</text>

  <!-- Subtle border -->
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
</svg>`;
}

const sizes = [192, 512];

for (const size of sizes) {
  const svg = createIconSVG(size);
  const svgBuffer = Buffer.from(svg);

  await sharp(svgBuffer)
    .png()
    .toFile(`public/icon-${size}.png`);

  console.log(`Created public/icon-${size}.png`);
}

// Also create an apple-touch-icon (180x180)
const appleSvg = createIconSVG(180);
await sharp(Buffer.from(appleSvg))
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('Created public/apple-touch-icon.png');
