/**
 * Game Constants
 * All game-wide constants and configuration values
 */

// Isometric tile dimensions
export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

// World settings
export const WORLD_WIDTH = 100  // Number of tiles horizontally
export const WORLD_HEIGHT = 100 // Number of tiles vertically

// Camera settings
export const CAMERA_SPEED = 8
export const CAMERA_DRAG_SPEED = 1
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2
export const ZOOM_SPEED = 0.1

// Terrain types
export enum TerrainType {
  MEADOW = 'meadow',   // Louka (light green)
  FOREST = 'forest',   // Les (dark green)
  WATER = 'water',     // Voda (blue)
  ROCKS = 'rocks'      // Skály (gray)
}

// Terrain colors (hex values)
export const TERRAIN_COLORS = {
  [TerrainType.MEADOW]: 0x90EE90,  // Light green
  [TerrainType.FOREST]: 0x228B22,  // Forest green
  [TerrainType.WATER]: 0x4682B4,   // Steel blue
  [TerrainType.ROCKS]: 0x808080    // Gray
}

// Terrain generation settings
export const TERRAIN_CONFIG = {
  waterThreshold: 0.3,    // Below this = water
  forestThreshold: 0.6,   // Above this = forest
  rocksChance: 0.01,      // 1% chance for rocks on meadow tiles
  // Between water and forest = meadow
  noiseScale: 0.05        // Scale for noise generation (smaller = larger features)
}

// Game settings
export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const GAME_TITLE = 'Bůh Vesnice'

// Villager settings
export const VILLAGER_ANIM_INTERVAL = 300  // ms between animation frames
export const VILLAGER_SPEED = 1
export const VILLAGER_SCALE_FACTOR = 0.4

// Work timings
export const TREE_WORK_DURATION = 2000  // ms to cut a tree
export const WOOD_PER_DELIVERY = 3
export const FOREST_TO_MEADOW_DELAY = 5000  // ms before forest becomes meadow

// Building settings
export const BUILDING_CONFIG = {
  house: {
    size: 2,        // 2x2 tiles
    centerOffset: 1.0,
    scaleFactor: 1.5,
    textureKey: 'house'
  },
  teepee: {
    size: 1,        // 1x1 tile
    centerOffset: 0.5,
    scaleFactor: 0.8,
    textureKey: 'teepee'
  }
} as const

// Terrain object scale factors
export const TERRAIN_OBJECT_SCALES = {
  tree: 1.2,
  rocks: 1.0
} as const
