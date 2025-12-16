// Data-Driven Configuration Types
export interface MapConfig {
  width: number;
  height: number;
  noiseSeed: number;
  gridType: 'SQUARE' | 'HEX';
}

export interface ComponentData {
  type: string;
  [key: string]: any;
}

export interface UnitDefinition {
  name: string;
  symbol: string; // For the prototype visual
  color: string;
  components: ComponentData[];
}

export interface TechDefinition {
  id: string;
  name: string;
  cost: number;
  prerequisite?: string; // ID of the required tech
  description?: string;
  symbol: string;
  column: number; // Visual X position (Tier)
  row: number;    // Visual Y position (Branch)
}

export interface ImprovementDefinition {
  id: string;
  name: string;
  symbol: string;
  cost: number;
  techRequired?: string;
  validTerrain: string[]; // e.g. ['Ground', 'Mountain']
  populationBonus?: number;
  description: string;
}

export interface BuildingDefinition {
  id: string;
  name: string;
  symbol: string;
  cost: number; // Star cost
  techRequired?: string;
  description: string;
  stats: {
    income?: number; // Stars per turn
    defense?: number; // Bonus defense for city
    population?: number; // Instant pop boost
    vision?: number; // Vision range bonus
  };
}

export interface GameConfig {
  map: MapConfig;
  units: Record<string, UnitDefinition>;
  techs: Record<string, TechDefinition>;
  improvements: Record<string, ImprovementDefinition>;
  buildings: Record<string, BuildingDefinition>;
}

export enum Visibility {
  HIDDEN = 0, // Black/Clouds
  FOGGED = 1, // Terrain visible, current units hidden
  VISIBLE = 2, // Full vision
}

export interface PlayerState {
  stars: number;
  income: number;
  unlockedTechs: string[]; // List of unlocked tech IDs
}

export interface ProductionItem {
  id: string;
  key: string;
  type: 'UNIT' | 'BUILDING';
  turnsRemaining: number;
  totalTurns: number;
}

// ECS Types for Prototype
export interface Entity {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number; // Elevation level
  components: Record<string, any>;
  ownerId?: string; // For ownership
  hasMoved?: boolean; // Track turn state
  name?: string; // For Cities
  productionQueue: ProductionItem[];
  buildings: string[]; // List of constructed building IDs (Internal city structures)
}

export interface Tile {
  x: number;
  y: number;
  z: number; // 0 = Ground, 1 = Sky
  type: 'Ground' | 'Water' | 'Mountain' | 'Void';
  visibility: Visibility;
  ownerId?: string; // Territory ownership (Player)
  cityId?: string; // Which city manages this tile
  improvement?: string; // ID of constructed improvement
  resource?: 'fruit' | 'game' | 'ore' | 'fish';
}

export enum TurnState {
  START = 'StartTurn',
  INPUT = 'PlayerInput',
  RESOLUTION = 'Resolution',
  END = 'EndTurn',
}