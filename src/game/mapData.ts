import { Territory, Continent } from './types';

// 6 continents, 42 territories
// Positions are for SVG viewBox 0 0 1000 550

export const CONTINENTS: Continent[] = [
  {
    id: 'north-america', name: 'North America', bonus: 5,
    territories: ['alaska', 'northwest-territory', 'greenland', 'alberta', 'ontario', 'quebec', 'western-us', 'eastern-us', 'central-america'],
  },
  {
    id: 'south-america', name: 'South America', bonus: 2,
    territories: ['venezuela', 'peru', 'brazil', 'argentina'],
  },
  {
    id: 'europe', name: 'Europe', bonus: 5,
    territories: ['iceland', 'scandinavia', 'great-britain', 'northern-europe', 'western-europe', 'southern-europe', 'ukraine'],
  },
  {
    id: 'africa', name: 'Africa', bonus: 3,
    territories: ['north-africa', 'egypt', 'east-africa', 'congo', 'south-africa', 'madagascar'],
  },
  {
    id: 'asia', name: 'Asia', bonus: 7,
    territories: ['ural', 'siberia', 'yakutsk', 'kamchatka', 'irkutsk', 'mongolia', 'japan', 'afghanistan', 'china', 'middle-east', 'india', 'siam'],
  },
  {
    id: 'australia', name: 'Australia', bonus: 2,
    territories: ['indonesia', 'new-guinea', 'western-australia', 'eastern-australia'],
  },
];

export const TERRITORIES: Territory[] = [
  // North America
  { id: 'alaska', name: 'Alaska', continentId: 'north-america', cx: 75, cy: 72, adjacent: ['northwest-territory', 'alberta', 'kamchatka'] },
  { id: 'northwest-territory', name: 'NW Territory', continentId: 'north-america', cx: 145, cy: 62, adjacent: ['alaska', 'alberta', 'ontario', 'greenland'] },
  { id: 'greenland', name: 'Greenland', continentId: 'north-america', cx: 310, cy: 35, adjacent: ['northwest-territory', 'ontario', 'quebec', 'iceland'] },
  { id: 'alberta', name: 'Alberta', continentId: 'north-america', cx: 130, cy: 110, adjacent: ['alaska', 'northwest-territory', 'ontario', 'western-us'] },
  { id: 'ontario', name: 'Ontario', continentId: 'north-america', cx: 195, cy: 115, adjacent: ['northwest-territory', 'alberta', 'greenland', 'quebec', 'western-us', 'eastern-us'] },
  { id: 'quebec', name: 'Quebec', continentId: 'north-america', cx: 250, cy: 110, adjacent: ['ontario', 'greenland', 'eastern-us'] },
  { id: 'western-us', name: 'Western US', continentId: 'north-america', cx: 130, cy: 175, adjacent: ['alberta', 'ontario', 'eastern-us', 'central-america'] },
  { id: 'eastern-us', name: 'Eastern US', continentId: 'north-america', cx: 200, cy: 190, adjacent: ['ontario', 'quebec', 'western-us', 'central-america'] },
  { id: 'central-america', name: 'C. America', continentId: 'north-america', cx: 145, cy: 255, adjacent: ['western-us', 'eastern-us', 'venezuela'] },

  // South America
  { id: 'venezuela', name: 'Venezuela', continentId: 'south-america', cx: 195, cy: 305, adjacent: ['central-america', 'peru', 'brazil'] },
  { id: 'peru', name: 'Peru', continentId: 'south-america', cx: 195, cy: 375, adjacent: ['venezuela', 'brazil', 'argentina'] },
  { id: 'brazil', name: 'Brazil', continentId: 'south-america', cx: 250, cy: 360, adjacent: ['venezuela', 'peru', 'argentina', 'north-africa'] },
  { id: 'argentina', name: 'Argentina', continentId: 'south-america', cx: 210, cy: 445, adjacent: ['peru', 'brazil'] },

  // Europe
  { id: 'iceland', name: 'Iceland', continentId: 'europe', cx: 400, cy: 68, adjacent: ['greenland', 'scandinavia', 'great-britain'] },
  { id: 'scandinavia', name: 'Scandinavia', continentId: 'europe', cx: 480, cy: 72, adjacent: ['iceland', 'ukraine', 'northern-europe'] },
  { id: 'great-britain', name: 'Great Britain', continentId: 'europe', cx: 400, cy: 130, adjacent: ['iceland', 'northern-europe', 'western-europe'] },
  { id: 'northern-europe', name: 'N. Europe', continentId: 'europe', cx: 470, cy: 135, adjacent: ['scandinavia', 'great-britain', 'ukraine', 'western-europe', 'southern-europe'] },
  { id: 'western-europe', name: 'W. Europe', continentId: 'europe', cx: 410, cy: 200, adjacent: ['great-britain', 'northern-europe', 'southern-europe', 'north-africa'] },
  { id: 'southern-europe', name: 'S. Europe', continentId: 'europe', cx: 480, cy: 195, adjacent: ['northern-europe', 'western-europe', 'ukraine', 'north-africa', 'egypt', 'middle-east'] },
  { id: 'ukraine', name: 'Ukraine', continentId: 'europe', cx: 545, cy: 110, adjacent: ['scandinavia', 'northern-europe', 'southern-europe', 'ural', 'afghanistan', 'middle-east'] },

  // Africa
  { id: 'north-africa', name: 'N. Africa', continentId: 'africa', cx: 430, cy: 300, adjacent: ['brazil', 'western-europe', 'southern-europe', 'egypt', 'east-africa', 'congo'] },
  { id: 'egypt', name: 'Egypt', continentId: 'africa', cx: 500, cy: 275, adjacent: ['north-africa', 'southern-europe', 'east-africa', 'middle-east'] },
  { id: 'east-africa', name: 'E. Africa', continentId: 'africa', cx: 520, cy: 350, adjacent: ['north-africa', 'egypt', 'congo', 'south-africa', 'madagascar', 'middle-east'] },
  { id: 'congo', name: 'Congo', continentId: 'africa', cx: 480, cy: 380, adjacent: ['north-africa', 'east-africa', 'south-africa'] },
  { id: 'south-africa', name: 'S. Africa', continentId: 'africa', cx: 490, cy: 445, adjacent: ['congo', 'east-africa', 'madagascar'] },
  { id: 'madagascar', name: 'Madagascar', continentId: 'africa', cx: 555, cy: 440, adjacent: ['east-africa', 'south-africa'] },

  // Asia
  { id: 'ural', name: 'Ural', continentId: 'asia', cx: 630, cy: 90, adjacent: ['ukraine', 'siberia', 'afghanistan', 'china'] },
  { id: 'siberia', name: 'Siberia', continentId: 'asia', cx: 700, cy: 60, adjacent: ['ural', 'yakutsk', 'irkutsk', 'mongolia', 'china'] },
  { id: 'yakutsk', name: 'Yakutsk', continentId: 'asia', cx: 775, cy: 45, adjacent: ['siberia', 'irkutsk', 'kamchatka'] },
  { id: 'kamchatka', name: 'Kamchatka', continentId: 'asia', cx: 860, cy: 60, adjacent: ['yakutsk', 'irkutsk', 'mongolia', 'japan', 'alaska'] },
  { id: 'irkutsk', name: 'Irkutsk', continentId: 'asia', cx: 745, cy: 105, adjacent: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'] },
  { id: 'mongolia', name: 'Mongolia', continentId: 'asia', cx: 765, cy: 155, adjacent: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'] },
  { id: 'japan', name: 'Japan', continentId: 'asia', cx: 860, cy: 155, adjacent: ['kamchatka', 'mongolia'] },
  { id: 'afghanistan', name: 'Afghanistan', continentId: 'asia', cx: 625, cy: 165, adjacent: ['ukraine', 'ural', 'china', 'india', 'middle-east'] },
  { id: 'china', name: 'China', continentId: 'asia', cx: 730, cy: 205, adjacent: ['ural', 'siberia', 'mongolia', 'afghanistan', 'india', 'siam'] },
  { id: 'middle-east', name: 'Middle East', continentId: 'asia', cx: 565, cy: 235, adjacent: ['ukraine', 'southern-europe', 'egypt', 'east-africa', 'afghanistan', 'india'] },
  { id: 'india', name: 'India', continentId: 'asia', cx: 670, cy: 265, adjacent: ['afghanistan', 'china', 'middle-east', 'siam'] },
  { id: 'siam', name: 'Siam', continentId: 'asia', cx: 740, cy: 280, adjacent: ['china', 'india', 'indonesia'] },

  // Australia
  { id: 'indonesia', name: 'Indonesia', continentId: 'australia', cx: 760, cy: 370, adjacent: ['siam', 'new-guinea', 'western-australia'] },
  { id: 'new-guinea', name: 'New Guinea', continentId: 'australia', cx: 850, cy: 340, adjacent: ['indonesia', 'eastern-australia', 'western-australia'] },
  { id: 'western-australia', name: 'W. Australia', continentId: 'australia', cx: 800, cy: 440, adjacent: ['indonesia', 'new-guinea', 'eastern-australia'] },
  { id: 'eastern-australia', name: 'E. Australia', continentId: 'australia', cx: 875, cy: 430, adjacent: ['new-guinea', 'western-australia'] },
];

export const TERRITORY_MAP = new Map(TERRITORIES.map(t => [t.id, t]));
export const CONTINENT_MAP = new Map(CONTINENTS.map(c => [c.id, c]));

// Continent fill colors for the SVG background regions
export const CONTINENT_COLORS: Record<string, string> = {
  'north-america': 'hsl(210, 30%, 12%)',
  'south-america': 'hsl(142, 20%, 10%)',
  'europe': 'hsl(217, 25%, 13%)',
  'africa': 'hsl(24, 20%, 10%)',
  'asia': 'hsl(270, 15%, 11%)',
  'australia': 'hsl(48, 20%, 10%)',
};
