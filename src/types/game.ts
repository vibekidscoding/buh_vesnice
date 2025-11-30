/**
 * Game Type Definitions
 */

export type BuildingType = 'house' | 'teepee' | 'villager'

export type VillagerState = 'idle' | 'walking' | 'working'

export interface Building {
  sprite: Phaser.GameObjects.Image
  type: BuildingType
  gridX: number
  gridY: number
  occupied: boolean
  emptyIndicator?: Phaser.GameObjects.Container // Use container for icon+text
}

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
  assignedBuilding?: Building
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
