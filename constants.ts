import { GameConfig } from './types';

export const RESOURCE_ICONS: Record<string, string> = {
    fruit: '🍎',
    game: '🦌',
    ore: '💎',
    fish: '🐟'
};

// 3-Shade Palette for Isometric Faces
export const COLOR_PALETTE: Record<string, {top: string, left: string, right: string}> = {
    'Ground': { top: '#4ade80', left: '#22c55e', right: '#15803d' }, // green-400, green-500, green-700
    'Water': { top: '#60a5fa', left: '#3b82f6', right: '#1d4ed8' },   // blue-400, blue-500, blue-700
    'Mountain': { top: '#cbd5e1', left: '#94a3b8', right: '#64748b' }, // slate-300, slate-400, slate-500
    'Void': { top: 'transparent', left: 'transparent', right: 'transparent' },
    'SkyGround': { top: '#fcd34d', left: '#fbbf24', right: '#b45309' }, // amber-300, amber-400, amber-700
    'Cloud': { top: '#f1f5f9', left: '#e2e8f0', right: '#cbd5e1' }, // slate-100, slate-200, slate-300
};

export const DEFAULT_CONFIG: GameConfig = {
  map: {
    width: 10, 
    height: 10,
    noiseSeed: 12345, 
    gridType: 'HEX'
  },
  units: {
    city: {
      name: "City",
      symbol: "🏰",
      color: "#2563eb", // blue-600
      components: [
        { type: "CityStats", level: 1, population: 0 },
        { type: "Vision", range: 2 },
        { type: "Defense", value: 1 } 
      ]
    },
    warrior: {
      name: "Warrior",
      symbol: "⚔️",
      color: "#ef4444", // red-500
      components: [
        { type: "Health", max: 10, current: 10 },
        { type: "Movement", range: 1 },
        { type: "Attack", damage: 3, range: 1 },
        { type: "Defense", value: 2 },
        { type: "Vision", range: 1 },
        { type: "Cost", stars: 2 }
      ]
    },
    rider: {
      name: "Rider",
      symbol: "🐴",
      color: "#f97316", // orange-500
      components: [
        { type: "Health", max: 10, current: 10 },
        { type: "Movement", range: 2 },
        { type: "Attack", damage: 2, range: 1 },
        { type: "Defense", value: 1 },
        { type: "Vision", range: 1 },
        { type: "Cost", stars: 3 }
      ]
    },
    giant: {
      name: "Giant",
      symbol: "👺",
      color: "#9333ea", // purple-600
      components: [
        { type: "Health", max: 40, current: 40 },
        { type: "Movement", range: 1 },
        { type: "Attack", damage: 5, range: 1 },
        { type: "Defense", value: 4 },
        { type: "Vision", range: 1 },
        { type: "Trait", id: "Push" }
      ]
    },
    dragon: {
      name: "Dragon",
      symbol: "🐉",
      color: "#6b21a8", // purple-800
      components: [
        { type: "Health", max: 20, current: 20 },
        { type: "Movement", range: 3 },
        { type: "Attack", damage: 6, range: 2 },
        { type: "Defense", value: 3 },
        { type: "Vision", range: 3 },
        { type: "Flying" }, 
        { type: "Cost", stars: 8 }
      ]
    }
  },
  techs: {
    // Branch 1: Economy & Organization
    'org': { id: 'org', name: 'Organization', cost: 5, symbol: '📜', column: 0, row: 0, description: 'Base tech. Unlocks Markets.' },
    'shields': { id: 'shields', name: 'Shields', cost: 7, prerequisite: 'org', symbol: '🛡️', column: 1, row: 0, description: 'High defense units & City Walls.' },
    'farming': { id: 'farming', name: 'Farming', cost: 9, prerequisite: 'org', symbol: '🌾', column: 1, row: 1, description: 'Build Farms on crop tiles.' },
    'trade': { id: 'trade', name: 'Trade', cost: 12, prerequisite: 'farming', symbol: '⚖️', column: 2, row: 1, description: 'Unlocks Libraries & Roads.' },

    // Branch 2: Climbing & Mining
    'climb': { id: 'climb', name: 'Climbing', cost: 5, symbol: '🧗', column: 0, row: 2, description: 'Move on Mountains.' },
    'mining': { id: 'mining', name: 'Mining', cost: 7, prerequisite: 'climb', symbol: '⛏️', column: 1, row: 2, description: 'Extract gold from Ore.' },
    'smithery': { id: 'smithery', name: 'Smithery', cost: 9, prerequisite: 'mining', symbol: '⚔️', column: 2, row: 2, description: 'Unlocks Swordsmen.' },
    
    // Branch 3: Aeronautics (Sky)
    'aero': { id: 'aero', name: 'Aeronautics', cost: 15, prerequisite: 'smithery', symbol: '🎈', column: 3, row: 2, description: 'Vertical movement & Skyports.' },

    // Branch 4: Hunting & Forestry
    'hunt': { id: 'hunt', name: 'Hunting', cost: 5, symbol: '🏹', column: 0, row: 3, description: 'Harvest game.' },
    'archery': { id: 'archery', name: 'Archery', cost: 7, prerequisite: 'hunt', symbol: '🎯', column: 1, row: 3, description: 'Unlocks Archers.' },
    'forestry': { id: 'forestry', name: 'Forestry', cost: 7, prerequisite: 'hunt', symbol: '🌲', column: 1, row: 4, description: 'Build Lumber Huts.' },
    
    // Branch 5: Maritime
    'fish': { id: 'fish', name: 'Fishing', cost: 5, symbol: '🐟', column: 0, row: 5, description: 'Harvest fish.' },
    'sailing': { id: 'sailing', name: 'Sailing', cost: 7, prerequisite: 'fish', symbol: '⛵', column: 1, row: 5, description: 'Enter shallow water.' },
  },
  improvements: {
    'farm': {
      id: 'farm',
      name: 'Farm',
      symbol: '🌾',
      cost: 5,
      techRequired: 'farming',
      validTerrain: ['Ground'],
      populationBonus: 2,
      description: 'Provides food for the city.'
    },
    'mine': {
      id: 'mine',
      name: 'Mine',
      symbol: '⚒️',
      cost: 5,
      techRequired: 'mining',
      validTerrain: ['Mountain'],
      populationBonus: 2,
      description: 'Extracts value from mountains.'
    },
    'lumber_hut': {
      id: 'lumber_hut',
      name: 'Lumber Hut',
      symbol: '🛖',
      cost: 2,
      techRequired: 'forestry',
      validTerrain: ['Ground'],
      populationBonus: 1,
      description: 'Basic forestry operation.'
    },
    'beanstalk': {
      id: 'beanstalk',
      name: 'Beanstalk',
      symbol: '🌱',
      cost: 5,
      techRequired: 'farming', 
      validTerrain: ['Ground'], 
      populationBonus: 0,
      description: 'Grow a path to the Sky Layer.'
    }
  },
  buildings: {
      'market': {
          id: 'market',
          name: 'Market',
          symbol: '🏦',
          cost: 10,
          techRequired: 'org',
          description: '+2 Stars per turn.',
          stats: { income: 2 }
      },
      'wall': {
          id: 'wall',
          name: 'City Wall',
          symbol: '🏯',
          cost: 5,
          techRequired: 'shields',
          description: '+3 Defense to City.',
          stats: { defense: 3 }
      },
      'library': {
          id: 'library',
          name: 'Library',
          symbol: '🏺',
          cost: 15,
          techRequired: 'trade',
          description: '+3 Stars per turn.',
          stats: { income: 3 }
      },
      'skyport': {
          id: 'skyport',
          name: 'Skyport',
          symbol: '🛸',
          cost: 20,
          techRequired: 'aero',
          description: 'Allows constructing Air Units.',
          stats: { population: 2 }
      }
  }
};

export const JSON_SCHEMA_DOC = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PolytopiaLiteConfig",
  "type": "object",
  "properties": {
    "global": {
      "type": "object",
      "properties": {
        "baseStarIncome": { "type": "integer", "default": 5 },
        "maxTurnTime": { "type": "integer", "default": 0 }
      }
    },
    "techTree": {
      "type": "object",
      "description": "Dependency graph for techs",
      "patternProperties": {
        "^[a-zA-Z]+$": {
          "type": "object",
          "properties": {
            "cost": { "type": "integer" },
            "preRequisite": { "type": "string" },
            "unlocks": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },
    "tribes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "startTech": { "type": "string" },
          "color": { "type": "string" }
        }
      }
    },
    "improvements": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z]+$": {
          "type": "object",
          "properties": {
            "cost": { "type": "integer" },
            "techRequired": { "type": "string" },
            "validTerrain": { "type": "array", "items": { "type": "string" } },
            "populationBonus": { "type": "integer" }
          }
        }
      }
    }
  }
}`;

export const PYTHON_CLASS_STRUCTURE = `# 4X STRATEGY ARCHITECTURE (Polytopia-Style)
# Core Systems for Economy, Fog of War, and City Management

from typing import Dict, Set, List
from dataclasses import dataclass

# --- 1. ECONOMY SYSTEM ---

@dataclass
class TribeData:
    name: str
    stars: int = 5
    unlocked_techs: Set[str] = field(default_factory=set)
    cities: List['CityEntity'] = field(default_factory=list)

class EconomyManager:
    """
    Calculates income at the start of a turn.
    Formula: Base (5) + Sum(City.level) + Lighthouse_Bonus
    """
    def process_turn_start(self, tribe: TribeData):
        income = 5 # Base capital income
        for city in tribe.cities:
            income += city.get_component("CityStats").level
            
            # Custom buildings (e.g. Customs House)
            income += self.calculate_building_bonuses(city)
            
        tribe.stars += income
        return income

# --- 2. CITY SYSTEM (The "Base") ---

class CityComponent(Component):
    """
    Attached to a Tile Entity. Represents a settlement.
    """
    def __init__(self, owner_id: str):
        self.owner_id = owner_id
        self.level = 1
        self.population = 0
        self.max_population = 2 # Threshold for next level
        self.territory: Set[Tuple[int,int]] = set() # Coordinates owned
    
    def add_population(self, amount: int):
        self.population += amount
        if self.population >= self.max_population:
            self._level_up()
            
    def _level_up(self):
        self.population -= self.max_population
        self.level += 1
        self.max_population += 1 # Difficulty curve
        # Signal UI to show "Level Up Bonus" dialog (Explorer vs. Wall)
`;