/**
 * Territory center coordinates for the classic Risiko board (risk-map-dots.jpg).
 * SVG viewBox is 720×720. Calibrated from the red dots painted on the reference image.
 * Fine-tune individual cx/cy values if a circle is off its dot.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 55,  cy: 145 },
  'northwest-territory':  { cx: 118, cy: 122 },
  'greenland':            { cx: 248, cy: 92  },
  'alberta':              { cx: 78,  cy: 210 },
  'ontario':              { cx: 148, cy: 200 },
  'quebec':               { cx: 210, cy: 170 },
  'western-us':           { cx: 78,  cy: 278 },
  'eastern-us':           { cx: 145, cy: 270 },
  'central-america':      { cx: 78,  cy: 348 },

  // South America
  'venezuela':            { cx: 148, cy: 412 },
  'brazil':               { cx: 155, cy: 478 },
  'peru':                 { cx: 112, cy: 455 },
  'argentina':            { cx: 112, cy: 562 },

  // Europe
  'iceland':              { cx: 315, cy: 172 },
  'scandinavia':          { cx: 345, cy: 142 },
  'great-britain':        { cx: 268, cy: 300 },
  'northern-europe':      { cx: 348, cy: 292 },
  'western-europe':       { cx: 280, cy: 352 },
  'southern-europe':      { cx: 320, cy: 348 },
  'ukraine':              { cx: 382, cy: 228 },

  // Africa
  'north-africa':         { cx: 278, cy: 468 },
  'egypt':                { cx: 365, cy: 415 },
  'east-africa':          { cx: 390, cy: 478 },
  'congo':                { cx: 355, cy: 525 },
  'south-africa':         { cx: 355, cy: 582 },
  'madagascar':           { cx: 458, cy: 572 },

  // Asia
  'ural':                 { cx: 462, cy: 228 },
  'siberia':              { cx: 508, cy: 175 },
  'yakutsk':              { cx: 548, cy: 128 },
  'irkutsk':              { cx: 548, cy: 242 },
  'kamchatka':            { cx: 622, cy: 162 },
  'mongolia':             { cx: 605, cy: 322 },
  'japan':                { cx: 658, cy: 248 },
  'afghanistan':          { cx: 470, cy: 315 },
  'china':                { cx: 588, cy: 345 },
  'india':                { cx: 515, cy: 410 },
  'middle-east':          { cx: 428, cy: 410 },
  'siam':                 { cx: 618, cy: 410 },

  // Australia
  'indonesia':            { cx: 620, cy: 472 },
  'new-guinea':           { cx: 662, cy: 475 },
  'western-australia':    { cx: 612, cy: 558 },
  'eastern-australia':    { cx: 660, cy: 542 },
};
