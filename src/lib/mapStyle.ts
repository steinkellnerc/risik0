export type MapStyle = 'modern' | 'classic';

export function getMapStyle(): MapStyle {
  try {
    return (localStorage.getItem('mapStyle') as MapStyle) || 'modern';
  } catch {
    return 'modern';
  }
}

export function saveMapStyle(style: MapStyle): void {
  try {
    localStorage.setItem('mapStyle', style);
  } catch {
    // ignore
  }
}
