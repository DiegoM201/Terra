import React, { useReducer } from 'react';
import { UnitTypeId, EntityId, TileHash } from '../types/schema';
import { getHexKey, generateRectangularGrid, HexCoord } from '../utils/hexMath';
import { GameConfig } from '../types';

// --- STATE DEFINITIONS ---

export interface CellData {
  q: number;
  r: number;
  terrain: 'Ground' | 'Water' | 'Mountain';
  resource?: 'fruit' | 'game' | 'ore' | 'fish';
}

export interface UnitData {
  id: EntityId;
  typeId: UnitTypeId;
  ownerId: string; // 'player' | 'enemy'
  hp: number;
  maxHp: number;
  moveRange: number;
}

/**
 * The Normalized Game State
 * Optimized for React rendering and Logic updates.
 */
export interface GameState {
  // 1. Board State
  mapWidth: number;
  mapHeight: number;
  cells: Record<TileHash, CellData>;

  // 2. Entity State (Source of Truth)
  units: Record<EntityId, UnitData>;

  // 3. Spatial Lookup (Derived/Maintained)
  // Maps "q:r" -> unitId. Allows O(1) checks for "Is tile occupied?"
  unitPositions: Record<TileHash, EntityId>;

  // 4. Interface State
  selectedHex: TileHash | null;
  turn: number;
  currentPlayer: string;
}

// --- ACTIONS ---

export type GameAction =
  | { type: 'INITIALIZE_GAME'; config: { width: number; height: number; seed: number } }
  | { type: 'SELECT_HEX'; coordKey: TileHash }
  | { type: 'MOVE_UNIT'; unitId: EntityId; to: HexCoord };

// --- FACTORY (INITIALIZER) ---

/**
 * Deterministic World Generator
 * Creates the initial state based on configuration.
 */
export const createInitialState = (mapConfig: { width: number; height: number; seed: number }): GameState => {
  const { width, height, seed } = mapConfig;
  
  const cells: Record<TileHash, CellData> = {};
  const coords = generateRectangularGrid(width, height);

  // 1. Generate Terrain
  const pseudoRandom = (input: number) => {
      const x = Math.sin(input + seed) * 10000;
      return x - Math.floor(x);
  };

  coords.forEach((coord, index) => {
    const key = getHexKey(coord.q, coord.r);
    const noise = pseudoRandom(index);
    
    let terrain: CellData['terrain'] = 'Ground';
    if (noise > 0.85) terrain = 'Mountain';
    else if (noise < 0.15) terrain = 'Water';

    cells[key] = {
      q: coord.q,
      r: coord.r,
      terrain,
      // Add resource chance logic here based on noise
      resource: noise > 0.9 ? 'ore' : undefined
    };
  });

  // 2. Initial Units (Mock Data)
  // In a real app, we'd find valid spawn points first
  const units: Record<EntityId, UnitData> = {};
  const unitPositions: Record<TileHash, EntityId> = {};

  const addUnit = (id: string, type: UnitTypeId, q: number, r: number, owner: string) => {
      units[id] = { id, typeId: type, ownerId: owner, hp: 10, maxHp: 10, moveRange: 1 };
      unitPositions[getHexKey(q, r)] = id;
  };

  // Ensure 0,0 is ground for the player
  const startKey = getHexKey(0,0);
  if (cells[startKey]) cells[startKey].terrain = 'Ground';
  addUnit('u1', 'warrior', 0, 0, 'player');

  return {
    mapWidth: width,
    mapHeight: height,
    cells,
    units,
    unitPositions,
    selectedHex: null,
    turn: 1,
    currentPlayer: 'player'
  };
};

// --- REDUCER ---

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      return createInitialState(action.config);

    case 'SELECT_HEX':
      return {
        ...state,
        selectedHex: action.coordKey === state.selectedHex ? null : action.coordKey
      };

    case 'MOVE_UNIT': {
      const { unitId, to } = action;
      const unit = state.units[unitId];
      if (!unit) return state; // Guard clause

      // 1. Find unit's current position to clear it from lookup
      // In a fully normalized state, we might store position on the unit too,
      // but here we have to find it via lookup or scan.
      // Optimization: We can store `coord` on UnitData to make this O(1).
      // For now, let's assume we know the old position or find it.
      const oldPosEntry = Object.entries(state.unitPositions).find(([_, id]) => id === unitId);
      if (!oldPosEntry) return state;
      const [oldKey] = oldPosEntry;

      const newKey = getHexKey(to.q, to.r);

      // Validation (Basic)
      if (state.unitPositions[newKey]) {
          console.warn("Collision detected. Move aborted.");
          return state;
      }
      if (!state.cells[newKey] || state.cells[newKey].terrain === 'Water') {
          console.warn("Invalid terrain.");
          return state;
      }

      // 2. Execute Move (Immutably)
      const newUnitPositions = { ...state.unitPositions };
      delete newUnitPositions[oldKey];
      newUnitPositions[newKey] = unitId;

      return {
        ...state,
        unitPositions: newUnitPositions,
        // If we stored position on unit, we'd update state.units here too
      };
    }

    default:
      return state;
  }
};

// --- HOOK ---

export const useGameStore = (initialConfig: { width: number; height: number; seed: number }) => {
  const [state, dispatch] = useReducer(gameReducer, initialConfig, createInitialState);
  return { state, dispatch };
};
