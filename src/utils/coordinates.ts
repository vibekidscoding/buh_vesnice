/**
 * Coordinate conversion helper utilities
 * Combines grid-to-screen conversion with world/container positioning
 */

import { gridToScreen, screenToGrid, type GridPosition } from './isometric'
import { TILE_HEIGHT } from '@/config/constants'
import type { WorldPosition } from '@/types/game'

/**
 * Convert grid coordinates to world coordinates
 * Combines gridToScreen with container offset and tile height
 */
export function gridToWorld(
  gridX: number,
  gridY: number,
  containerX: number,
  containerY: number
): WorldPosition {
  const { x, y } = gridToScreen(gridX, gridY)
  return {
    worldX: x + containerX,
    worldY: y + TILE_HEIGHT + containerY
  }
}

/**
 * Convert world coordinates back to grid coordinates
 * Removes container offset before converting to grid
 */
export function worldToGrid(
  worldX: number,
  worldY: number,
  containerX: number,
  containerY: number
): GridPosition {
  const localX = worldX - containerX
  const localY = worldY - containerY - TILE_HEIGHT
  return screenToGrid(localX, localY)
}

/**
 * Get world coordinates for building center
 * Calculates center based on building size
 */
export function getBuildingCenter(
  gridX: number,
  gridY: number,
  centerOffset: number,
  containerX: number,
  containerY: number
): WorldPosition {
  return gridToWorld(
    gridX + centerOffset,
    gridY + centerOffset,
    containerX,
    containerY
  )
}
