/**
 * WHITEBOX ENGINE - HEX MATH UTILS
 * System: Axial Coordinates (q, r)
 * Orientation: Pointy-topped
 */

export interface HexCoord {
  q: number;
  r: number;
}

/**
 * Generates a unique string key for a coordinate.
 * Used for O(1) Map lookups.
 * Format: "q:r"
 */
export const getHexKey = (q: number, r: number): string => `${q}:${r}`;

/**
 * Parses a key back into coordinates.
 */
export const parseHexKey = (key: string): HexCoord => {
  const [q, r] = key.split(':').map(Number);
  return { q, r };
};

/**
 * Converts "Offset" coordinates (typical 2D array col, row) to "Axial" (q, r).
 * Essential for generating rectangular maps.
 * Assumes "Odd-r" layout (odd rows shifted right).
 */
export const offsetToAxial = (col: number, row: number): HexCoord => {
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  return { q, r };
};

/**
 * Generates a rectangular grid of Hex coordinates.
 */
export const generateRectangularGrid = (width: number, height: number): HexCoord[] => {
  const hexes: HexCoord[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      hexes.push(offsetToAxial(col, row));
    }
  }
  return hexes;
};

/**
 * Calculates the Manhattan distance between two hexes.
 */
export const hexDistance = (a: HexCoord, b: HexCoord): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

/**
 * Returns the 6 neighbors of a given hex.
 */
export const getNeighbors = (center: HexCoord): HexCoord[] => {
    const directions = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    return directions.map(d => ({ q: center.q + d.q, r: center.r + d.r }));
};
