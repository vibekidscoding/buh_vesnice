/**
 * Game Type Definitions
 */

export type BuildingType = 'house' | 'teepee'

export type VillagerState = 'idle' | 'walking' | 'working'

export interface Villager {
  sprite: Phaser.GameObjects.Image
  type: BuildingType
  state: VillagerState
  targetX: number
  targetY: number
  targetGridX: number
  targetGridY: number
  homeX: number
  homeY: number
  speed: number
  animFrame: number
  animTimer: number
  workTimer: number
  hasWood: boolean
}

export interface CutTree {
  gridX: number
  gridY: number
  timer: number
}

export interface TerrainObjectData {
  gridX: number
  gridY: number
  x: number
  y: number
}

export interface WorldPosition {
  worldX: number
  worldY: number
}
