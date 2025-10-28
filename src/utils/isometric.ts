import { TILE_WIDTH, TILE_HEIGHT } from '@/config/constants'

/**
 * Isometric coordinate conversion utilities
 *
 * Coordinate systems:
 * - Grid coordinates (gridX, gridY): Integer tile positions in the logical grid
 * - Screen coordinates (x, y): Pixel positions for rendering
 */

export interface GridPosition {
  gridX: number
  gridY: number
}

export interface ScreenPosition {
  x: number
  y: number
}

/**
 * Convert grid coordinates to screen (isometric) coordinates
 * @param gridX Grid X position
 * @param gridY Grid Y position
 * @returns Screen position {x, y}
 */
export function gridToScreen(gridX: number, gridY: number): ScreenPosition {
  const x = (gridX - gridY) * (TILE_WIDTH / 2)
  const y = (gridX + gridY) * (TILE_HEIGHT / 2)
  return { x, y }
}

/**
 * Convert screen coordinates to grid coordinates
 * @param screenX Screen X position
 * @param screenY Screen Y position
 * @returns Grid position {gridX, gridY}
 */
export function screenToGrid(screenX: number, screenY: number): GridPosition {
  const gridX = Math.floor((screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2)
  const gridY = Math.floor((screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2)
  return { gridX, gridY }
}

/**
 * Calculate Z-depth for proper layering in isometric view
 * In isometric, objects with higher (gridX + gridY) appear lower on screen
 * and should render on top of objects with lower values
 * @param gridX Grid X position
 * @param gridY Grid Y position
 * @returns Z-depth value
 */
export function calculateDepth(gridX: number, gridY: number): number {
  return (gridX + gridY) * 100
}

/**
 * Check if grid position is within bounds
 * @param gridX Grid X position
 * @param gridY Grid Y position
 * @param maxX Maximum X bound
 * @param maxY Maximum Y bound
 * @returns True if position is valid
 */
export function isValidGridPosition(
  gridX: number,
  gridY: number,
  maxX: number,
  maxY: number
): boolean {
  return gridX >= 0 && gridX < maxX && gridY >= 0 && gridY < maxY
}
