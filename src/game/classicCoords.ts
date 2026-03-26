/**
 * Territory center coordinates mapped to the classic Risiko board image (risk-map-dots.jpg).
 * The board image is rendered at 720×720. Coordinates are calibrated to the red dots
 * the user painted at each territory's center on the reference image.
 * Fine-tune cx/cy here if any circle drifts off its dot.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 78,  cy: 138 },
  'northwest-territory':  { cx: 157, cy: 115 },
  'greenland':            { cx: 290, cy: 65  },
  'alberta':              { cx: 122, cy: 195 },
  'ontario':              { cx: 194, cy: 178 },
  'quebec':               { cx: 252, cy: 150 },
  'western-us':           { cx: 100, cy: 255 },
  'eastern-us':           { cx: 178, cy: 238 },
  'central-america':      { cx: 115, cy: 318 },

  // South America
  'venezuela':            { cx: 163, cy: 375 },
  'brazil':               { cx: 208, cy: 427 },
  'peru':                 { cx: 130, cy: 448 },
  'argentina':            { cx: 158, cy: 512 },

  // Europe
  'iceland':              { cx: 312, cy: 80  },
  'scandinavia':          { cx: 390, cy: 88  },
  'great-britain':        { cx: 304, cy: 168 },
  'northern-europe':      { cx: 374, cy: 182 },
  'western-europe':       { cx: 318, cy: 240 },
  'southern-europe':      { cx: 384, cy: 230 },
  'ukraine':              { cx: 453, cy: 143 },

  // Africa
  'north-africa':         { cx: 311, cy: 342 },
  'egypt':                { cx: 392, cy: 297 },
  'east-africa':          { cx: 444, cy: 376 },
  'congo':                { cx: 387, cy: 413 },
  'south-africa':         { cx: 400, cy: 475 },
  'madagascar':           { cx: 483, cy: 460 },

  // Asia
  'ural':                 { cx: 492, cy: 138 },
  'siberia':              { cx: 542, cy: 97  },
  'yakutsk':              { cx: 608, cy: 81  },
  'irkutsk':              { cx: 606, cy: 160 },
  'kamchatka':            { cx: 663, cy: 107 },
  'mongolia':             { cx: 593, cy: 228 },
  'japan':                { cx: 669, cy: 170 },
  'afghanistan':          { cx: 496, cy: 203 },
  'china':                { cx: 583, cy: 243 },
  'india':                { cx: 520, cy: 311 },
  'middle-east':          { cx: 447, cy: 296 },
  'siam':                 { cx: 619, cy: 317 },

  // Australia
  'indonesia':            { cx: 592, cy: 402 },
  'new-guinea':           { cx: 656, cy: 366 },
  'western-australia':    { cx: 596, cy: 480 },
  'eastern-australia':    { cx: 658, cy: 458 },
};
