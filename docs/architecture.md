# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Phaser 3 Engine                    │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │  Boot   │─────▶│  Menu   │─────▶│  Game   │
   │ Scene   │      │ Scene   │      │ Scene   │
   └─────────┘      └─────────┘      └────┬────┘
                                           │
                                      ┌────▼────┐
                                      │   UI    │
                                      │ Scene   │
                                      └────┬────┘
                                           │
        ┌──────────────────────────────────┼──────────────────────────────────┐
        │                                  │                                  │
   ┌────▼────┐      ┌──────────┐      ┌──▼─────┐      ┌──────────┐      ┌───▼────┐
   │  Grid   │      │ Building │      │Resource│      │ Villager │      │  Save  │
   │ System  │      │  System  │      │ System │      │  System  │      │ System │
   └────┬────┘      └────┬─────┘      └───┬────┘      └────┬─────┘      └───┬────┘
        │                │                 │                 │                │
        └────────────────┴─────────────────┴─────────────────┴────────────────┘
                                           │
                                      ┌────▼────┐
                                      │  Game   │
                                      │  State  │
                                      └─────────┘
```

## Data Flow

### Building Placement

```
User clicks build button (UI Scene)
           │
           ▼
BuildMenu emits 'building-selected' event
           │
           ▼
GameScene receives event, enters placement mode
           │
           ▼
Mouse move → GridSystem.screenToGrid()
           │
           ▼
Ghost sprite follows cursor (semi-transparent)
           │
           ▼
GridSystem checks tile validity
           │
           ├─ Valid: green tint
           └─ Invalid: red tint
           │
           ▼
User clicks → BuildingSystem.placeBuilding()
           │
           ├─ Check resources (ResourceSystem)
           ├─ Deduct costs
           ├─ Create building entity
           ├─ Add to BuildingState
           └─ Update UI (emit event)
```

### Resource Production

```
Game update tick (60 FPS)
           │
           ▼
For each building with production
           │
           ├─ Check production timer
           └─ If ready:
                  │
                  ▼
           Produce resources
                  │
                  ▼
           ResourceSystem.addResource()
                  │
                  ▼
           Update GameState.resources
                  │
                  ▼
           Emit 'resource-changed' event
                  │
                  ▼
           UI updates display
```

### Villager AI Loop

```
VillagerSystem.update() called each frame
           │
           ▼
For each villager:
           │
           ├─ Has task? ───No──▶ assignTask()
           │                           │
           Yes                         ▼
           │                    Find nearest task
           ▼                           │
Check current state                    ▼
           │                    Set task & destination
           ├─ IDLE ──▶ Start moving
           ├─ MOVING ─▶ Update position
           │              │
           │              └─ At destination? ──▶ Start working
           │
           └─ WORKING ─▶ Work timer
                           │
                           └─ Complete? ──▶ Produce resource, back to IDLE
```

## Module Responsibilities

### Scenes

- **BootScene:** Asset loading only, no game logic
- **MenuScene:** Menu UI, settings, save/load selection
- **GameScene:** World rendering, input handling, system coordination
- **UIScene:** HUD, menus, tooltips (runs parallel to GameScene)

### Systems

- **GridSystem:** Coordinate conversion, tile validation, pathfinding grid
- **BuildingSystem:** Building placement, removal, lifecycle management
- **ResourceSystem:** Resource tracking, production, consumption
- **VillagerSystem:** Villager spawning, AI, task assignment
- **SaveSystem:** Serialization, localStorage, save/load

### State

- **GameState:** Single source of truth for all game data
- **BuildingState:** Building registry and queries
- **ResourceState:** Current resource amounts

### Entities

- **Building:** Base class for all buildings
- **Villager:** Villager entity with AI state
- **Resource:** Resource items (future: can be placed on ground)

## Communication Patterns

### Event-Driven

Systems communicate via Phaser's event system:

```typescript
// Emitter
scene.events.emit('building-placed', { building, gridX, gridY })

// Listener
scene.events.on('building-placed', this.onBuildingPlaced, this)
```

**Common Events:**
- `building-placed` - New building added
- `building-removed` - Building destroyed
- `resource-changed` - Resource amount updated
- `villager-spawned` - New villager created
- `game-paused` - Game paused
- `game-resumed` - Game resumed

### Direct Access (Read-Only)

UI and systems can read GameState directly:

```typescript
const wood = GameState.getInstance().getResource('drevo')
```

### Modification (Through Methods)

State changes only through GameState methods:

```typescript
// ❌ WRONG
GameState.getInstance().resources.set('drevo', 100)

// ✅ CORRECT
GameState.getInstance().addResource('drevo', 10)
```

## Layer Management

### Z-Index Ordering (bottom to top)

1. Terrain tiles (z = 0)
2. Buildings (z = gridY * 100)
3. Villagers (z = gridY * 100 + 50)
4. Selection indicators (z = 9000)
5. UI overlays (z = 10000)

**Rule:** Objects further down (higher gridY) render on top

## Performance Considerations

### Object Pooling

Reuse objects instead of creating/destroying:

```typescript
// For frequently created objects like tooltips, particles
const pool = this.add.group({
  classType: Tooltip,
  maxSize: 10
})
```

### Update Frequency

- **Every frame (60 FPS):** Input, rendering, villager movement
- **Every second:** Resource production checks
- **Every 5 seconds:** Villager task assignment
- **Every 30 seconds:** Auto-save

### Culling

Only render objects visible on screen:

```typescript
const bounds = this.cameras.main.worldView
// Only update/render entities within bounds
```

## File Size Guidelines

- Scene files: < 200 lines
- System files: < 300 lines
- Entity files: < 150 lines
- UI component files: < 200 lines

If a file grows larger, consider splitting into multiple files.

## Dependencies

```
Phaser 3 (game engine)
    │
    ├─ phaser3-plugin-isometric (isometric helper)
    ├─ TypeScript (type safety)
    └─ Webpack (bundling)
```

Keep dependencies minimal. Only add new dependencies if:
1. Significantly reduces development time
2. Well-maintained and popular
3. Small bundle size impact
4. Cannot be easily implemented ourselves

## Testing Strategy

### Manual Testing
- Test each feature in browser immediately after coding
- Check console for errors
- Verify performance (should maintain 60 FPS)

### Save/Load Testing
- Save game state
- Refresh page
- Load game state
- Verify everything restored correctly

### Edge Cases to Test
- Placing buildings at grid boundaries
- Running out of resources
- Maximum villager count
- Large number of buildings (100+)
- Rapid clicking/input

## Deployment

### GitHub Pages Setup

```bash
# Build for production
npm run build

# Deploy to gh-pages branch
npm run deploy
```

Game accessible at: `https://[username].github.io/buh_vesnice/`

### Build Checklist
- [ ] All assets loaded correctly
- [ ] No console errors
- [ ] Czech text displays properly
- [ ] Game runs at 60 FPS
- [ ] Save/load works
- [ ] Mobile responsive (optional)

---

*This architecture prioritizes simplicity, maintainability, and incremental development.*
