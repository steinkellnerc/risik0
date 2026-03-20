/**
 * Territory center coordinates mapped to the classic Risiko board image.
 * The board image is rendered at 720×720. Coordinates were derived by
 * visually aligning each territory circle with its region on the board.
 * Fine-tune cx/cy values here if any circle drifts off its territory.
 */
export const CLASSIC_COORDS: Record<string, { cx: number; cy: number }> = {
  // North America
  'alaska':               { cx: 103, cy: 138 },
  'northwest-territory':  { cx: 166, cy: 112 },
  'alberta':              { cx: 138, cy: 194 },
  'ontario':              { cx: 207, cy: 175 },
  'quebec':               { cx: 262, cy: 146 },
  'greenland':            { cx: 291, cy: 56  },
  'western-us':           { cx: 117, cy: 246 },
  'eastern-us':           { cx: 194, cy: 225 },
  'central-america':      { cx: 131, cy: 302 },

  // South America
  'venezuela':            { cx: 159, cy: 380 },
  'brazil':               { cx: 207, cy: 412 },
  'peru':                 { cx: 138, cy: 426 },
  'argentina':            { cx: 159, cy: 496 },

  // Europe
  'iceland':              { cx: 312, cy: 80  },
  'scandinavia':          { cx: 381, cy: 88  },
  'great-britain':        { cx: 310, cy: 168 },
  'northern-europe':      { cx: 367, cy: 182 },
  'western-europe':       { cx: 318, cy: 238 },
  'southern-europe':      { cx: 373, cy: 224 },
  'ukraine':              { cx: 451, cy: 132 },

  // Africa
  'north-africa':         { cx: 313, cy: 334 },
  'egypt':                { cx: 394, cy: 283 },
  'east-africa':          { cx: 436, cy: 374 },
  'congo':                { cx: 380, cy: 404 },
  'south-africa':         { cx: 393, cy: 462 },
  'madagascar':           { cx: 476, cy: 448 },

  // Asia
  'ural':                 { cx: 484, cy: 132 },
  'siberia':              { cx: 538, cy: 96  },
  'yakutsk':              { cx: 588, cy: 80  },
  'irkutsk':              { cx: 594, cy: 152 },
  'kamchatka':            { cx: 644, cy: 104 },
  'mongolia':             { cx: 582, cy: 218 },
  'japan':                { cx: 664, cy: 160 },
  'afghanistan':          { cx: 484, cy: 196 },
  'china':                { cx: 568, cy: 232 },
  'india':                { cx: 512, cy: 296 },
  'middle-east':          { cx: 450, cy: 276 },
  'siam':                 { cx: 602, cy: 304 },

  // Australia
  'indonesia':            { cx: 574, cy: 398 },
  'new-guinea':           { cx: 643, cy: 362 },
  'western-australia':    { cx: 588, cy: 462 },
  'eastern-australia':    { cx: 643, cy: 448 },
};
