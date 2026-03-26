/**
 * Territory center coordinates for the classic Risiko board (risk-map-dots.jpg).
 * SVG viewBox is 720×720. Calibrated to the red dots painted on the reference image.
 * Fine-tune individual cx/cy values if a circle is off its dot.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 55,  cy: 145 },
  'northwest-territory':  { cx: 118, cy: 122 },
  'greenland':            { cx: 248, cy: 92  },
  'alberta':              { cx: 78,  cy: 210 },
  'ontario':              { cx: 182, cy: 200 },
  'quebec':               { cx: 252, cy: 212 },
  'western-us':           { cx: 78,  cy: 278 },
  'eastern-us':           { cx: 145, cy: 270 },
  'central-america':      { cx: 78,  cy: 348 },

  // South America
  'venezuela':            { cx: 148, cy: 412 },
  'brazil':               { cx: 155, cy: 478 },
  'peru':                 { cx: 95,  cy: 472 },
  'argentina':            { cx: 112, cy: 592 },

  // Europe
  'iceland':              { cx: 322, cy: 155 },
  'scandinavia':          { cx: 355, cy: 205 },
  'great-britain':        { cx: 268, cy: 300 },
  'northern-europe':      { cx: 348, cy: 292 },
  'western-europe':       { cx: 280, cy: 352 },
  'southern-europe':      { cx: 348, cy: 348 },  // moved right
  'ukraine':              { cx: 415, cy: 228 },  // moved right

  // Africa
  'north-africa':         { cx: 278, cy: 468 },
  'egypt':                { cx: 365, cy: 432 },
  'east-africa':          { cx: 390, cy: 478 },
  'congo':                { cx: 355, cy: 525 },
  'south-africa':         { cx: 355, cy: 582 },
  'madagascar':           { cx: 458, cy: 572 },

  // Asia
  'ural':                 { cx: 487, cy: 228 },  // right
  'siberia':              { cx: 552, cy: 175 },
  'yakutsk':              { cx: 612, cy: 128 },
  'irkutsk':              { cx: 585, cy: 242 },
  'kamchatka':            { cx: 665, cy: 198 },
  'mongolia':             { cx: 605, cy: 322 },
  'japan':                { cx: 658, cy: 318 },
  'afghanistan':          { cx: 470, cy: 315 },
  'china':                { cx: 568, cy: 360 },  // left and down
  'india':                { cx: 515, cy: 410 },
  'middle-east':          { cx: 428, cy: 410 },
  'siam':                 { cx: 575, cy: 428 },

  // Australia
  'indonesia':            { cx: 620, cy: 472 },
  'new-guinea':           { cx: 662, cy: 492 },
  'western-australia':    { cx: 612, cy: 558 },
  'eastern-australia':    { cx: 660, cy: 542 },
};
