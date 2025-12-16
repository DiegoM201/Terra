 # Copilot instructions — Terra (Whitebox Strategy)

 Purpose: short, practical notes to make an AI coding agent productive quickly.

 1) Big picture
 - Core engine: `services/engine.ts` (class `WhiteboxEngine`) — map generation, entity ECS, fog-of-war, economy, techs, turn resolution, simple AI.
 - UI: React + Vite under top-level components. `components/PrototypeView.tsx` constructs the engine and subscribes to its lightweight event bus (`engine.on` / `engine.emit`).
 - Data-driven rules live in `constants.ts` (`DEFAULT_CONFIG`) and are typed by `types.ts` (`GameConfig`, `UnitDefinition`, `ImprovementDefinition`). Changing `DEFAULT_CONFIG` changes gameplay without touching engine logic.

 2) Key integration points & APIs (examples)
 - Events the UI listens for: `GRID_GENERATED`, `ECONOMY_UPDATE`, `TURN_CHANGED`, `FOG_UPDATE`, `ENTITY_MOVED`, `CITY_UPDATED`, `TILE_UPDATED`, `COMBAT_LOG`.
 - Useful `WhiteboxEngine` surface (refer to `services/engine.ts`):
   - `new WhiteboxEngine(config)` — instantiate engine
   - `engine.generateGrid()` — regenerate world
   - `engine.endTurn()` — advance/resolution
   - `engine.getValidMoves(entity)` — movement/attack candidates
   - `engine.moveUnitTo(id,x,y,z)` — attempt move/attack
   - `engine.enqueueProduction(cityId,key,type)` — queue production
   - `engine.constructImprovement(x,y,z,improvementId)` — build improvement
   - `engine.researchTech(techId)` — spend stars to unlock tech
   - `engine.createEntity(key,x,y,z,...)` — spawn entities

 3) Project-specific conventions & patterns
 - Grid is 3D-layered: `grid[z][y][x]` with `z=0` ground, `z=1` sky. Many helpers accept (x,y,z).
 - Spatial hashing uses string keys: `${x},${y},${z}` (see `unitLookup` / `cityLookup`). Keep these caches in sync when moving/creating entities.
 - Visibility enum: `Visibility.HIDDEN` (0), `FOGGED` (1), `VISIBLE` (2). `PrototypeView` passes `visibility` as a primitive prop to `HexTile` — preserve that to keep `React.memo` effective.
 - Performance in `PrototypeView.tsx`:
   - Precompute `unitMap`, `structureMap`, `validMoveMap` (O(1) lookups in render).
   - Compute `visibleTiles` once when `engine.grid` changes and sort for painter order.
   - Centralize heavy geometry in `HEX_METRICS` / `getHexPosition`.

 4) Editing guidance (where to change behavior)
 - Rules & content: change `DEFAULT_CONFIG` in `constants.ts` (units, techs, improvements, buildings).
 - Core mechanics: update `services/engine.ts` (pathfinding, fog, economy, combat, grid math). Emit appropriate events after state mutations so UI stays in sync.
 - UI rendering: `components/PrototypeView.tsx` (camera, input, memoization) and `HexTile` (tile-level rendering). Pass primitive props where memoization matters.
 - Types: extend `types.ts` when adding new config fields; keep runtime `DEFAULT_CONFIG` shape consistent.

 5) Workflows & commands
 - Install deps: `npm install`
 - Dev server: `npm run dev` (Vite). Build: `npm run build`. Preview: `npm run preview`.
 - Optional environment: `.env.local` and `GEMINI_API_KEY` referenced in README for AI Studio integration.

 6) Testing & CI
 - There are no tests or CI configuration in-repo. Good targets for unit tests: `services/engine.ts` functions (grid gen, pathfinding, economy, enqueue/construct flows) because engine is pure TypeScript and easy to test.

 7) Small-but-critical examples and gotchas
 - Spatial key format: use `${x},${y},${z}` when touching `unitLookup`/`cityLookup`.
 - When adding engine mutations, call `this.emit('TILE_UPDATED', {x,y,z})`, `ECONOMY_UPDATE`, `CITY_UPDATED` or `GRID_GENERATED` so `PrototypeView` updates UI.
 - `HexTile` expects `visibility` as a primitive prop for `React.memo` to work — don't pass `tile` object as the primary memo key.

 If anything is missing or you'd like the doc to include quick edit examples (small patches to `engine.ts` / `constants.ts`) tell me which area to expand and I will iterate.
# Copilot instructions — Terra (Whitebox Strategy)

Purpose: quickly orient an AI coding agent to the codebase so it can be immediately productive.

1) Big picture
- Core: a small data-driven 4X prototype. The game engine lives in `services/engine.ts` (class `WhiteboxEngine`) and contains map generation, entity system, fog-of-war, economy, AI and turn resolution.
- UI: React + Vite app under top-level components. `components/PrototypeView.tsx` mounts a `WhiteboxEngine` instance and acts as the UI bridge via a lightweight event bus (engine.on / engine.emit). `App.tsx` toggles between the Design Document (`components/Documentation.tsx`) and the prototype view.
- Config: Game rules are data-driven in `constants.ts` (`DEFAULT_CONFIG`) and typed in `types.ts` (`GameConfig`, `UnitDefinition`, `ImprovementDefinition`, etc.). Modifying `DEFAULT_CONFIG` drives behavior without changing engine logic.

2) Primary integration points and APIs
- Engine event names to listen/emit: `GRID_GENERATED`, `ECONOMY_UPDATE`, `TURN_CHANGED`, `FOG_UPDATE`, `ENTITY_MOVED`, `CITY_UPDATED`, `TILE_UPDATED`, `COMBAT_LOG` (see `services/engine.ts` and `components/PrototypeView.tsx`).
- Useful engine methods:
  - `new WhiteboxEngine(config)` — construct engine (UI currently uses `DEFAULT_CONFIG`).
  - `engine.generateGrid()` — regenerate map.
  - `engine.endTurn()` — run end-turn resolution (economy, queues, AI).
  - `engine.getValidMoves(entity)` — returns tile candidates for movement/attack.
  - `engine.moveUnitTo(id,x,y,z)` — attempt move/attack.
  - `engine.enqueueProduction(cityId,key,type)` — queue unit/building.
  - `engine.constructImprovement(x,y,z,improvementId)` — direct construction model.
  - `engine.researchTech(techId)` — unlock techs for `player`.
  - `engine.createEntity(key,x,y,z,...)` — spawn entities programmatically.

3) Project-specific conventions & patterns
- Data-driven: add new units/techs/buildings/improvements in `constants.ts` (`DEFAULT_CONFIG`) and ensure `types.ts` shapes match — engine reads these structures at runtime.
- Event bus: UI updates use `engine.on(...)` and shallow clones of engine state (`setEntities([...engine.entities])`, `setPlayerState({...engine.playerState})`). Prefer reacting to events rather than polling.
- Performance patterns in `PrototypeView.tsx`:
  - Use memoized O(1) maps (`unitMap`, `structureMap`, `validMoveMap`) rather than scanning arrays inside render loops.
  - Precompute and sort visible tiles (`visibleTiles`) and pass primitive props to memoized tile components — e.g. pass `visibility` as a primitive value to `HexTile` so `React.memo` can correctly skip renders.
  - Heavy UI math (hex positions, `HEX_METRICS`) is centralized in `PrototypeView.tsx` — reuse these functions when adding rendering features.
- Grid support: engine supports `map.gridType` of `HEX` or `SQUARE`; neighbor & distance logic is implemented in `getNeighbors()` and `getDistance()` in `services/engine.ts` — be careful when changing grid math.
- Elevation (`z`): tiles are 3D-aware (`z=0` ground, `z=1` sky). Engine uses layered grids `grid[z][y][x]` and spatial hash maps (`unitLookup`, `cityLookup`) for O(1) lookups.

4) Workflows (build / run / env)
- Install: `npm install`
- Dev server: `npm run dev` (Vite). The README also suggests `npm run build` and `npm run preview`.
- Environment: the README references `.env.local` and `GEMINI_API_KEY` for AI studio integration — set keys there when required.

5) Editing guidance (where to change behavior)
- Game rules, costs, visuals, symbols: `constants.ts` (`DEFAULT_CONFIG`).
- Core rules, pathfinding, fog, combat, economy: `services/engine.ts` — this is the authoritative source of game logic.
- UI & UX behavior, memoization, and render optimizations: `components/PrototypeView.tsx` and `components/HexTile` (inside `PrototypeView.tsx` / `HexTile` component). When adding UI features, follow the existing memoization patterns (primitive props, precomputed maps).
- Types & contracts: `types.ts` — update these if you add new config fields (keep `DEFAULT_CONFIG` in sync).

6) Small but important details (examples)
- Visibility prop: `HexTile` relies on receiving `tile.visibility` as a primitive prop so `React.memo` can avoid re-renders — do not pass the full `tile` object if you want memoization to work.
- Event-driven UI updates: after mutating engine state (e.g., `enqueueProduction`, `constructImprovement`) UI code calls `forceUpdate` or updates slices from `engine` (e.g., `setEntities([...engine.entities])`). Emit events in engine methods when adding new behaviors.
- Spatial hashing: engine caches entities in `unitLookup`/`cityLookup` using `"x,y,z"` keys — keep those caches updated when adding new move/spawn logic.

7) What’s missing / not present
- No test harnesses or CI config are present in the repo root. Add unit tests around `services/engine.ts` if you need regression safety (engine is pure TypeScript and exportable for node tests).

If anything above is unclear or you want more detail about a specific area (pathfinding, fog, tech tree shape, or UI performance hotspots), tell me which file/feature to expand and I will iterate.
