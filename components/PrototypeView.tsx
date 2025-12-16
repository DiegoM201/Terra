import React, { useState, useEffect, CSSProperties, useRef, useCallback, useMemo } from 'react';
import { WhiteboxEngine } from '../services/engine';
import { GameConfig, TurnState, Entity, Tile, Visibility, UnitDefinition } from '../types';
import { DEFAULT_CONFIG, RESOURCE_ICONS, COLOR_PALETTE } from '../constants';
import { loadNations } from '../services/nations';

// --- HEXAGONAL GEOMETRY CONFIGURATION ---
const HEX_METRICS = {
    SIZE: 32, // Outer radius (center to corner)
    get WIDTH() { return Math.sqrt(3) * this.SIZE; }, // ~55.42px
    get HEIGHT() { return 2 * this.SIZE; }, // 64px
    get HORIZ_SPACING() { return this.WIDTH; },
    get VERT_SPACING() { return this.HEIGHT * 0.75; }, // 3/4 height overlap
    EXTRUSION: 16
};

// --- PROCEDURAL UNIT ASSETS ---

const WarriorUnit = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ filter: 'drop-shadow(0px 4px 2px rgba(0,0,0,0.5))' }}>
        {/* Body */}
        <path d="M50 20 C 30 20, 20 45, 20 65 L 20 90 L 80 90 L 80 65 C 80 45, 70 20, 50 20" fill={color} stroke="white" strokeWidth="3" />
        {/* Helmet/Head */}
        <circle cx="50" cy="30" r="15" fill="#e5e7eb" stroke="black" strokeWidth="1" />
        <rect x="42" y="25" width="16" height="4" fill="#374151" />
        {/* Sword */}
        <path d="M85 30 L 70 80 L 75 80 L 90 30 Z" fill="#9ca3af" stroke="black" strokeWidth="1" transform="rotate(-15, 80, 80)" />
        <line x1="82" y1="75" x2="68" y2="78" stroke="#4b5563" strokeWidth="3" transform="rotate(-15, 80, 80)" />
        {/* Shield */}
        <circle cx="35" cy="60" r="18" fill={color} stroke="#fcd34d" strokeWidth="3" />
        <circle cx="35" cy="60" r="5" fill="#fcd34d" />
    </svg>
);

const RiderUnit = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ filter: 'drop-shadow(0px 4px 2px rgba(0,0,0,0.5))' }}>
        {/* Horse Body */}
        <path d="M20 70 Q 20 50 40 40 L 60 35 L 75 20 L 85 25 L 80 45 L 60 55 L 70 90 L 50 90 L 40 65 L 30 90 L 10 90 Z" fill="#78350f" stroke="black" strokeWidth="2" />
        {/* Rider */}
        <circle cx="50" cy="30" r="12" fill={color} stroke="white" strokeWidth="2" />
        {/* Lance */}
        <line x1="55" y1="35" x2="90" y2="10" stroke="#cbd5e1" strokeWidth="3" />
    </svg>
);

const GiantUnit = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ filter: 'drop-shadow(0px 4px 2px rgba(0,0,0,0.5))' }}>
        {/* Bulky Body */}
        <path d="M50 10 C 20 10, 10 40, 10 70 L 15 95 L 85 95 L 90 70 C 90 40, 80 10, 50 10" fill={color} stroke="black" strokeWidth="3" />
        {/* Face */}
        <rect x="35" y="30" width="30" height="20" rx="5" fill="#fca5a5" stroke="black" strokeWidth="1" />
        <circle cx="42" cy="38" r="2" fill="black" />
        <circle cx="58" cy="38" r="2" fill="black" />
        {/* Club */}
        <path d="M80 50 Q 95 20 90 10 Q 80 10 70 40 Z" fill="#573618" stroke="black" strokeWidth="2" />
    </svg>
);

const DragonUnit = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ filter: 'drop-shadow(0px 4px 2px rgba(0,0,0,0.5))' }}>
        {/* Wings */}
        <path d="M50 50 Q 10 10 5 40 Q 20 50 50 60 Z" fill="#a855f7" opacity="0.8" />
        <path d="M50 50 Q 90 10 95 40 Q 80 50 50 60 Z" fill="#a855f7" opacity="0.8" />
        {/* Body */}
        <path d="M50 20 Q 60 40 50 80 L 40 90 L 60 90 L 50 80 Q 40 40 50 20" fill={color} stroke="white" strokeWidth="2" />
        {/* Head */}
        <path d="M45 25 L 50 10 L 55 25 Z" fill={color} stroke="white" strokeWidth="1" />
    </svg>
);

const MeepleUnit = ({ color }: { color: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ filter: 'drop-shadow(0px 4px 2px rgba(0,0,0,0.5))' }}>
        <path d="M50 15 C 30 15, 20 40, 20 60 L 20 90 L 80 90 L 80 60 C 80 40, 70 15, 50 15" fill={color} stroke="white" strokeWidth="3" />
        <circle cx="50" cy="30" r="15" fill="#ffe4c4" stroke="black" strokeWidth="1" />
    </svg>
);

const UnitRenderer = React.memo(({ type, color }: { type: string, color: string }) => {
    switch(type) {
        case 'warrior': return <WarriorUnit color={color} />;
        case 'rider': return <RiderUnit color={color} />;
        case 'giant': return <GiantUnit color={color} />;
        case 'dragon': return <DragonUnit color={color} />;
        default: return <MeepleUnit color={color} />;
    }
});

const CityStructure = React.memo(({ color, level }: { color: string, level: number }) => (
    <div className="relative w-full h-full flex items-end justify-center pb-1">
        <div className="flex flex-col items-center">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px]" style={{ borderBottomColor: color }}></div>
            {Array.from({length: level}).map((_, i) => (
                <div key={i} className="w-6 h-5 bg-gray-200 border border-gray-400 shadow-sm relative z-10 flex items-center justify-center">
                    <div className="w-1.5 h-2.5 bg-black/50"></div>
                </div>
            ))}
        </div>
    </div>
));

// --- COORDINATE SYSTEM ---
const getHexPosition = (col: number, row: number, z: number) => {
    const offset = (row % 2) * 0.5;
    const x = (col + offset) * HEX_METRICS.WIDTH;
    const y = row * HEX_METRICS.VERT_SPACING;
    const zOffset = z * -150;
    return { x, y: y + zOffset };
};

// --- OPTIMIZED TILE COMPONENT ---
interface HexTileProps {
    tile: Tile;
    layerIndex: number;
    entity?: Entity;
    structure?: Entity;
    isValidMove: boolean;
    isAttack: boolean;
    isSelected: boolean;
    isTileSelected: boolean;
    isInteractive: boolean;
    debugFogEnabled: boolean;
    visibility: Visibility; // Explicit prop for Memo check
    onClick: (x: number, y: number, z: number, e: React.MouseEvent) => void;
}

const HexTile = React.memo(({ 
    tile, layerIndex, entity, structure, 
    isValidMove, isAttack, isSelected, isTileSelected, 
    isInteractive, debugFogEnabled, visibility, onClick 
}: HexTileProps) => {
    
    // Position calculation is now relative to the map container (0,0), not screen
    const pos = getHexPosition(tile.x, tile.y, layerIndex);
    const zIndex = (tile.y * 100) + tile.x + (layerIndex * 10000);
    
    // We assume Void tiles are filtered out by parent

    const visualEntity = entity || structure;
    const unitDef = visualEntity ? DEFAULT_CONFIG.units[visualEntity.type] : null;

    const isOwned = tile.ownerId !== undefined;
    const isPlayerOwned = tile.ownerId === 'player';
    
    // Debug Fog Logic: Use the Prop, not the Object
    let isHidden = visibility === Visibility.HIDDEN;
    let isFogged = visibility === Visibility.FOGGED;
    
    if (!debugFogEnabled) {
        isHidden = false;
        isFogged = false;
    }

    let paletteKey = (layerIndex === 1 && tile.type === 'Ground') ? 'SkyGround' : tile.type;
    if (isHidden) paletteKey = 'Cloud';

    const colors = COLOR_PALETTE[paletteKey] || COLOR_PALETTE['Ground'];

    const isMountain = tile.type === 'Mountain';
    const isWater = tile.type === 'Water';
    
    const extrusion = (isMountain && !isHidden) ? HEX_METRICS.EXTRUSION * 1.5 : ((isWater && !isHidden) ? 4 : HEX_METRICS.EXTRUSION);
    const cloudOffset = isHidden ? -16 : 0; 
    
    const opacity = isFogged ? 0.6 : 1;
    const grayscale = isFogged ? 'grayscale(80%)' : 'none';

    // Memoize the click handler to avoid passing a new arrow function every render if possible
    // However, since we need to stopPropagation, we wrap it here. 
    // Optimization: The parent passes the same 'onClick' reference, so this is cheap.
    const handleClick = (e: React.MouseEvent) => {
         e.stopPropagation(); 
         if (isInteractive) onClick(tile.x, tile.y, tile.z, e);
    };

    return (
        <div 
            onClick={handleClick} 
            style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: zIndex,
                width: `${HEX_METRICS.WIDTH}px`,
                height: `${HEX_METRICS.HEIGHT + extrusion}px`, 
                cursor: (isInteractive && !isHidden) ? 'pointer' : 'default',
                transition: 'transform 0.1s', // Faster transition
                transform: (isSelected || isTileSelected) ? 'translateY(-8px)' : `translateY(${cloudOffset}px)`,
                filter: grayscale,
                opacity: opacity
            }}
        >
                {/* TOP FACE */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: HEX_METRICS.WIDTH,
                    height: HEX_METRICS.HEIGHT,
                    backgroundColor: colors.top,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    zIndex: 10
                }}>
                {isOwned && !isHidden && (
                    <div className={`absolute inset-0 border-[6px] opacity-40 ${isPlayerOwned ? 'border-blue-300' : 'border-red-500'}`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                )}
                {(isSelected || isTileSelected) && (
                    <div className="absolute inset-0 border-[4px] border-yellow-300 animate-pulse z-20" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                )}
                </div>

                {/* EXTRUSION */}
                <div style={{
                    position: 'absolute',
                    top: extrusion, 
                    left: 0,
                    width: HEX_METRICS.WIDTH,
                    height: HEX_METRICS.HEIGHT,
                    backgroundColor: colors.right,
                    clipPath: 'polygon(50% 100%, 100% 75%, 100% 25%, 50% 50%, 0% 25%, 0% 75%)', 
                    zIndex: 4,
                    filter: 'brightness(0.7)'
                }}></div>
                
                {/* DECOR / UNITS */}
                {!isHidden && (
                <div className="absolute w-full h-full flex justify-center items-center pointer-events-none z-20" style={{ top: -extrusion }}>
                        {isValidMove && !isAttack && (
                            <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse mt-8 shadow-[0_0_10px_#34d399] z-50"></div>
                        )}
                        {isValidMove && isAttack && (
                            <div className="w-10 h-10 border-4 border-red-500 rounded-full animate-ping opacity-40 mt-8 z-50"></div>
                        )}

                        {tile.resource && !visualEntity && (
                            <div className="text-2xl mt-4 drop-shadow-md">{RESOURCE_ICONS[tile.resource]}</div>
                        )}
                        {tile.improvement && !visualEntity && (
                            <div className="text-2xl mt-4 drop-shadow-md">{DEFAULT_CONFIG.improvements[tile.improvement].symbol}</div>
                        )}

                        {structure && (
                            <div className="w-16 h-20 mt-[-10px]">
                                <CityStructure color={unitDef?.color || '#ccc'} level={structure.components['CityStats']?.level || 1} />
                            </div>
                        )}

                        {/* Show Units if VISIBLE. If FOGGED, units are hidden unless they are static structures which handled above */}
                        {entity && unitDef && !isFogged && (
                            <div className="w-12 h-12 mt-0 relative hover:scale-110 transition-transform origin-bottom">
                                <UnitRenderer type={entity.type} color={unitDef.color} />
                                <div className="absolute -top-2 left-2 w-8 h-1 bg-gray-700 border border-black">
                                    <div className="h-full bg-green-500" style={{ width: `${(entity.components['Health']?.current / entity.components['Health']?.max) * 100}%`}}></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
});

export const PrototypeView: React.FC = () => {
  const [engine, setEngine] = useState<WhiteboxEngine>(() => new WhiteboxEngine(DEFAULT_CONFIG));
    const [nations, setNations] = useState<Record<string, any>>({});
  const [turnNumber, setTurnNumber] = useState(1);
  const [currentOwner, setCurrentOwner] = useState('player');
  const [playerState, setPlayerState] = useState(engine.playerState);
  const [entities, setEntities] = useState<Entity[]>(engine.entities);
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedTilePos, setSelectedTilePos] = useState<{x: number, y: number, z: number} | null>(null);
  const [validMoves, setValidMoves] = useState<{x: number, y: number, z: number, isAttack?: boolean}[]>([]);
  
  const [logs, setLogs] = useState<string[]>(['System initialized.', 'Capital City founded.']);
  const [showTechTree, setShowTechTree] = useState(false);
  const [viewLayer, setViewLayer] = useState(0); 
  const [, forceUpdate] = useState({});
  const [cityTab, setCityTab] = useState<'units' | 'buildings' | 'queue'>('units');
  const [debugFogEnabled, setDebugFogEnabled] = useState(true);

  // --- CAMERA STATE ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Center camera initially or when map size changes
  useEffect(() => {
      if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          const mapWidth = (engine.config.map.width * HEX_METRICS.WIDTH);
          const mapHeight = (engine.config.map.height * HEX_METRICS.VERT_SPACING);
          
          setCamera({
              x: (clientWidth / 2) - (mapWidth / 2),
              y: (clientHeight / 2) - (mapHeight / 2),
              zoom: 1
          });
      }
  }, [engine, engine.config.map.width, engine.config.map.height]);

  // --- CAMERA INPUT HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
      const scaleSpeed = 0.001;
      const newZoom = Math.min(Math.max(0.2, camera.zoom - e.deltaY * scaleSpeed), 3.0);
      setCamera(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- PERFORMANCE: MEMOIZED LOOKUPS ---

  // 1. Map of Entities (O(1) access inside render loop)
  const unitMap = useMemo(() => {
    const map = new Map<string, Entity>();
    entities.forEach(e => {
        if (e.type !== 'city') map.set(`${e.x},${e.y},${e.z}`, e);
    });
    return map;
  }, [entities]);

  const structureMap = useMemo(() => {
      const map = new Map<string, Entity>();
      entities.forEach(e => {
          if (e.type === 'city') map.set(`${e.x},${e.y},${e.z}`, e);
      });
      return map;
  }, [entities]);

  // 2. Set of Valid Moves (O(1) access inside render loop)
  const validMoveMap = useMemo(() => {
      const map = new Map<string, {x: number, y: number, z: number, isAttack?: boolean}>();
      validMoves.forEach(m => {
          map.set(`${m.x},${m.y},${m.z}`, m);
      });
      return map;
  }, [validMoves]);

  // 3. Flattened and Sorted Tiles (Avoids Array.flat().sort() every frame)
  // We compute this only when the grid itself changes (Regen/Init), not on hover/selection
  const visibleTiles = useMemo(() => {
      const layers = [0, 1]; // Supports z0 and z1
      const result: Record<number, Tile[]> = {0: [], 1: []};
      
      layers.forEach(z => {
          // Filter out Void tiles immediately
          const flat = engine.grid[z].flat().filter(t => t.type !== 'Void');
          // Sort for Painter's Algorithm (Y asc, X asc)
          flat.sort((a, b) => (a.y - b.y) || (a.x - b.x));
          result[z] = flat;
      });
      return result;
  }, [engine.grid]); // Dependency is the raw grid array

  const addLog = (msg: string) => {
    setLogs(prev => [`[T${engine.turnNumber}] ${msg}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
      // Load nation definitions and apply the first one as default
      loadNations().then(loaded => {
          setNations(loaded || {});
          const keys = Object.keys(loaded || {});
          if (keys.length > 0) {
              // apply first nation automatically
              const nation = loaded[keys[0]];
              applyNationToEngine(nation);
          }
      }).catch(() => {});

    const onGridGenerated = (payload: any) => {

          // Apply a nation JSON into the engine: stars, unlocked techs, spawn starting units
          const applyNationToEngine = (nation: any) => {
            if (!nation) return;
            // Apply starting stars
            if (typeof nation.startingStars === 'number') {
                engine.players['player'].stars = nation.startingStars;
                engine.emit('ECONOMY_UPDATE', engine.players['player']);
            }

            // Apply startTechs
            if (Array.isArray(nation.startTechs)) {
                engine.players['player'].unlockedTechs = Array.from(new Set([...(engine.players['player'].unlockedTechs || []), ...nation.startTechs]));
                engine.emit('ECONOMY_UPDATE', engine.players['player']);
            }

            // Find player's capital (created at grid generation). If not found, skip unit spawns.
            const capital = engine.entities.find(e => e.type === 'city' && e.ownerId === 'player');

            (nation.startingUnits || []).forEach((unit: any) => {
                let tx = capital ? capital.x : 0;
                let ty = capital ? capital.y : 0;
                let tz = capital ? capital.z : 0;

                if (unit.spawnNearCapital && capital) {
                    // find first neighbor tile that is passable and not occupied
                    const neighbors = engine.getNeighbors(tx, ty, tz);
                    let placed = false;
                    for (const n of neighbors) {
                        const occ = engine.getUnitAt(n.x, n.y, tz);
                        if (!occ && engine.isValidCoordinate(n.x, n.y, tz) && engine.grid[tz][n.y][n.x].type !== 'Void') {
                            engine.createEntity(unit.type, n.x, n.y, tz, true, 'player');
                            placed = true;
                            break;
                        }
                    }
                    if (!placed && capital) {
                        engine.createEntity(unit.type, tx, ty, tz, true, 'player');
                    }
                } else if (typeof unit.x === 'number' && typeof unit.y === 'number') {
                    // Treat as relative offsets from capital if capital exists, otherwise absolute
                    if (capital) {
                        tx = capital.x + unit.x;
                        ty = capital.y + unit.y;
                        tz = (typeof unit.z === 'number') ? (capital.z + unit.z) : capital.z;
                    } else {
                        tx = unit.x;
                        ty = unit.y;
                        tz = unit.z || 0;
                    }
                    if (engine.isValidCoordinate(tx, ty, tz)) engine.createEntity(unit.type, tx, ty, tz, true, 'player');
                }
            });

            // notify UI to update
            setEntities([...engine.entities]);
            setPlayerState({...engine.playerState});
            engine.triggerVisibilityUpdate();
          };
        addLog(`EVENT: Grid Generated (Seed: ${payload.seed}, Size: ${payload.width}x${payload.height})`);
        setEntities([...engine.entities]);
        setPlayerState({...engine.playerState});
        deselectAll();
        forceUpdate({});
    };

    const onEconomyUpdate = (state: any) => {
        if (state === engine.playerState) setPlayerState({...state});
    };

    const onTurnChanged = (payload: any) => {
        setTurnNumber(payload.turn);
        setCurrentOwner(payload.owner);
        deselectAll();
        if (payload.owner === 'player') addLog("Your Turn.");
        else addLog("Enemy Turn...");
        forceUpdate({}); 
    };

    const onFogUpdate = () => forceUpdate({});
    const onEntityMoved = () => forceUpdate({});
    const onCityUpdated = () => forceUpdate({});
    const onTileUpdated = () => forceUpdate({});
    const onCombatLog = (payload: any) => {
        if (payload.type === 'attack') addLog(`⚔️ ${payload.attacker.type} hit ${payload.defender.type} for ${payload.damage} dmg!`);
        else if (payload.type === 'retaliation') addLog(`🛡️ ${payload.attacker.type} retaliated for ${payload.damage} dmg!`);
        else if (payload.type === 'death') {
             addLog(`💀 ${payload.defender.type} was destroyed!`);
             setEntities([...engine.entities]); 
             if (selectedEntityId === payload.defender.id) deselectAll();
        }
    };

    engine.on('GRID_GENERATED', onGridGenerated);
    engine.on('ECONOMY_UPDATE', onEconomyUpdate);
    engine.on('TURN_CHANGED', onTurnChanged);
    engine.on('FOG_UPDATE', onFogUpdate);
    engine.on('ENTITY_MOVED', onEntityMoved);
    engine.on('CITY_UPDATED', onCityUpdated);
    engine.on('TILE_UPDATED', onTileUpdated);
    engine.on('COMBAT_LOG', onCombatLog);

    return () => {
        engine.off('GRID_GENERATED', onGridGenerated);
        engine.off('ECONOMY_UPDATE', onEconomyUpdate);
        engine.off('TURN_CHANGED', onTurnChanged);
        engine.off('FOG_UPDATE', onFogUpdate);
        engine.off('ENTITY_MOVED', onEntityMoved);
        engine.off('CITY_UPDATED', onCityUpdated);
        engine.off('TILE_UPDATED', onTileUpdated);
        engine.off('COMBAT_LOG', onCombatLog);
    };
  }, [engine, selectedEntityId]);

  const deselectAll = () => {
      setSelectedEntityId(null);
      setValidMoves([]);
      setSelectedCityId(null);
      setSelectedTilePos(null);
      setCityTab('units');
  }

  // Memoized Handler for Tile Clicks
  const handleTileClick = useCallback((x: number, y: number, z: number, e: React.MouseEvent) => {
    if (showTechTree) return;
    if (currentOwner !== 'player') return;

    const tile = engine.grid[z][y][x];
    
    // Debug Fog check
    if (!debugFogEnabled) {
       // Allow click
    } else {
        if (tile.visibility === Visibility.HIDDEN) return; 
        if (tile.visibility !== Visibility.VISIBLE) {
            addLog("Cannot target into Fog.");
            return;
        }
    }
    
    if (tile.type === 'Void' && !selectedEntityId) return;

    const clickedUnit = engine.getUnitAt(x, y, z);
    const clickedCity = engine.getCityAt(x, y, z);

    if (selectedEntityId) {
       // Optimized lookup using the generic getValidMoves which returns Array, 
       // but here we check against our local state.
       const targetMove = validMoves.find(vm => vm.x === x && vm.y === y && vm.z === z);
       if (targetMove) {
          engine.moveUnitTo(selectedEntityId, x, y, z);
          deselectAll();
          return;
       } 
       if (clickedUnit && clickedUnit.ownerId === 'player' && clickedUnit.id !== selectedEntityId) {
          selectUnit(clickedUnit);
          return;
       }
       if (!clickedUnit && clickedCity && clickedCity.ownerId === 'player') {
           deselectAll();
           setSelectedCityId(clickedCity.id);
           return;
       }
       if (!clickedUnit && !clickedCity && tile.ownerId === 'player') {
           deselectAll();
           setSelectedTilePos({x, y, z});
           return;
       }
       deselectAll();
       return;
    } 
    
    if (clickedUnit && clickedUnit.ownerId === 'player') {
       selectUnit(clickedUnit);
    } else if (clickedCity && clickedCity.ownerId === 'player') {
       deselectAll();
       setSelectedCityId(clickedCity.id);
    } else if (tile.ownerId === 'player' && !clickedUnit && !clickedCity) {
       deselectAll();
       setSelectedTilePos({x, y, z});
    } else {
       deselectAll();
    }
  }, [engine, showTechTree, currentOwner, selectedEntityId, validMoves, debugFogEnabled]); // Deps

  const selectUnit = (unit: Entity) => {
      deselectAll();
      if (unit.hasMoved) {
          addLog(`${unit.type} has no moves left.`);
          return;
      }
      setSelectedEntityId(unit.id);
      const moves = engine.getValidMoves(unit);
      setValidMoves(moves);
      addLog(`${unit.type} selected.`);
  };

  const handleEnqueue = (key: string, type: 'UNIT' | 'BUILDING') => {
      if (!selectedCityId) return;
      const success = engine.enqueueProduction(selectedCityId, key, type);
      if (success) {
          addLog(`Queued ${key}.`);
          forceUpdate({});
      } else {
          addLog("Cannot produce: Cost, duplicate, or locked.");
      }
  };
  
  const handleConstructImprovement = (impId: string) => {
      if (!selectedTilePos) return;
      const success = engine.constructImprovement(selectedTilePos.x, selectedTilePos.y, selectedTilePos.z, impId);
      if (success) {
          addLog(`Built ${DEFAULT_CONFIG.improvements[impId].name}`);
          setSelectedTilePos(null); 
      } else {
          addLog("Cannot build: Cost, Tech, or Terrain.");
      }
  }

  const handleEndTurn = () => engine.endTurn();
  const handleResearch = (techId: string) => engine.researchTech(techId);
  const handleRegenerate = (size?: number) => {
      if (size) {
          engine.config.map.width = size;
          engine.config.map.height = size;
      }
      engine.config.map.noiseSeed += 123;
      engine.generateGrid();
      setTurnNumber(1);
      setCurrentOwner('player');
      deselectAll();
  };
  const handleReset = () => {
      const newEngine = new WhiteboxEngine(DEFAULT_CONFIG);
      setEngine(newEngine);
      setTurnNumber(1);
      setCurrentOwner('player');
      setEntities([...newEngine.entities]);
      setPlayerState({...newEngine.playerState});
      deselectAll();
      setLogs(['System reset.']);
  }
  
  const getUnitCost = (key: string) => DEFAULT_CONFIG.units[key].components.find(c => c.type === 'Cost')?.stars || 0;
  const selectedCity = selectedCityId ? entities.find(e => e.id === selectedCityId) : null;
  const techList = Object.values(DEFAULT_CONFIG.techs);
  const selectedTile = selectedTilePos ? engine.grid[selectedTilePos.z][selectedTilePos.y][selectedTilePos.x] : null;

  // Optimized Render Layer with Memoized Components
  const renderGridLayer = (layerIndex: number, isInteractive: boolean) => {
      // Use the pre-sorted, pre-filtered list
      const tilesToRender = visibleTiles[layerIndex];

      return (
        <div style={{
            width: '100%', height: '100%', position: 'absolute',
            // GPU Accelerated Transform for entire layer
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            pointerEvents: isInteractive ? 'auto' : 'none'
        }}>
            {tilesToRender.map((tile) => {
                const key = `${tile.x},${tile.y},${layerIndex}`;
                
                // O(1) Lookups
                const entity = unitMap.get(key);
                const structure = structureMap.get(key);
                const targetMove = isInteractive ? validMoveMap.get(key) : undefined;
                
                const isValidMove = !!targetMove;
                const isAttack = targetMove?.isAttack || false;
                const isSelected = isInteractive && ((entity && entity.id === selectedEntityId) || (structure && structure.id === selectedCityId));
                const isTileSelected = isInteractive && selectedTilePos?.x === tile.x && selectedTilePos?.y === tile.y && selectedTilePos?.z === tile.z;
                
                return (
                    <HexTile 
                        key={key}
                        tile={tile}
                        layerIndex={layerIndex}
                        entity={entity}
                        structure={structure}
                        isValidMove={isValidMove}
                        isAttack={isAttack}
                        isSelected={!!isSelected}
                        isTileSelected={!!isTileSelected}
                        isInteractive={isInteractive}
                        debugFogEnabled={debugFogEnabled}
                        visibility={tile.visibility} // CRITICAL: Pass primitive value for memo check
                        onClick={handleTileClick}
                    />
                );
            })}
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900 text-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 shadow-xl z-20">
        <div className="flex items-center space-x-8">
          <div className="flex flex-col">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Turn</span>
            <div className="text-2xl font-bold font-mono text-white leading-none">{turnNumber}</div>
          </div>
          <div className="flex items-center space-x-2 bg-gray-900 px-4 py-2 rounded-lg border border-gray-700">
             <span className="text-2xl">⭐</span>
             <div className="flex flex-col">
                 <div className="text-xl font-bold text-yellow-400 leading-none">{playerState.stars}</div>
                 <span className="text-[10px] text-green-400 font-mono">+{playerState.income}/turn</span>
             </div>
          </div>
          {currentOwner !== 'player' && (
              <div className="animate-pulse bg-red-900/50 border border-red-500 text-red-100 px-4 py-2 rounded font-bold tracking-widest uppercase">
                  Enemy Thinking...
              </div>
          )}
        </div>
        
        <div className="flex space-x-2 bg-gray-900 p-1 rounded border border-gray-600">
             <button onClick={() => setViewLayer(1)} className={`px-3 py-1 text-xs font-bold rounded ${viewLayer === 1 ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'}`}>☁️ Sky</button>
             <button onClick={() => setViewLayer(0)} className={`px-3 py-1 text-xs font-bold rounded ${viewLayer === 0 ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>🌍 Ground</button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button onClick={() => setDebugFogEnabled(!debugFogEnabled)} className={`px-3 py-1 text-xs font-bold rounded border ${debugFogEnabled ? 'bg-gray-700 text-gray-300 border-gray-500' : 'bg-yellow-900/50 text-yellow-500 border-yellow-500'}`}>
              Fog: {debugFogEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setShowTechTree(true)} className="px-4 py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded shadow-lg flex items-center">
             <span className="mr-2">🔬</span> Tech
          </button>
          <button onClick={handleEndTurn} disabled={currentOwner !== 'player'} className={`px-6 py-3 font-bold rounded shadow-lg flex items-center ${currentOwner !== 'player' ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
            End Turn
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div 
        className="flex flex-1 overflow-hidden relative bg-gray-950 cursor-move" 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
         {/* Parallax Background */}
         <div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e293b_0%,#0f172a_100%)] pointer-events-none"
            style={{
                backgroundSize: '100px 100px',
                backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
                backgroundPosition: `${camera.x * 0.5}px ${camera.y * 0.5}px`, // Parallax movement
                opacity: 0.3
            }}
         ></div>
            
         {/* The Isometric Container */}
         <div className="relative w-full h-full">
            {viewLayer === 0 && (
               <>
                  {renderGridLayer(0, true)}
                  {/* Ghost Sky */}
                  <div style={{ opacity: 0.2, filter: 'blur(4px)', transform: `translate3d(${camera.x}px, ${camera.y - 120 * camera.zoom}px, 0) scale(${camera.zoom})`, pointerEvents: 'none' }}>
                       {/* Ghosting only needs to show non-void tiles, reusing our optimized list but needing simple render */}
                       {visibleTiles[1].map(t => {
                           const p = getHexPosition(t.x, t.y, 1);
                           return <div key={`${t.x}-${t.y}`} style={{ position: 'absolute', left: p.x, top: p.y, width: HEX_METRICS.WIDTH, height: HEX_METRICS.HEIGHT, background: '#fff', opacity: 0.2, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                       })}
                  </div>
               </>
            )}
            {viewLayer === 1 && (
               <>
                  <div style={{ opacity: 0.3, filter: 'brightness(0.3) blur(2px)', pointerEvents: 'none' }}>
                     {renderGridLayer(0, false)}
                  </div>
                  {renderGridLayer(1, true)}
               </>
            )}
         </div>

         {/* UI Controls for Camera */}
         <div className="absolute bottom-6 right-6 flex flex-col space-y-2 z-50">
             <button onClick={() => setCamera(prev => ({...prev, zoom: Math.min(prev.zoom + 0.2, 2.5)}))} className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-700">+</button>
             <button onClick={() => setCamera(prev => ({...prev, zoom: Math.max(prev.zoom - 0.2, 0.5)}))} className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-700">-</button>
             <button onClick={() => setCamera({x: 0, y: 0, zoom: 1})} className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-700 text-xs">Rst</button>
         </div>

         {/* UI Overlays (City, Tech, etc.) - Unchanged logic, just keeping structure */}
         {selectedCity && !showTechTree && (
            <div className="absolute bottom-6 left-6 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4 w-96 z-40 animate-in slide-in-from-bottom-5">
               <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-2">
                   <div><h2 className="text-xl font-bold text-white flex items-center">🏰 {selectedCity.name} <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 rounded">Lvl {selectedCity.components['CityStats']?.level || 1}</span></h2><span className="text-xs text-gray-500">Population: {selectedCity.components['CityStats']?.population || 0}</span></div>
                   <button onClick={() => setSelectedCityId(null)} className="text-gray-400 hover:text-white">✕</button>
               </div>
               <div className="flex mb-4 border-b border-gray-700">
                   <button onClick={() => setCityTab('units')} className={`flex-1 py-1 text-xs font-bold uppercase ${cityTab === 'units' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Units</button>
                   <button onClick={() => setCityTab('buildings')} className={`flex-1 py-1 text-xs font-bold uppercase ${cityTab === 'buildings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Buildings</button>
                   <button onClick={() => setCityTab('queue')} className={`flex-1 py-1 text-xs font-bold uppercase ${cityTab === 'queue' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Queue ({selectedCity.productionQueue.length})</button>
               </div>
               {/* Content based on tab - same as before */}
               {cityTab === 'queue' && (
                   <div className="mb-4"><h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Production Queue</h3><div className="space-y-1 max-h-32 overflow-y-auto bg-gray-900/50 p-2 rounded">{selectedCity.productionQueue.length === 0 && <span className="text-xs text-gray-600 italic">Idle</span>}{selectedCity.productionQueue.map((item) => (<div key={item.id} className="flex justify-between items-center text-sm p-1 bg-gray-800 border border-gray-700 rounded"><div className="flex items-center"><span className="mr-2">{item.type === 'UNIT' ? DEFAULT_CONFIG.units[item.key].symbol : DEFAULT_CONFIG.buildings[item.key].symbol}</span><span>{item.type === 'UNIT' ? DEFAULT_CONFIG.units[item.key].name : DEFAULT_CONFIG.buildings[item.key].name}</span></div><span className="text-xs font-mono text-yellow-400">{item.turnsRemaining}t</span></div>))}</div></div>
               )}
               {cityTab === 'units' && (
                   <div className="grid grid-cols-2 gap-4"><div><h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Train Units</h3><div className="space-y-1">{Object.keys(DEFAULT_CONFIG.units).filter(k => k !== 'city').map(key => { const cost = getUnitCost(key); const canAfford = playerState.stars >= cost; return (<button key={key} onClick={() => handleEnqueue(key, 'UNIT')} disabled={!canAfford} className={`w-full flex justify-between px-2 py-1.5 rounded border text-xs ${canAfford ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}><span>{DEFAULT_CONFIG.units[key].symbol} {DEFAULT_CONFIG.units[key].name}</span><span>{cost}⭐</span></button>)})}</div></div></div>
               )}
               {cityTab === 'buildings' && (
                   <div className="space-y-2 max-h-40 overflow-y-auto">
                       {Object.values(DEFAULT_CONFIG.buildings).map(b => {
                           const isBuilt = selectedCity.buildings?.includes(b.id);
                           const isQueued = selectedCity.productionQueue.some(q => q.key === b.id);
                           const hasTech = !b.techRequired || playerState.unlockedTechs.includes(b.techRequired);
                           const canAfford = playerState.stars >= b.cost;
                           if (isBuilt) return <div key={b.id} className="flex items-center p-2 bg-emerald-900/30 border border-emerald-700/50 rounded"><span className="text-xl mr-2">{b.symbol}</span><div className="flex-1"><div className="font-bold text-xs text-emerald-400">{b.name}</div><div className="text-[10px] text-gray-400">{b.description}</div></div><span className="text-emerald-500 text-xs">Built</span></div>;
                           return (
                               <button 
                                  key={b.id} 
                                  disabled={!hasTech || !canAfford || isQueued}
                                  onClick={() => handleEnqueue(b.id, 'BUILDING')}
                                  className={`w-full flex items-center p-2 rounded border text-left transition-all ${!hasTech ? 'opacity-50 grayscale bg-gray-800 border-gray-700' : (canAfford ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-800 text-gray-500 border-gray-700')}`}
                               >
                                   <span className="text-xl mr-2">{b.symbol}</span>
                                   <div className="flex-1">
                                       <div className="font-bold text-xs">{b.name}</div>
                                       <div className="text-[10px] text-gray-400">{hasTech ? b.description : `Req: ${DEFAULT_CONFIG.techs[b.techRequired!].name}`}</div>
                                   </div>
                                   <div className="text-xs font-bold text-yellow-500 ml-2">{b.cost}⭐</div>
                               </button>
                           )
                       })}
                   </div>
               )}
            </div>
         )}
         {selectedTile && !showTechTree && (
            <div className="absolute bottom-6 left-6 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4 w-96 z-40 animate-in slide-in-from-bottom-5">
                <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-2"><div><h2 className="text-lg font-bold text-white flex items-center">Terrain: {selectedTile.type}</h2><span className="text-xs text-gray-400">Position: {selectedTile.x}, {selectedTile.y}</span></div><button onClick={() => setSelectedTilePos(null)} className="text-gray-400 hover:text-white">✕</button></div>
                {selectedTile.resource && <div className="mb-4 bg-gray-700/30 p-2 rounded flex items-center"><span className="text-2xl mr-2">{RESOURCE_ICONS[selectedTile.resource]}</span><span className="font-bold capitalize">{selectedTile.resource}</span></div>}
               {!selectedTile.improvement ? (
                   <div><h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Construction</h3><div className="grid grid-cols-2 gap-2">{Object.values(DEFAULT_CONFIG.improvements).map(imp => { const isTerrainValid = imp.validTerrain.includes(selectedTile.type); const isTechUnlocked = !imp.techRequired || playerState.unlockedTechs.includes(imp.techRequired); const canAfford = playerState.stars >= imp.cost; const canBuild = isTerrainValid && isTechUnlocked; let reason = ""; if (!isTerrainValid) reason = "Invalid Terrain"; else if (!isTechUnlocked) reason = `Need ${DEFAULT_CONFIG.techs[imp.techRequired!].name}`; else if (!canAfford) reason = "Too Expensive"; return (<button key={imp.id} onClick={() => canBuild && canAfford && handleConstructImprovement(imp.id)} disabled={!canBuild || !canAfford} className={`flex flex-col items-start p-2 rounded border text-xs ${canBuild && canAfford ? 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-200' : 'bg-gray-800/50 border-gray-800 text-gray-500 opacity-60'}`}><div className="flex justify-between w-full mb-1"><span className="font-bold">{imp.symbol} {imp.name}</span><span>{imp.cost}⭐</span></div><span className="text-[10px] opacity-70 mb-1">{imp.description}</span>{reason && <span className="text-[10px] text-red-400 font-mono">[{reason}]</span>}</button>)})}</div></div>
               ) : (<div className="bg-gray-700/50 p-3 rounded border border-gray-600 flex items-center"><span className="text-2xl mr-3">{DEFAULT_CONFIG.improvements[selectedTile.improvement].symbol}</span><div><div className="font-bold">{DEFAULT_CONFIG.improvements[selectedTile.improvement].name}</div><div className="text-xs text-gray-400">{DEFAULT_CONFIG.improvements[selectedTile.improvement].description}</div></div></div>)}
            </div>
         )}
         {showTechTree && (
            <div className="absolute inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
               <div className="w-full max-w-5xl h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4"><h2 className="text-3xl font-bold text-white">Technology Research</h2><button onClick={() => setShowTechTree(false)} className="text-gray-400 bg-gray-800 px-4 py-2 rounded">Close</button></div>
                    <div className="flex-1 relative overflow-auto bg-gray-950 rounded-xl border border-gray-800 shadow-inner p-8">
                         <div className="relative z-10" style={{ minWidth: '800px', minHeight: '800px' }}>
                             {/* Dependency Lines - Simplified for now to just show nodes */}
                             {Object.values(DEFAULT_CONFIG.techs).map(tech => { const isUnlocked = playerState.unlockedTechs.includes(tech.id); const hasPrereq = !tech.prerequisite || playerState.unlockedTechs.includes(tech.prerequisite); const canAfford = playerState.stars >= tech.cost; const isResearchable = !isUnlocked && hasPrereq; const statusClass = isUnlocked ? "bg-emerald-900/80 border-emerald-500 text-emerald-100" : (isResearchable && canAfford ? "bg-blue-900/80 border-blue-400 text-blue-100 cursor-pointer" : "bg-gray-800 border-gray-600 text-gray-500 opacity-50");
                                 return (<div key={tech.id} onClick={() => isResearchable && canAfford && handleResearch(tech.id)} className={`absolute w-40 h-24 rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${statusClass} hover:scale-105`} style={{ left: `${tech.column * 200}px`, top: `${tech.row * 140}px` }}><div className="text-2xl mb-1">{tech.symbol}</div><div className="font-bold text-sm">{tech.name}</div>{!isUnlocked && <div className="text-xs mt-1">{tech.cost} ⭐</div>}</div>);
                             })}
                         </div>
                    </div>
               </div>
            </div>
        )}
        <div className="w-72 bg-gray-800 border-l border-gray-700 p-4 flex flex-col z-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mission Log</h3>
                <div className="flex space-x-2">
                    <button onClick={() => handleRegenerate()} className="text-xs text-blue-400 hover:text-blue-300">Regen</button>
                    <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300">Reset</button>
                </div>
            </div>
            
            {/* Map Size Selector */}
            <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Map Size</label>
                <div className="grid grid-cols-4 gap-2">
                    {[10, 16, 24, 32].map(size => (
                    <button 
                        key={size}
                        onClick={() => handleRegenerate(size)}
                        className={`px-1 py-1 text-[10px] font-bold rounded border transition-colors ${engine.config.map.width === size ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-gray-200'}`}
                    >
                        {size}x{size}
                    </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                {logs.map((log, i) => (
                    <div key={i} className="text-gray-400 border-b border-gray-700/50 pb-1 last:border-0">
                        <span className="text-blue-500 mr-1">::</span>{log}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};