import { GameConfig, Tile, Entity, TurnState, Visibility, PlayerState, ProductionItem } from '../types';

type EventCallback = (payload: any) => void;

const CITY_NAMES = ["Imperius", "Bardur", "Oumaji", "Kickoo", "Zebasi", "Ai-Mo", "Quetzali", "Yadakk", "Xin-Xi", "Luxidoor", "Vengir", "Elyrion", "Aquarion", "Polaris"];

export class WhiteboxEngine {
  // Grid is now 3D: [z][y][x]
  grid: Tile[][][] = [];
  entities: Entity[] = [];
  config: GameConfig;
  turnState: TurnState = TurnState.INPUT; 
  turnNumber: number = 1;
  currentTurnOwner: string = 'player';
  
  // State for all players
  players: Record<string, PlayerState>;
  
  // simple event bus
  listeners: Record<string, EventCallback[]> = {};

  constructor(config: GameConfig) {
    this.config = config;
    this.players = {
        'player': { stars: 10, income: 0, unlockedTechs: [] },
        'enemy_ai': { stars: 10, income: 0, unlockedTechs: [] }
    };
    this.generateGrid();
  }
  
  get playerState(): PlayerState { return this.players['player']; }
  get enemyState(): PlayerState { return this.players['enemy_ai']; }

  // --- Event System ---
  on(event: string, cb: EventCallback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  off(event: string, cb: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
  }

  emit(event: string, payload: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }

  // --- Grid & Map Gen ---

  generateGrid() {
    const { width, height, noiseSeed } = this.config.map;
    this.grid = [];
    this.entities = []; 
    
    // 1. Base Noise Function (Deterministic)
    const pseudoRandom = (x: number, y: number, z: number, seed: number) => {
        const dot = x * 12.9898 + y * 78.233 + z * 37.719 + seed;
        return Math.abs(Math.sin(dot) * 43758.5453) % 1;
    };

    // 2. Smoothing Helper (Box Blur)
    const smoothMap = (map: number[][]) => {
        const newMap = map.map(row => [...row]);
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                let sum = map[y][x];
                let count = 1;
                // Use generic 8-way for smoothing noise, regardless of hex/square
                const neighbors = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
                neighbors.forEach(([dx, dy]) => {
                    const nx = x + dx, ny = y + dy;
                    if(nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        sum += map[ny][nx];
                        count++;
                    }
                });
                newMap[y][x] = sum / count;
            }
        }
        return newMap;
    };

    const LAYERS = 2; // 0 = Surface, 1 = Sky

    // Initialize Grid
    for (let z = 0; z < LAYERS; z++) {
        const layer: Tile[][] = [];
        
        // A. Generate raw noise map
        let noiseMap: number[][] = [];
        for (let y = 0; y < height; y++) {
            const row: number[] = [];
            for (let x = 0; x < width; x++) {
                row.push(pseudoRandom(x, y, z, noiseSeed));
            }
            noiseMap.push(row);
        }

        // B. Smooth logic (Iterative)
        // Surface gets 2 passes for continents, Sky gets 0 for chaotic clouds/islands
        if (z === 0) {
            noiseMap = smoothMap(noiseMap);
            noiseMap = smoothMap(noiseMap);
        }

        // C. Apply Thresholds
        for (let y = 0; y < height; y++) {
          const row: Tile[] = [];
          for (let x = 0; x < width; x++) {
            let type: Tile['type'] = 'Void';
            const val = noiseMap[y][x];

            if (z === 0) {
                // Smoothed noise: > 0.5 is Land
                type = val > 0.48 ? 'Ground' : 'Water';
            } else {
                 // Sky is sparse
                 const noise = pseudoRandom(x, y, z, noiseSeed);
                 type = noise > 0.85 ? 'Ground' : 'Void';
            }
            row.push({ x, y, z, type, visibility: Visibility.HIDDEN, resource: undefined });
          }
          layer.push(row);
        }
        this.grid.push(layer);
    }

    // Cellular Automata Cleanup (Remove lone pixels)
    const z = 0;
    const iterations = 2;
    for (let i = 0; i < iterations; i++) {
        const newTypes = this.grid[z].map(row => row.map(t => t.type));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let groundNeighbors = 0;
                const neighbors = this.getNeighbors(x, y, z);
                neighbors.forEach(n => {
                    if (this.grid[z][n.y][n.x].type !== 'Water') groundNeighbors++;
                });
                
                if (this.grid[z][y][x].type === 'Water') {
                    if (groundNeighbors > 3) newTypes[y][x] = 'Ground'; 
                } else {
                    if (groundNeighbors < 2) newTypes[y][x] = 'Water'; 
                }
            }
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.grid[z][y][x].type = newTypes[y][x];
            }
        }
    }

    // Decorate Surface (Mountains, Resources)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = this.grid[0][y][x];
            const noise = pseudoRandom(x, y, 99, noiseSeed); 
            const resourceNoise = pseudoRandom(x, y, 101, noiseSeed);
            
            if (tile.type === 'Ground') {
                if (noise > 0.85) {
                    tile.type = 'Mountain';
                    // Chance for Ore in new mountains
                    if (resourceNoise > 0.6) tile.resource = 'ore';
                }
                else if (resourceNoise > 0.85) tile.resource = 'game';
                else if (resourceNoise > 0.70) tile.resource = 'fruit';
            } else if (tile.type === 'Water') {
                if (resourceNoise > 0.85) tile.resource = 'fish';
            }
        }
    }
    
    // Ensure center is land for Capital
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    this.clearLand(cx, cy, 0); // Self + neighbors
    
    this.createCity(cx, cy, 0, 'player');

    // Spawn Enemy AI Capital
    let ex = cx + 4;
    let ey = cy + 4;
    // Simple bounds check clamp
    if (ex >= width) ex = width - 2;
    if (ey >= height) ey = height - 2;
    
    this.clearLand(ex, ey, 0);
    this.createCity(ex, ey, 0, 'enemy_ai');

    this.calculateIncome('player');
    this.calculateIncome('enemy_ai');
    this.emit('GRID_GENERATED', { width, height, seed: noiseSeed });
  }

  ensureLand(x: number, y: number, z: number) {
      if (this.isValidCoordinate(x, y, z)) {
          this.grid[z][y][x].type = 'Ground';
      }
  }

  // Forces a 3x3 area to be flat ground
  clearLand(cx: number, cy: number, z: number) {
      for(let y = cy-1; y <= cy+1; y++) {
          for(let x = cx-1; x <= cx+1; x++) {
              if (this.isValidCoordinate(x, y, z)) {
                  this.grid[z][y][x].type = 'Ground';
                  this.grid[z][y][x].resource = undefined; // Clear resources for city site
              }
          }
      }
  }

  postProcessSkyLayer(width: number, height: number, seed: number) {
      // Sky layer uses simpler noise already
  }
  
  // Helper to safely update tile props
  setTile(x: number, y: number, z: number, props: Partial<Tile>) {
      if (!this.isValidCoordinate(x, y, z)) return;
      Object.assign(this.grid[z][y][x], props);
  }

  setTileType(x: number, y: number, z: number, type: Tile['type']) {
    if (!this.isValidCoordinate(x, y, z)) return;
    const tile = this.grid[z][y][x];
    if (tile.type !== type) {
      tile.type = type;
      this.emit('TILE_MODIFIED', { x, y, z, type });
    }
  }

  // --- 4X Mechanics: Cities & Economy ---

  createCity(x: number, y: number, z: number, ownerId: string) {
    const city = this.createEntity('city', x, y, z, true); 
    if (!city) return;

    city.ownerId = ownerId;
    city.name = CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
    city.productionQueue = [];
    city.buildings = []; // Initialize building list

    const territory = this.getTilesInRange(x, y, z, 1);
    
    territory.forEach(pos => {
      if (this.isValidCoordinate(pos.x, pos.y, z)) {
        const tile = this.grid[z][pos.y][pos.x];
        tile.ownerId = ownerId;
        tile.cityId = city.id; 
      }
    });
  }

  calculateIncome(ownerId: string) {
    let income = 5; 
    this.entities.forEach(e => {
       if (e.type === 'city' && e.ownerId === ownerId) {
         income += e.components['CityStats']?.level || 1;
         
         // Process Internal Buildings Income
         e.buildings?.forEach(bId => {
             const bDef = this.config.buildings[bId];
             if (bDef && bDef.stats.income) {
                 income += bDef.stats.income;
             }
         });
       }
    });
    if (this.players[ownerId]) {
        this.players[ownerId].income = income;
    }
  }

  processEconomy(ownerId: string) {
    this.calculateIncome(ownerId);
    if (this.players[ownerId]) {
        this.players[ownerId].stars += this.players[ownerId].income;
    }
    if (ownerId === 'player') {
        this.emit('ECONOMY_UPDATE', this.players['player']);
    }
  }

  // --- Tech System ---

  researchTech(techId: string): boolean {
    const tech = this.config.techs[techId];
    if (!tech) return false;
    
    const state = this.players['player'];

    if (state.unlockedTechs.includes(techId)) return false;
    if (tech.prerequisite && !state.unlockedTechs.includes(tech.prerequisite)) return false;
    if (state.stars < tech.cost) return false;

    state.stars -= tech.cost;
    state.unlockedTechs.push(techId);
    
    this.emit('ECONOMY_UPDATE', state);
    return true;
  }

  // --- Improvements & Construction ---

  constructImprovement(x: number, y: number, z: number, improvementId: string): boolean {
      if (!this.isValidCoordinate(x, y, z)) return false;
      const tile = this.grid[z][y][x];
      
      if (tile.ownerId !== 'player') return false; 
      if (tile.improvement) return false; 
      
      const def = this.config.improvements[improvementId];
      if (!def) return false;

      const state = this.players['player'];
      if (def.techRequired && !state.unlockedTechs.includes(def.techRequired)) return false;
      if (!def.validTerrain.includes(tile.type)) return false;
      if (state.stars < def.cost) return false;

      state.stars -= def.cost;
      tile.improvement = improvementId;
      
      if (def.populationBonus && tile.cityId) {
          const city = this.entities.find(e => e.id === tile.cityId);
          if (city) {
              this.addCityPopulation(city, def.populationBonus);
          }
      }

      this.emit('ECONOMY_UPDATE', state);
      this.emit('TILE_UPDATED', { x, y, z }); 
      return true;
  }

  addCityPopulation(city: Entity, amount: number) {
      const stats = city.components['CityStats'];
      if (!stats) return;

      stats.population += amount;
      const threshold = stats.level + 1; 

      if (stats.population >= threshold) {
          stats.population -= threshold;
          stats.level++;
          this.calculateIncome(city.ownerId || 'player'); 
          this.emit('CITY_UPDATED', city);
          if (city.ownerId === 'player') {
            this.emit('ECONOMY_UPDATE', this.players['player']);
          }
      }
      this.emit('CITY_UPDATED', city);
  }

  // --- City Production Queue ---

  enqueueProduction(cityId: string, itemKey: string, type: 'UNIT' | 'BUILDING'): boolean {
    const city = this.entities.find(e => e.id === cityId);
    if (!city) return false;
    
    const ownerId = city.ownerId || 'player';
    const state = this.players[ownerId];
    
    if (ownerId === 'player' && this.currentTurnOwner !== 'player') return false;
    
    // Check duplicates for buildings
    if (type === 'BUILDING' && city.buildings.includes(itemKey)) return false;
    if (type === 'BUILDING' && city.productionQueue.some(i => i.key === itemKey)) return false;

    let cost = 0;
    if (type === 'UNIT') {
        const def = this.config.units[itemKey];
        cost = def?.components.find(c => c.type === 'Cost')?.stars || 0;
    } else {
        const def = this.config.buildings[itemKey];
        cost = def?.cost || 0;
    }

    if (state.stars < cost) return false;

    state.stars -= cost;
    if (ownerId === 'player') this.emit('ECONOMY_UPDATE', state);

    const turns = 1; 
    const item: ProductionItem = {
        id: crypto.randomUUID(),
        key: itemKey,
        type,
        turnsRemaining: turns,
        totalTurns: turns
    };

    city.productionQueue.push(item);
    this.emit('CITY_UPDATED', city);
    return true;
  }

  processQueues(ownerId: string) {
      this.entities.forEach(entity => {
          if (entity.type === 'city' && entity.ownerId === ownerId && entity.productionQueue.length > 0) {
              const item = entity.productionQueue[0];
              
              if (item.turnsRemaining > 0) item.turnsRemaining--;

              if (item.turnsRemaining <= 0) {
                  let success = false;
                  if (item.type === 'UNIT') {
                       // Unit spawns at City Z level
                       const spawned = this.createEntity(item.key, entity.x, entity.y, entity.z, true, ownerId);
                       if (spawned) success = true;
                  } else if (item.type === 'BUILDING') {
                      // Construct Building
                      if (!entity.buildings) entity.buildings = [];
                      entity.buildings.push(item.key);
                      
                      // Apply Instant Effects
                      const bDef = this.config.buildings[item.key];
                      if (bDef && bDef.stats.population) {
                          this.addCityPopulation(entity, bDef.stats.population);
                      }
                      
                      success = true;
                  }

                  if (success) {
                      entity.productionQueue.shift(); 
                      this.emit('CITY_UPDATED', entity);
                  } 
              }
          }
      });
  }

  // --- Fog of War ---

  updateVisibility() {
    const visibleKeys = new Set<string>(); // Key format: "x,y,z"

    for (const entity of this.entities) {
      if (entity.ownerId !== 'player') continue;

      const visionRange = entity.components['Vision']?.range || (entity.type === 'city' ? 2 : 1);
      
      const tiles = this.getTilesInRange(entity.x, entity.y, entity.z, visionRange);
      for (const t of tiles) {
        visibleKeys.add(`${t.x},${t.y},${entity.z}`);
      }
    }

    let hasChanges = false;
    // Iterate all layers
    for (let z = 0; z < this.grid.length; z++) {
        for (let y = 0; y < this.config.map.height; y++) {
          for (let x = 0; x < this.config.map.width; x++) {
            const tile = this.grid[z][y][x];
            const key = `${x},${y},${z}`;
            const shouldBeVisible = visibleKeys.has(key);

            if (shouldBeVisible) {
              if (tile.visibility !== Visibility.VISIBLE) {
                tile.visibility = Visibility.VISIBLE;
                hasChanges = true;
              }
            } else {
              if (tile.visibility === Visibility.VISIBLE) {
                tile.visibility = Visibility.FOGGED;
                hasChanges = true;
              }
            }
          }
        }
    }

    if (hasChanges) {
      this.emit('FOG_UPDATE', {});
    }
  }

  // --- Entity System ---

  createEntity(unitKey: string, x: number, y: number, z: number, ignoreCost = false, ownerId = 'player'): Entity | null {
    if (!this.isValidCoordinate(x, y, z)) return null;

    if (unitKey !== 'city' && this.getUnitAt(x, y, z)) return null;

    const def = this.config.units[unitKey];
    if (!def) return null;

    const state = this.players[ownerId];
    const costComponent = def.components.find(c => c.type === 'Cost');
    const cost = costComponent ? costComponent.stars : 0;

    if (!ignoreCost && cost > 0) {
      if (state.stars < cost) return null; 
      state.stars -= cost;
      if (ownerId === 'player') this.emit('ECONOMY_UPDATE', state);
    }

    const newEntity: Entity = {
      id: crypto.randomUUID(),
      type: unitKey,
      x,
      y,
      z,
      components: {},
      ownerId,
      hasMoved: false,
      productionQueue: [],
      buildings: []
    };

    def.components.forEach(comp => {
      newEntity.components[comp.type] = { ...comp };
    });

    this.entities.push(newEntity);
    if (ownerId === 'player') this.updateVisibility();

    return newEntity;
  }

  // --- Combat Logic ---
  
  resolveCombat(attacker: Entity, defender: Entity) {
      const attStats = attacker.components['Attack'];
      const defStats = defender.components['Defense'];
      const defHealth = defender.components['Health'];
      
      if (!attStats || !defStats || !defHealth) return;

      let defenseValue = defStats.value || 0;
      
      // Check City Walls for Defender
      if (defender.type === 'city') {
          if (defender.buildings?.includes('wall')) {
              defenseValue += 3; // Hardcoded wall bonus for prototype
          }
      }
      
      const damage = Math.max(1, attStats.damage - defenseValue);
      defHealth.current -= damage;
      this.emit('COMBAT_LOG', { attacker, defender, damage, type: 'attack' });

      if (defHealth.current <= 0) {
          this.killEntity(defender.id);
          this.emit('COMBAT_LOG', { attacker, defender, type: 'death' });
          return;
      }

      // Retaliation
      // Fix: Use Hex distance logic if grid is HEX
      const dist = this.getDistance(attacker.x, attacker.y, defender.x, defender.y);
      if (attacker.z === defender.z && dist <= 1) { // Retaliation usually range 1
         const retStats = defender.components['Attack'];
         const attHealth = attacker.components['Health'];
         if (retStats && attHealth) {
             const retDamage = Math.max(1, retStats.damage - (attacker.components['Defense']?.value || 0));
             attHealth.current -= retDamage;
             this.emit('COMBAT_LOG', { attacker: defender, defender: attacker, damage: retDamage, type: 'retaliation' });

             if (attHealth.current <= 0) {
                this.killEntity(attacker.id);
                this.emit('COMBAT_LOG', { attacker: defender, defender: attacker, type: 'death' });
             }
         }
      }
  }

  killEntity(id: string) {
      const idx = this.entities.findIndex(e => e.id === id);
      if (idx !== -1) {
          this.entities.splice(idx, 1);
      }
      this.updateVisibility();
  }

  // --- Movement Logic ---

  getValidMoves(unit: Entity): {x: number, y: number, z: number, isAttack?: boolean}[] {
    if (unit.hasMoved) return [];
    
    const moveComp = unit.components['Movement'];
    if (!moveComp) return [];
    
    const range = moveComp.range;
    const results: {x: number, y: number, z: number, isAttack?: boolean}[] = [];
    const visited = new Set<string>();
    const queue: {x: number, y: number, z: number, dist: number}[] = [{x: unit.x, y: unit.y, z: unit.z, dist: 0}];
    
    visited.add(`${unit.x},${unit.y},${unit.z}`);

    const canFly = !!unit.components['Flying'];

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      
      // Vertical Transitions Logic
      const currentTile = this.grid[current.z][current.y][current.x];
      const hasBeanstalk = currentTile.improvement === 'beanstalk';
      
      if (current.dist < range) {
         const zOffsets = [];
         if (hasBeanstalk || canFly) {
             if (current.z < this.grid.length - 1) zOffsets.push(1); // Up
             if (current.z > 0) zOffsets.push(-1); // Down
         }

         for (const dz of zOffsets) {
             const targetZ = current.z + dz;
             const key = `${current.x},${current.y},${targetZ}`;
             if (!visited.has(key)) {
                 const targetTile = this.grid[targetZ][current.y][current.x];
                 const isPassable = targetTile.type !== 'Void';
                 if (isPassable) {
                     visited.add(key);
                     results.push({ x: current.x, y: current.y, z: targetZ });
                     queue.push({ x: current.x, y: current.y, z: targetZ, dist: current.dist + 1 });
                 }
             }
         }
      }

      // Horizontal Neighbors
      if (current.dist >= range) continue;

      const neighbors = this.getNeighbors(current.x, current.y, current.z);
      for (const n of neighbors) {
        const key = `${n.x},${n.y},${current.z}`;
        if (!visited.has(key)) {
          const tile = this.grid[current.z][n.y][n.x];
          
          const isVoid = tile.type === 'Void';
          const isMountain = tile.type === 'Mountain';
          const isWater = tile.type === 'Water';

          let isPassable = !isVoid;
          
          if (!canFly) {
              if (isMountain) {
                   const hasClimb = unit.ownerId === 'player' && this.players['player'].unlockedTechs.includes('climb');
                   if (!hasClimb) isPassable = false;
              }
              if (isWater) {
                   isPassable = false;
              }
          } else {
              isPassable = true;
          }

          if (isPassable) {
              const unitAtTile = this.getUnitAt(n.x, n.y, current.z);
              const isFriendlyObstructed = unitAtTile && unitAtTile.ownerId === unit.ownerId;
              const isEnemy = unitAtTile && unitAtTile.ownerId !== unit.ownerId;

              if (!isFriendlyObstructed) {
                visited.add(key);
                if (isEnemy) {
                    results.push({ x: n.x, y: n.y, z: current.z, isAttack: true });
                } else {
                    results.push({ x: n.x, y: n.y, z: current.z });
                    queue.push({x: n.x, y: n.y, z: current.z, dist: current.dist + 1});
                }
              }
          }
        }
      }
    }
    return results;
  }

  moveUnit(unitId: string, x: number, y: number): boolean {
    return this.moveUnitTo(unitId, x, y, 0);
  }

  moveUnitTo(unitId: string, x: number, y: number, z: number): boolean {
    const unit = this.entities.find(e => e.id === unitId);
    if (!unit) return false;
    
    if (unit.ownerId !== this.currentTurnOwner) return false;

    const validMoves = this.getValidMoves(unit);
    const targetMove = validMoves.find(m => m.x === x && m.y === y && m.z === z);
    
    if (!targetMove) return false;

    const enemy = this.getUnitAt(x, y, z);
    if (enemy && enemy.ownerId !== unit.ownerId) {
        this.resolveCombat(unit, enemy);
        unit.hasMoved = true;
        this.emit('ENTITY_MOVED', { unit, x, y, z, type: 'combat' });
        return true;
    }

    unit.x = x;
    unit.y = y;
    unit.z = z;
    unit.hasMoved = true;

    // Capture City
    const city = this.getCityAt(x, y, z);
    if (city && city.ownerId !== unit.ownerId) {
        const previousOwner = city.ownerId;
        city.ownerId = unit.ownerId;
        const territory = this.getTilesInRange(x, y, z, 1);
        territory.forEach(pos => {
             if (this.isValidCoordinate(pos.x, pos.y, z)) {
                this.grid[z][pos.y][pos.x].ownerId = unit.ownerId;
             }
        });
        this.emit('CITY_UPDATED', city);
        
        // Update vision if player gained or lost a city
        if (unit.ownerId === 'player' || previousOwner === 'player') {
             this.updateVisibility();
        }
    }

    if (unit.ownerId === 'player') this.updateVisibility();
    this.emit('ENTITY_MOVED', { unit, x, y, z, type: 'move' });
    
    return true;
  }

  // --- Turn System ---

  async endTurn() {
    const current = this.currentTurnOwner;
    this.processEconomy(current);
    this.processQueues(current);
    this.entities.filter(e => e.ownerId === current).forEach(e => e.hasMoved = false);

    this.currentTurnOwner = current === 'player' ? 'enemy_ai' : 'player';

    if (this.currentTurnOwner === 'player') {
        this.turnNumber++;
    }
    
    this.turnState = TurnState.INPUT;
    this.emit('TURN_CHANGED', { turn: this.turnNumber, owner: this.currentTurnOwner });

    if (this.currentTurnOwner === 'enemy_ai') {
        await this.processAiTurn();
    }
  }

  // --- AI System ---
  
  async processAiTurn() {
     await new Promise(r => setTimeout(r, 800));

     // A. Production
     const myCities = this.entities.filter(e => e.type === 'city' && e.ownerId === 'enemy_ai');
     for (const city of myCities) {
         if (this.enemyState.stars >= 2) {
             if (Math.random() > 0.5) {
                 this.enqueueProduction(city.id, 'warrior', 'UNIT');
                 this.emit('CITY_UPDATED', city);
             }
         }
     }

     // B. Unit Actions
     const myUnits = this.entities.filter(e => e.type !== 'city' && e.ownerId === 'enemy_ai');
     for (const unit of myUnits) {
         await new Promise(r => setTimeout(r, 400));
         
         const moves = this.getValidMoves(unit);
         if (moves.length === 0) continue;

         // AI Logic
         const attacks = moves.filter(m => m.isAttack);
         if (attacks.length > 0) {
             const target = attacks[0];
             this.moveUnitTo(unit.id, target.x, target.y, target.z);
             continue;
         }

         const playerCities = this.entities.filter(e => e.type === 'city' && e.ownerId === 'player' && e.z === unit.z);
         if (playerCities.length > 0) {
             const targetCity = playerCities[0];
             let bestMove = moves[0];
             let minDist = 999;
             for (const m of moves) {
                 // Use hex distance
                 const d = this.getDistance(m.x, m.y, targetCity.x, targetCity.y);
                 if (d < minDist) {
                     minDist = d;
                     bestMove = m;
                 }
             }
             this.moveUnitTo(unit.id, bestMove.x, bestMove.y, bestMove.z);
             continue;
         }

         const randomMove = moves[Math.floor(Math.random() * moves.length)];
         this.moveUnitTo(unit.id, randomMove.x, randomMove.y, randomMove.z);
     }
     
     await new Promise(r => setTimeout(r, 500));
     this.endTurn();
  }

  // --- Helpers ---
  isValidCoordinate(x: number, y: number, z: number): boolean { 
      return z >= 0 && z < this.grid.length && y >= 0 && y < this.config.map.height && x >= 0 && x < this.config.map.width; 
  }
  
  getEntityAt(x: number, y: number, z: number): Entity | undefined { return this.entities.find(e => e.x === x && e.y === y && e.z === z); }
  getUnitAt(x: number, y: number, z: number): Entity | undefined { return this.entities.find(e => e.x === x && e.y === y && e.z === z && e.type !== 'city'); }
  getCityAt(x: number, y: number, z: number): Entity | undefined { return this.entities.find(e => e.x === x && e.y === y && e.z === z && e.type === 'city'); }
  
  getTilesInRange(startX: number, startY: number, startZ: number, range: number): {x: number, y: number}[] {
    const results: {x: number, y: number}[] = [];
    const visited = new Set<string>();
    const queue: {x: number, y: number, dist: number}[] = [{x: startX, y: startY, dist: 0}];
    visited.add(`${startX},${startY}`);
    results.push({x: startX, y: startY});
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      if (current.dist >= range) continue;
      const neighbors = this.getNeighbors(current.x, current.y, startZ);
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          results.push(n);
          queue.push({x: n.x, y: n.y, dist: current.dist + 1});
        }
      }
    }
    return results;
  }
  
  getNeighbors(x: number, y: number, z: number): {x: number, y: number}[] {
    const neighbors: {x: number, y: number}[] = [];
    let offsets: number[][];
    if (this.config.map.gridType === 'SQUARE') { 
        offsets = [[0, 1], [0, -1], [1, 0], [-1, 0]]; 
    } else { 
        // Hexagon Odd-r Offset coordinates
        const parity = y & 1; // 0 if even, 1 if odd
        offsets = [
            [1, 0],   // East
            [-1, 0],  // West
            [0, -1],  // North West (Odd) or North East (Even) ? No, depends on offset
            [0, 1],   // South West (Odd) or South East (Even) ?
            // The specific odd-r offsets:
            // Odd row (y%2==1): (x+1, y), (x-1, y), (x, y-1), (x+1, y-1), (x, y+1), (x+1, y+1)
            // Even row (y%2==0): (x+1, y), (x-1, y), (x-1, y-1), (x, y-1), (x-1, y+1), (x, y+1)
        ];
        // Correct implementation for Odd-r:
        if (parity === 1) {
            offsets = [[1,0], [-1,0], [0,-1], [1,-1], [0,1], [1,1]];
        } else {
            offsets = [[1,0], [-1,0], [-1,-1], [0,-1], [-1,1], [0,1]];
        }
    }
    
    for (const [dx, dy] of offsets) { 
        const nx = x + dx; 
        const ny = y + dy; 
        if (this.isValidCoordinate(nx, ny, z)) neighbors.push({x: nx, y: ny}); 
    }
    return neighbors;
  }

  getDistance(x1: number, y1: number, x2: number, y2: number): number {
      if (this.config.map.gridType === 'SQUARE') {
          return Math.abs(x1 - x2) + Math.abs(y1 - y2);
      } else {
          // Convert Odd-r offset to Cube coordinates
          const q1 = x1 - (y1 - (y1 & 1)) / 2;
          const r1 = y1;
          const s1 = -q1 - r1;

          const q2 = x2 - (y2 - (y2 & 1)) / 2;
          const r2 = y2;
          const s2 = -q2 - r2;

          return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
      }
  }
}