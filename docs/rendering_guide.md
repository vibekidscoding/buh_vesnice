# Rendering Architecture & Depth Sorting Guide

This document describes the rendering strategy used in `GameScene.ts` to ensure correct isometric layering. Use this as a reference for future development.

## 1. Container Structure

The scene is organized into a hierarchy of Containers to manage rendering order efficiently.

```
GameScene
└── terrainContainer (ScrollFactor: 1, 1) - Moves with camera
    ├── groundContainer (Depth: 0) - Static terrain tiles
    │   └── [Graphics] (Isometric Diamonds)
    └── objectsContainer (Depth: 1) - Sortable game entities
        ├── [Image] Trees
        ├── [Image] Rocks
        ├── [Image] Buildings
        └── [Image] Villagers
```

*   **`groundContainer`**: Contains the flat isometric tiles. These are drawn first and never need sorting relative to each other (painter's algorithm is sufficient during creation).
*   **`objectsContainer`**: Contains all "upright" objects. This container has `sortableChildren = true`.

## 2. Depth Sorting Logic

To achieve correct isometric occlusion (objects "in front" cover objects "behind"), we use a specific depth formula.

### The Formula
```typescript
depth = gridX + gridY
```

### Why this works?
In a diametric isometric projection (like used in this game), the rendering order proceeds diagonally from the top-left corner of the grid (0,0) to the bottom-right.
*   As you move **Down-Right** (increasing Y screen coordinate), `gridX + gridY` increases.
*   Objects with a **higher sum** are "closer" to the viewer and should be drawn **last** (on top).

### Implementation Details

1.  **Static Objects (Trees, Rocks, Buildings)**:
    *   Depth is set once upon creation using their grid coordinates.
    *   Small offsets are added to resolve z-fighting on the same tile:
        *   `depth = gridX + gridY + 1` (Standard objects)
        *   `depth = (gridX+1) + (gridY+1) + 1` (Multi-tile buildings use their "front" corner).

2.  **Dynamic Objects (Villagers)**:
    *   Depth is updated **every frame** in `updateVillagers()`.
    *   We recalculate the fractional grid position from screen coordinates:
        ```typescript
        const { gridX, gridY } = screenToGrid(localX, localY)
        villager.setDepth(gridX + gridY + 1.5)
        ```
    *   The `+ 1.5` ensures a villager stands "in front" of a tree on the exact same tile, but "behind" a tree on the next tile down.

3.  **Forced Sorting**:
    *   In `update()`, we explicitly call:
        ```typescript
        this.objectsContainer.sort('depth')
        ```
    *   This is crucial because Phaser does not automatically re-sort containers every frame for performance reasons. Since villagers change depth constantly, we must force this.

## 3. Coordinate Systems

*   **World Coordinates**: `pointer.worldX` includes camera scroll.
*   **Container Coordinates**: To interact with the grid, we must convert world coordinates to the container's local space:
    ```typescript
    localX = pointer.worldX - terrainContainer.x
    localY = pointer.worldY - terrainContainer.y
    ```
*   **Sprite Positioning**: Sprites inside `objectsContainer` are positioned using these **local coordinates**.

## 4. Common Pitfalls to Avoid

*   **NEVER** use `depth = y` for isometric sorting if you have a grid system. It creates artifacts when sprite pivots don't align perfectly.
*   **NEVER** put tiles and sprites in the same flat array. Separating `ground` and `objects` simplifies the sorting workload significantly.
*   **ALWAYS** ensure Sprite Origins are at `(0.5, 1.0)` (Bottom Center) so the "feet" align with the depth coordinate.
