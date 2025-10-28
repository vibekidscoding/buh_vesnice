# AGENTS.md - AI Development Guidelines

## Project Overview

**Name:** Bůh Vesnice (Village God)
**Type:** Isometric village-building game
**Language:** Czech (UI and game text)
**Platform:** Web browser via GitHub Pages
**Framework:** Phaser 3 with isometric plugin

## Core Principles

### 1. Incremental Changes
- **ALWAYS** change only ONE component or module at a time
- Make small, testable modifications
- Verify each change works before moving to the next
- Never refactor multiple systems simultaneously

### 2. Architectural Clarity
- Keep concerns separated (rendering, game logic, state management, UI)
- Each file should have a single, clear responsibility
- Document dependencies between modules
- Use TypeScript interfaces for clear contracts

### 3. Code Organization
- Follow the directory structure strictly (see below)
- Keep files small (< 300 lines preferred)
- Use clear, descriptive Czech and English naming
- Maintain consistency in naming conventions

## Directory Structure

```
buh_vesnice/
├── AGENTS.md                    # This file
├── README.md                    # Project documentation
├── index.html                   # Entry point
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── .gitignore                   # Git ignore rules
│
├── src/                         # Source code
│   ├── main.ts                  # Application entry point
│   ├── config/                  # Configuration files
│   │   ├── game.config.ts       # Phaser game configuration
│   │   └── constants.ts         # Game constants (tile sizes, etc)
│   │
│   ├── scenes/                  # Phaser scenes
│   │   ├── BootScene.ts         # Asset loading
│   │   ├── MenuScene.ts         # Main menu
│   │   ├── GameScene.ts         # Main gameplay
│   │   └── UIScene.ts           # UI overlay
│   │
│   ├── entities/                # Game entities
│   │   ├── Building.ts          # Building base class
│   │   ├── buildings/           # Specific building types
│   │   │   ├── House.ts
│   │   │   ├── Farm.ts
│   │   │   └── Workshop.ts
│   │   ├── Villager.ts          # Villager entity
│   │   └── Resource.ts          # Resource entity
│   │
│   ├── systems/                 # Game systems
│   │   ├── GridSystem.ts        # Isometric grid management
│   │   ├── BuildingSystem.ts    # Building placement & management
│   │   ├── ResourceSystem.ts    # Resource collection & storage
│   │   ├── VillagerSystem.ts    # Villager AI & tasks
│   │   └── SaveSystem.ts        # Save/load game state
│   │
│   ├── ui/                      # UI components
│   │   ├── BuildMenu.ts         # Building selection menu
│   │   ├── ResourceDisplay.ts   # Resource counter
│   │   ├── InfoPanel.ts         # Building/villager info
│   │   └── Tooltip.ts           # Hover tooltips
│   │
│   ├── state/                   # State management
│   │   ├── GameState.ts         # Global game state
│   │   ├── BuildingState.ts     # Building registry
│   │   └── ResourceState.ts     # Resource tracking
│   │
│   ├── utils/                   # Utility functions
│   │   ├── isometric.ts         # Isometric conversion helpers
│   │   ├── pathfinding.ts       # A* pathfinding
│   │   └── random.ts            # Random generation
│   │
│   ├── data/                    # Game data definitions
│   │   ├── buildings.ts         # Building definitions
│   │   ├── resources.ts         # Resource types
│   │   └── czech.ts             # Czech language strings
│   │
│   └── types/                   # TypeScript type definitions
│       ├── index.d.ts           # Global types
│       ├── building.types.ts    # Building interfaces
│       └── game.types.ts        # Game state interfaces
│
├── assets/                      # Game assets
│   ├── sprites/                 # Sprite images
│   │   ├── buildings/           # Building sprites
│   │   ├── villagers/           # Villager sprites
│   │   ├── resources/           # Resource sprites
│   │   └── terrain/             # Ground tiles, trees, etc
│   │
│   ├── ui/                      # UI graphics
│   │   ├── buttons/             # Button graphics
│   │   ├── panels/              # Panel backgrounds
│   │   └── icons/               # Small icons
│   │
│   ├── audio/                   # Sound files
│   │   ├── music/               # Background music
│   │   └── sfx/                 # Sound effects
│   │
│   └── fonts/                   # Font files
│       └── README.md            # Font credits & usage
│
├── dist/                        # Built files (generated)
│   └── ...                      # Webpack output
│
└── docs/                        # Documentation
    ├── architecture.md          # Architecture decisions
    ├── game-design.md           # Game design document
    └── api.md                   # Code API reference
```

## Development Workflow

### When Adding a New Feature

1. **Plan First**
   - Identify which module(s) will be affected
   - Write down the changes needed in order
   - Consider dependencies and side effects

2. **One File at a Time**
   ```
   Example: Adding a new "Sawmill" building

   Step 1: Add building definition to src/data/buildings.ts
   Step 2: Create src/entities/buildings/Sawmill.ts
   Step 3: Update src/systems/BuildingSystem.ts to register it
   Step 4: Add Czech strings to src/data/czech.ts
   Step 5: Test building placement and functionality
   ```

3. **Verify Each Step**
   - Run the game after each change
   - Check console for errors
   - Test the specific functionality changed

4. **Document Changes**
   - Update comments in modified files
   - Update docs/ if architecture changes
   - Note any new dependencies

### When Fixing Bugs

1. **Isolate the Problem**
   - Identify the exact file and function
   - Understand the data flow
   - Check related systems

2. **Minimal Fix**
   - Change only what's necessary
   - Don't refactor while fixing
   - Add defensive checks if needed

3. **Test Thoroughly**
   - Verify the bug is fixed
   - Check for regressions
   - Test edge cases

## Architectural Guidelines

### Scene Management

**BootScene:** Loads all assets, shows progress bar
- Only loads, doesn't initialize game logic
- Transitions to MenuScene when done

**MenuScene:** Main menu, settings, load game
- Minimal game logic
- Handles menu interactions only

**GameScene:** Core gameplay
- Manages the game world (grid, buildings, villagers)
- Handles input for building placement
- Updates game systems each frame

**UIScene:** Runs parallel to GameScene
- Displays menus, tooltips, resource counters
- Receives events from GameScene
- No direct world manipulation

### State Management

```typescript
// src/state/GameState.ts
class GameState {
  resources: Map<string, number>
  buildings: Building[]
  villagers: Villager[]
  currentTick: number

  // Only this class modifies state
  // Other classes read or dispatch actions
}
```

**Rules:**
- Single source of truth in GameState
- Systems read state, emit events
- State updates only through GameState methods
- Use events for cross-system communication

### Isometric Grid System

```typescript
// Coordinate systems:
// 1. Screen coordinates (x, y) - pixel positions
// 2. Grid coordinates (gridX, gridY) - tile positions
// 3. Isometric coordinates (isoX, isoY) - diamond grid

// ALWAYS use GridSystem for conversions
GridSystem.screenToGrid(screenX, screenY) → {gridX, gridY}
GridSystem.gridToScreen(gridX, gridY) → {x, y}
```

**Important:**
- Never do isometric math outside GridSystem
- Store positions in grid coordinates
- Convert to screen only for rendering

### Building System

**Placement Flow:**
1. User selects building type from UI
2. Ghost sprite follows cursor (semi-transparent)
3. GridSystem checks if position valid (not occupied, valid terrain)
4. On click: BuildingSystem.placeBuilding()
5. Deduct resources, create building entity
6. Update BuildingState registry

**Rules:**
- Buildings exist on grid tiles
- Each tile can have one building
- Buildings have footprint (1x1, 2x2, etc.)
- Check ALL tiles in footprint for validity

### Resource System

**Resource Flow:**
1. Buildings produce resources on tick
2. ResourceSystem.addResource(type, amount)
3. UI updates via event listener
4. Building costs checked before placement

**Storage:**
```typescript
resources: Map<ResourceType, number>
// e.g., Map { 'drevo' => 100, 'kamen' => 50 }
```

### Villager System

**AI Loop:**
1. Check if villager has task
2. If no task: VillagerSystem.assignTask()
3. Move to destination using pathfinding
4. Perform task (gather, build, etc.)
5. Return to home/idle

**Keep it Simple:**
- Basic state machine (idle, moving, working)
- Simple task queue
- Don't overcomplicate AI initially

## Common Patterns

### Adding a New Building Type

```typescript
// 1. Define in src/data/buildings.ts
export const BUILDINGS = {
  sawmill: {
    id: 'sawmill',
    nameKey: 'building.sawmill.name',
    cost: { drevo: 20, kamen: 10 },
    size: { width: 2, height: 2 },
    produces: { prkna: 2 },
    productionTime: 5000
  }
}

// 2. Create class src/entities/buildings/Sawmill.ts
export class Sawmill extends Building {
  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    super(scene, gridX, gridY, BUILDINGS.sawmill)
  }

  update(delta: number) {
    // Production logic
  }
}

// 3. Add Czech strings src/data/czech.ts
'building.sawmill.name': 'Pila',
'building.sawmill.desc': 'Produkuje prkna ze dřeva'

// 4. Register in BuildingSystem
```

### Adding UI Component

```typescript
// src/ui/MyComponent.ts
export class MyComponent {
  private container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y)
    this.createUI()
  }

  private createUI() {
    // Build UI elements
  }

  public show() { this.container.setVisible(true) }
  public hide() { this.container.setVisible(false) }
  public destroy() { this.container.destroy() }
}
```

### Event Communication

```typescript
// Emit from system
this.scene.events.emit('resource-changed', { type: 'drevo', amount: 100 })

// Listen in UI
this.scene.events.on('resource-changed', this.updateDisplay, this)
```

## Testing Checklist

Before committing changes, verify:

- [ ] Game runs without console errors
- [ ] Changed functionality works as expected
- [ ] No regressions in existing features
- [ ] Czech text displays correctly
- [ ] Performance is acceptable (60 FPS)
- [ ] Code follows project structure
- [ ] Comments explain complex logic
- [ ] TypeScript types are correct

## Common Pitfalls to Avoid

1. **Don't mix coordinate systems**
   - Always convert through GridSystem
   - Comment which coordinate system you're using

2. **Don't create circular dependencies**
   - Systems should not import each other
   - Use events for cross-system communication

3. **Don't put game logic in scenes**
   - Scenes orchestrate, systems implement
   - Keep scenes thin

4. **Don't hardcode strings**
   - All user-facing text goes in src/data/czech.ts
   - Use translation keys

5. **Don't skip cleanup**
   - Destroy sprites when removing entities
   - Remove event listeners
   - Clear timers and intervals

## Performance Guidelines

- Reuse object pools for frequently created/destroyed objects
- Use Phaser's built-in object pools
- Limit pathfinding calculations (cache paths, use simple grid)
- Batch rendering when possible
- Keep entity count reasonable (< 1000 for smooth performance)

## Git Workflow

```bash
# Always work on feature branches
git checkout -b feature/sawmill-building

# Commit after each working increment
git commit -m "feat: add sawmill building definition"
git commit -m "feat: create Sawmill entity class"
git commit -m "feat: integrate sawmill into building system"

# Merge when feature is complete and tested
```

## Questions to Ask Before Coding

1. Which single component am I changing?
2. Does this fit the existing architecture?
3. What dependencies will be affected?
4. Can I test this change in isolation?
5. Are there existing patterns I should follow?

## Getting Started (for new AI agents)

1. Read this entire document
2. Review the directory structure
3. Read src/main.ts to understand entry point
4. Read src/config/game.config.ts for Phaser setup
5. Look at one complete feature (e.g., building placement) to understand flow
6. Ask clarifying questions before making changes

## Project-Specific Notes

**Czech Language:**
- All UI text must be in Czech
- Use proper Czech characters (á, č, ď, é, ě, í, ň, ó, ř, š, ť, ú, ů, ý, ž)
- Keep translations in src/data/czech.ts

**Isometric View:**
- Tile size: 64x32 pixels (width x height)
- Use diamond grid layout
- Z-order rendering based on gridY position

**Resource Types (initial):**
- drevo (wood)
- kamen (stone)
- jidlo (food)
- prkna (planks)

**Building Types (initial):**
- dum (house) - provides villagers
- farma (farm) - produces food
- kamenolom (quarry) - produces stone
- pila (sawmill) - converts wood to planks

---

*When in doubt, prefer simplicity and clarity over clever solutions. This is a game that should be fun to play and easy to maintain.*
