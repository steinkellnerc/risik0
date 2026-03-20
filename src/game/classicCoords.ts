/**
 * Territory center coordinates mapped to the classic Risiko board image.
 * The board image is rendered at 720×720. Coordinates were derived by
 * visually aligning each territory circle with its region on the board.
 * Fine-tune cx/cy values here if any circle drifts off its territory.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 78,  cy: 105 },
  'northwest-territory':  { cx: 160, cy: 122 },
  'alberta':              { cx: 145, cy: 185 },
  'ontario':              { cx: 210, cy: 178 },
  'quebec':               { cx: 255, cy: 143 },
  'greenland':            { cx: 298, cy: 68  },
  'western-us':           { cx: 118, cy: 238 },
  'eastern-us':           { cx: 198, cy: 238 },
  'central-america':      { cx: 125, cy: 308 },

  // South America
  'venezuela':            { cx: 182, cy: 368 },
  'brazil':               { cx: 225, cy: 402 },
  'peru':                 { cx: 152, cy: 412 },
  'argentina':            { cx: 182, cy: 478 },

  // Europe
  'iceland':              { cx: 336, cy: 80  },
  'scandinavia':          { cx: 412, cy: 92  },
  'great-britain':        { cx: 332, cy: 158 },
  'northern-europe':      { cx: 398, cy: 166 },
  'western-europe':       { cx: 352, cy: 225 },
  'southern-europe':      { cx: 418, cy: 218 },
  'ukraine':              { cx: 476, cy: 132 },

  // Africa
  'north-africa':         { cx: 362, cy: 318 },
  'egypt':                { cx: 434, cy: 282 },
  'east-africa':          { cx: 462, cy: 368 },
  'congo':                { cx: 412, cy: 394 },
  'south-africa':         { cx: 434, cy: 462 },
  'madagascar':           { cx: 506, cy: 455 },

  // Asia
  'ural':                 { cx: 524, cy: 122 },
  'siberia':              { cx: 565, cy: 78  },
  'yakutsk':              { cx: 628, cy: 92  },
  'irkutsk':              { cx: 622, cy: 150 },
  'kamchatka':            { cx: 686, cy: 108 },
  'mongolia':             { cx: 622, cy: 202 },
  'japan':                { cx: 698, cy: 165 },
  'afghanistan':          { cx: 514, cy: 188 },
  'china':                { cx: 614, cy: 225 },
  'india':                { cx: 548, cy: 275 },
  'middle-east':          { cx: 484, cy: 260 },
  'siam':                 { cx: 644, cy: 296 },

  // Australia
  'indonesia':            { cx: 636, cy: 394 },
  'new-guinea':           { cx: 686, cy: 368 },
  'western-australia':    { cx: 636, cy: 462 },
  'eastern-australia':    { cx: 692, cy: 448 },
};
