/**
 * WHITEBOX ENGINE SCHEMA
 * Data-Driven Architecture Definition
 * 
 * DESIGN PRINCIPLE: "Capability over Identity"
 * - Units are defined by what they can DO (Capabilities), not what they ARE (Class Name).
 * - Logic checks `unit.capabilities.includes('FLYING')` instead of `unit.type === 'Dragon'`.
 */

// --- PRIMITIVES ---
export type EntityId = string;
export type PlayerId = string;
export type TileHash = string; // e.g. "q,r,s" or "x,y"
export type TechId = string;
export type UnitTypeId = string;

// --- 1. TAGS & CAPABILITIES ---

/**
 * Capabilities define functional behavior logic.
 * The Engine queries these to permit actions.
 */
export type Capability = 
  | 'TRAVERSAL_LAND'     // Standard movement
  | 'TRAVERSAL_WATER'    // Boat/Ship
  | 'TRAVERSAL_FLY'      // Ignored terrain costs
  | 'TRAVERSAL_CLIMB'    // Mountains
  | 'ATTACK_MELEE'
  | 'ATTACK_RANGED'
  | 'CAPTURE_CITY'
  | 'CONSTRUCT'          // Can build improvements
  | 'GATHER';            // Can harvest resources

/**
 * Tags are used for combat modifiers and interaction filtering.
 * e.g. "Pikeman deals Bonus Damage vs MOUNTED"
 */
export type UnitTag =
  | 'BIOLOGICAL'
  | 'MECHANICAL'
  | 'MOUNTED'
  | 'NAVAL'
  | 'STRUCTURE'
  | 'HERO';

// --- 2. CONFIGURATION (Static Data) ---

export interface UnitConfig {
    name: string;
    cost: number;
    description: string;
    // Core Stats
    stats: {
        health: number;
        defense: number;
        vision: number;
        movement: number;
        range?: number; // Only if ATTACK_RANGED capability exists
    };
    // The "What can I do?" map. Value indicates magnitude (e.g. range) or simply true.
    capabilities: Partial<Record<Capability, number | boolean>>;
    tags: UnitTag[];
}

export interface TerrainConfig {
    id: string;
    moveCost: number; // 999 = Impassable (unless FLY/CLIMB override)
    defenseBonus: number;
    tags: string[]; // e.g. "WATER", "ROUGH", "FLAT"
}

export interface TechConfig {
    id: TechId;
    name: string;
    cost: number;
    prerequisites: TechId[];
    // Data-driven unlocks
    unlocks: {
        units?: UnitTypeId[];
        improvements?: string[];
        globalCapabilities?: Capability[]; // e.g. 'TRAVERSAL_WATER' unlocked for all units (Boats)
    };
}

/**
 * The Master Configuration Object
 * Loaded at runtime to define the ruleset.
 */
export interface GameConfig {
    units: Record<UnitTypeId, UnitConfig>;
    terrain: Record<string, TerrainConfig>;
    techs: Record<TechId, TechConfig>;
    improvements: Record<string, { cost: number; bonuses: Record<string, number> }>;
}

// --- 3. GAME STATE (Dynamic Data) ---

export interface HexCoordinate {
    q: number; 
    r: number;
    s: number; // q + r + s = 0
}

export interface EntityState {
    id: EntityId;
    ownerId: PlayerId;
    typeId: UnitTypeId; // Refers to GameConfig.units
    position: HexCoordinate;
    
    // Mutable Stats
    hp: number;
    actionsRemaining: number;
    
    // Status
    isFortified: boolean;
    isVeteran: boolean;
    
    // For Cities
    population?: number;
    productionQueue?: { itemKey: string; turnsLeft: number }[];
}

export interface PlayerState {
    id: PlayerId;
    resources: {
        stars: number;
        income: number;
    };
    techs: string[]; // List of unlocked Tech IDs
    vision: string[]; // List of visible TileHashes (Fog of War)
}

/**
 * Snapshot of the entire game world.
 * Can be serialized to JSON for saving/loading.
 */
export interface GameState {
    turnNumber: number;
    activePlayerId: PlayerId;
    map: {
        width: number;
        height: number;
        seed: number;
        // Sparse storage or 2D array
        tiles: Record<TileHash, { type: string; improvement?: string; ownerId?: PlayerId }>;
    };
    entities: Record<EntityId, EntityState>;
    players: Record<PlayerId, PlayerState>;
}

// --- 4. ACTIONS (Union Type) ---

/**
 * Discriminated Union representing all atomic changes to state.
 * Implements the Command Pattern.
 */
export type Action =
    | { type: 'MOVE_UNIT'; playerId: PlayerId; unitId: EntityId; path: HexCoordinate[] }
    | { type: 'ATTACK_UNIT'; playerId: PlayerId; attackerId: EntityId; targetId: EntityId }
    | { type: 'CAPTURE_CITY'; playerId: PlayerId; unitId: EntityId }
    | { type: 'RESEARCH_TECH'; playerId: PlayerId; techId: TechId }
    | { type: 'CONSTRUCT_IMPROVEMENT'; playerId: PlayerId; position: HexCoordinate; improvementId: string }
    | { type: 'TRAIN_UNIT'; playerId: PlayerId; cityId: EntityId; unitTypeId: UnitTypeId }
    | { type: 'END_TURN'; playerId: PlayerId };
