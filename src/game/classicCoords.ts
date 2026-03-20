/**
 * Territory center coordinates mapped to the classic Risiko board image.
 * The board image is rendered at 720×720. Coordinates were derived by
 * visually aligning each territory circle with its region on the board.
 * Fine-tune cx/cy values here if any circle drifts off its territory.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 82,  cy: 145 },
  'northwest-territory':  { cx: 158, cy: 123 },
  'alberta':              { cx: 130, cy: 210 },
  'ontario':              { cx: 202, cy: 188 },
  'quebec':               { cx: 260, cy: 153 },
  'greenland':            { cx: 288, cy: 66  },
  'western-us':           { cx: 101, cy: 266 },
  'eastern-us':           { cx: 188, cy: 245 },
  'central-america':      { cx: 123, cy: 324 },

  // South America
  'venezuela':            { cx: 158, cy: 389 },
  'brazil':               { cx: 202, cy: 432 },
  'peru':                 { cx: 130, cy: 454 },
  'argentina':            { cx: 158, cy: 518 },

  // Europe
  'iceland':              { cx: 317, cy: 87  },
  'scandinavia':          { cx: 396, cy: 94  },
  'great-britain':        { cx: 310, cy: 173 },
  'northern-europe':      { cx: 374, cy: 188 },
  'western-europe':       { cx: 324, cy: 245 },
  'southern-europe':      { cx: 389, cy: 238 },
  'ukraine':              { cx: 461, cy: 145 },

  // Africa
  'north-africa':         { cx: 310, cy: 346 },
  'egypt':                { cx: 396, cy: 303 },
  'east-africa':          { cx: 446, cy: 382 },
  'congo':                { cx: 389, cy: 418 },
  'south-africa':         { cx: 403, cy: 482 },
  'madagascar':           { cx: 490, cy: 468 },

  // Asia
  'ural':                 { cx: 497, cy: 145 },
  'siberia':              { cx: 547, cy: 101 },
  'yakutsk':              { cx: 612, cy: 87  },
  'irkutsk':              { cx: 612, cy: 166 },
  'kamchatka':            { cx: 670, cy: 109 },
  'mongolia':             { cx: 598, cy: 231 },
  'japan':                { cx: 677, cy: 173 },
  'afghanistan':          { cx: 504, cy: 210 },
  'china':                { cx: 590, cy: 245 },
  'india':                { cx: 526, cy: 317 },
  'middle-east':          { cx: 454, cy: 303 },
  'siam':                 { cx: 626, cy: 324 },

  // Australia
  'indonesia':            { cx: 598, cy: 410 },
  'new-guinea':           { cx: 662, cy: 374 },
  'western-australia':    { cx: 605, cy: 490 },
  'eastern-australia':    { cx: 670, cy: 468 },
};
