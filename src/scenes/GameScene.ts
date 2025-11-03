import Phaser from 'phaser'
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TERRAIN_COLORS,
  TERRAIN_CONFIG,
  TerrainType,
  CAMERA_SPEED,
  VILLAGER_ANIM_INTERVAL,
  VILLAGER_SPEED,
  VILLAGER_SCALE_FACTOR,
  TREE_WORK_DURATION,
  WOOD_PER_DELIVERY,
  FOREST_TO_MEADOW_DELAY,
  TERRAIN_OBJECT_SCALES
} from '@/config/constants'
import { gridToScreen, screenToGrid, calculateDepth } from '@/utils/isometric'
import { gridToWorld } from '@/utils/coordinates'
import { NoiseGenerator } from '@/utils/noise'
import type { Villager, CutTree, TerrainObjectData, BuildingType } from '@/types/game'

/**
 * GameScene
 * Main gameplay scene with isometric terrain
 */
export class GameScene extends Phaser.Scene {
  private terrain: TerrainType[][] = []
  private tiles: Phaser.GameObjects.Graphics[] = []
  private tileGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map() // Map "x,y" -> tile graphics
  private trees: Phaser.GameObjects.Image[] = []
  private treeMap: Map<string, Phaser.GameObjects.Image> = new Map() // Map "x,y" -> tree sprite
  private rocks: Phaser.GameObjects.Image[] = []
  private rockMap: Map<string, Phaser.GameObjects.Image> = new Map() // Map "x,y" -> rock sprite
  private houses: Phaser.GameObjects.Image[] = []
  private teepees: Phaser.GameObjects.Image[] = []
  private occupiedTiles: Set<string> = new Set() // Track occupied tiles (format: "x,y")

  // Cut tree tracking
  private cutTrees: CutTree[] = []

  // Villagers
  private villagers: Villager[] = []

  // Resources
  private woodCount: number = 0
  private woodText: Phaser.GameObjects.Text | null = null
  private noiseGenerator!: NoiseGenerator
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragMoved = false

  // Building placement
  private placementMode = false
  private placementBuildingType: BuildingType | null = null
  private ghostBuilding: Phaser.GameObjects.Image | null = null
  private justEnteredPlacementMode = false
  private houseButton: Phaser.GameObjects.Image | null = null
  private teepeeButton: Phaser.GameObjects.Image | null = null
  private terrainContainer!: Phaser.GameObjects.Container
  private uiContainer!: Phaser.GameObjects.Container
  private menuBg: Phaser.GameObjects.Graphics | null = null
  private houseButtonBg: Phaser.GameObjects.Graphics | null = null
  private teepeeButtonBg: Phaser.GameObjects.Graphics | null = null
  private gridOverlay: Phaser.GameObjects.Graphics | null = null
  private placementHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    console.log('GameScene created')

    // Initialize noise generator
    this.noiseGenerator = new NoiseGenerator(Date.now())

    // Generate terrain
    this.generateTerrain()

    // Render terrain tiles
    this.renderTerrain()

    // Setup camera
    this.setupCamera()

    // Setup input
    this.setupInput()

    // Setup UI
    this.setupUI()

    // Listen for resize events
    this.scale.on('resize', this.handleResize, this)

    console.log(`World created: ${WORLD_WIDTH}x${WORLD_HEIGHT} tiles`)
  }

  /**
   * Generate terrain using noise
   */
  private generateTerrain(): void {
    this.terrain = []

    for (let gridY = 0; gridY < WORLD_HEIGHT; gridY++) {
      this.terrain[gridY] = []
      for (let gridX = 0; gridX < WORLD_WIDTH; gridX++) {
        // Get noise value (0-1)
        const noiseValue = this.noiseGenerator.octaveNoise(
          gridX * TERRAIN_CONFIG.noiseScale,
          gridY * TERRAIN_CONFIG.noiseScale,
          4,
          0.5
        )

        // Determine terrain type based on noise
        let terrainType: TerrainType
        if (noiseValue < TERRAIN_CONFIG.waterThreshold) {
          terrainType = TerrainType.WATER
        } else if (noiseValue > TERRAIN_CONFIG.forestThreshold) {
          terrainType = TerrainType.FOREST
        } else {
          // Meadow - with chance for rocks
          if (Math.random() < TERRAIN_CONFIG.rocksChance) {
            terrainType = TerrainType.ROCKS
          } else {
            terrainType = TerrainType.MEADOW
          }
        }

        this.terrain[gridY][gridX] = terrainType
      }
    }
  }

  /**
   * Render terrain tiles as isometric diamonds
   */
  private renderTerrain(): void {
    // Create a container for positioning (tiles only)
    this.terrainContainer = this.add.container(0, 0)
    // Tiles don't need depth sorting between themselves
    ;(this.terrainContainer as any).sortableChildren = false

    // Store tree and rock data to create after container positioning
    const treeData: Array<{gridX: number, gridY: number, x: number, y: number}> = []
    const rockData: Array<{gridX: number, gridY: number, x: number, y: number}> = []

    for (let gridY = 0; gridY < WORLD_HEIGHT; gridY++) {
      for (let gridX = 0; gridX < WORLD_WIDTH; gridX++) {
        const terrainType = this.terrain[gridY][gridX]
        const { x, y } = gridToScreen(gridX, gridY)

        // Create isometric diamond tile
        const tile = this.add.graphics()
        tile.fillStyle(TERRAIN_COLORS[terrainType], 1)

        // Draw diamond shape
        tile.beginPath()
        tile.moveTo(x, y) // Top point
        tile.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2) // Right point
        tile.lineTo(x, y + TILE_HEIGHT) // Bottom point
        tile.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2) // Left point
        tile.closePath()
        tile.fillPath()

        // Set depth for proper rendering order
        tile.setDepth(calculateDepth(gridX, gridY))

        this.terrainContainer.add(tile)
        this.tiles.push(tile)
        this.tileGraphicsMap.set(`${gridX},${gridY}`, tile)

        // Store tree data for later creation
        if (terrainType === TerrainType.FOREST) {
          treeData.push({ gridX, gridY, x, y })
          // Mark tree tiles as occupied
          this.occupiedTiles.add(`${gridX},${gridY}`)
        }

        // Store rock data for later creation
        if (terrainType === TerrainType.ROCKS) {
          rockData.push({ gridX, gridY, x, y })
          // Mark rock tiles as occupied
          this.occupiedTiles.add(`${gridX},${gridY}`)
        }
      }
    }

    // Center the world in the camera view
    const worldCenterX = 0
    const worldCenterY = WORLD_HEIGHT * TILE_HEIGHT / 2
    this.terrainContainer.setPosition(
      this.cameras.main.width / 2 - worldCenterX,
      100 - worldCenterY
    )

    // Make sure terrain follows camera
    this.terrainContainer.setScrollFactor(1, 1)

    // Create trees using helper method
    console.log(`Creating ${treeData.length} trees`)
    for (const data of treeData) {
      this.createTerrainObject('tree', data, this.treeMap, this.trees)
    }

    // Create rocks using helper method
    console.log(`Creating ${rockData.length} rocks`)
    for (const data of rockData) {
      this.createTerrainObject('rocks', data, this.rockMap, this.rocks)
    }

    console.log(`Total terrain tiles: ${WORLD_WIDTH * WORLD_HEIGHT}`)
    console.log(`Trees created: ${this.trees.length}, Rocks created: ${this.rocks.length}`)
  }

  /**
   * Create a terrain object (tree or rock) at given position
   * @param type - Type of terrain object ('tree' or 'rocks')
   * @param data - Position data for the object
   * @param targetMap - Map to store the created object
   * @param targetArray - Array to store the created object
   */
  private createTerrainObject(
    type: 'tree' | 'rocks',
    data: TerrainObjectData,
    targetMap: Map<string, Phaser.GameObjects.Image>,
    targetArray: Phaser.GameObjects.Image[]
  ): void {
    const { worldX, worldY } = gridToWorld(data.gridX, data.gridY, this.terrainContainer.x, this.terrainContainer.y)
    const object = this.add.image(worldX, worldY, type)
    object.setOrigin(0.5, 1)
    object.setScrollFactor(1, 1)

    const scaleFactor = TERRAIN_OBJECT_SCALES[type]
    const scale = (TILE_WIDTH / object.width) * scaleFactor
    object.setScale(scale)

    object.setDepth(worldY)
    targetArray.push(object)
    targetMap.set(`${data.gridX},${data.gridY}`, object)
  }

  /**
   * Setup camera controls
   */
  private setupCamera(): void {
    const camera = this.cameras.main

    // Remove camera bounds to allow free movement
    camera.removeBounds()

    // Enable camera dragging with mouse
    camera.setZoom(1)
  }

  /**
   * Setup keyboard and mouse input
   */
  private setupInput(): void {
    // Arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys()

    // WASD keys
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    // Mouse drag to pan
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if we clicked on an interactive UI object
      const uiAreaHeight = 100
      const inUIArea = pointer.y >= this.cameras.main.height - uiAreaHeight

      console.log('Global pointerdown, pointer.y:', pointer.y, 'height:', this.cameras.main.height, 'UI threshold:', this.cameras.main.height - uiAreaHeight, 'inUIArea:', inUIArea)

      // If in UI area, check if we hit an interactive object
      if (inUIArea) {
        // Don't start dragging in UI area, let UI buttons handle it
        return
      }

      // Outside UI area - allow camera dragging
      console.log('Setting isDragging = true')
      this.isDragging = true
      this.dragMoved = false
      this.dragStartX = pointer.x
      this.dragStartY = pointer.y
    })

    this.input.on('pointerup', () => {
      this.isDragging = false
      this.dragMoved = false
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.dragMoved = true
        const deltaX = pointer.x - this.dragStartX
        const deltaY = pointer.y - this.dragStartY

        this.cameras.main.scrollX -= deltaX
        this.cameras.main.scrollY -= deltaY

        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
      }
    })

    // Mouse wheel zoom (disabled)
    // this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
    //   const camera = this.cameras.main
    //   if (deltaY > 0) {
    //     camera.setZoom(Math.max(0.3, camera.zoom - 0.1))
    //   } else {
    //     camera.setZoom(Math.min(2, camera.zoom + 0.1))
    //   }
    // })
  }

  /**
   * Setup UI elements
   */
  private setupUI(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Create UI container that won't scroll with camera
    this.uiContainer = this.add.container(0, 0)
    this.uiContainer.setScrollFactor(0, 0)
    this.uiContainer.setDepth(10000)

    // Create building menu at bottom
    const menuBarHeight = 100
    const menuY = height - menuBarHeight / 2 // Center of menu bar
    this.menuBg = this.add.graphics()
    this.menuBg.fillStyle(0x2a2a2a, 0.9)
    this.menuBg.fillRect(0, height - menuBarHeight, width, menuBarHeight)
    this.menuBg.setScrollFactor(0, 0)
    this.menuBg.setDepth(10000)

    // Button settings
    const buttonSize = 60
    const buttonSpacing = 80
    const firstButtonX = 50

    // House button background
    this.houseButtonBg = this.add.graphics()
    this.houseButtonBg.fillStyle(0x4a4a4a, 1)
    this.houseButtonBg.fillRoundedRect(firstButtonX - buttonSize/2, menuY - buttonSize/2, buttonSize, buttonSize, 8)
    this.houseButtonBg.setScrollFactor(0, 0)
    this.houseButtonBg.setDepth(10001)

    // Create house button icon
    this.houseButton = this.add.image(firstButtonX, menuY, 'house')
    this.houseButton.setScale(0.15)
    this.houseButton.setScrollFactor(0, 0)
    this.houseButton.setDepth(10002)
    this.houseButton.setInteractive({ useHandCursor: true })

    this.houseButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('House button clicked, dragMoved:', this.dragMoved, 'isDragging:', this.isDragging)
      pointer.event.stopPropagation()
      this.enterPlacementMode('house')
    })
    this.houseButton.on('pointerover', () => {
      this.houseButton!.setTint(0xaaaaaa)
    })
    this.houseButton.on('pointerout', () => {
      this.houseButton!.clearTint()
    })

    // Teepee button background
    const teepeeButtonX = firstButtonX + buttonSpacing
    this.teepeeButtonBg = this.add.graphics()
    this.teepeeButtonBg.fillStyle(0x4a4a4a, 1)
    this.teepeeButtonBg.fillRoundedRect(teepeeButtonX - buttonSize/2, menuY - buttonSize/2, buttonSize, buttonSize, 8)
    this.teepeeButtonBg.setScrollFactor(0, 0)
    this.teepeeButtonBg.setDepth(10001)

    // Create teepee button icon
    this.teepeeButton = this.add.image(teepeeButtonX, menuY, 'teepee')
    this.teepeeButton.setScale(0.15)
    this.teepeeButton.setScrollFactor(0, 0)
    this.teepeeButton.setDepth(10002)
    this.teepeeButton.setInteractive({ useHandCursor: true })

    this.teepeeButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('Teepee button clicked, dragMoved:', this.dragMoved, 'isDragging:', this.isDragging)
      pointer.event.stopPropagation()
      this.enterPlacementMode('teepee')
    })
    this.teepeeButton.on('pointerover', () => {
      this.teepeeButton!.setTint(0xaaaaaa)
    })
    this.teepeeButton.on('pointerout', () => {
      this.teepeeButton!.clearTint()
    })

    // Resource counter at top
    this.woodText = this.add.text(20, 20, '🪵 Dřevo: 0', {
      font: '24px monospace',
      color: '#ffffff',
      backgroundColor: '#2a2a2a',
      padding: { x: 10, y: 5 }
    })
    this.woodText.setScrollFactor(0, 0)
    this.woodText.setDepth(10003)
  }

  /**
   * Enter building placement mode
   */
  private enterPlacementMode(buildingType: 'house' | 'teepee'): void {
    if (this.placementMode) return

    this.placementMode = true
    this.placementBuildingType = buildingType
    this.justEnteredPlacementMode = true
    console.log(`Placement mode activated: ${buildingType}`)

    // Create ghost building sprite
    this.ghostBuilding = this.add.image(0, 0, buildingType)
    this.ghostBuilding.setAlpha(0.6)
    // Depth will be set dynamically in update() based on grid position

    // Scale based on building type
    if (buildingType === 'house') {
      // Scale to fit 2x2 tiles (increased by 50% to cover area properly)
      const houseScale = ((TILE_WIDTH * 2) / this.ghostBuilding.width) * 1.5
      this.ghostBuilding.setScale(houseScale)
    } else {
      // Teepee is 1x1 (smaller multiplier for smaller building)
      const teepeeScale = (TILE_WIDTH / this.ghostBuilding.width) * 0.8
      this.ghostBuilding.setScale(teepeeScale)
    }
    this.ghostBuilding.setOrigin(0.5, 1)
    this.ghostBuilding.setScrollFactor(1, 1)

    // Create grid overlay
    this.gridOverlay = this.add.graphics()
    this.gridOverlay.lineStyle(1, 0xffffff, 0.2)

    // Draw isometric grid
    for (let gridY = 0; gridY <= WORLD_HEIGHT; gridY++) {
      for (let gridX = 0; gridX <= WORLD_WIDTH; gridX++) {
        const { x, y } = gridToScreen(gridX, gridY)

        // Draw vertical lines of the grid
        if (gridX < WORLD_WIDTH) {
          const nextRight = gridToScreen(gridX + 1, gridY)
          this.gridOverlay.lineBetween(x, y, nextRight.x, nextRight.y)
        }

        // Draw horizontal lines of the grid
        if (gridY < WORLD_HEIGHT) {
          const nextDown = gridToScreen(gridX, gridY + 1)
          this.gridOverlay.lineBetween(x, y, nextDown.x, nextDown.y)
        }
      }
    }

    this.gridOverlay.setDepth(8500) // Below ghost house
    this.terrainContainer.add(this.gridOverlay)

    // Add placement click handler
    this.placementHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.placementMode || this.dragMoved || !this.placementBuildingType) return

      // Ignore first click after entering placement mode (the button click itself)
      if (this.justEnteredPlacementMode) {
        this.justEnteredPlacementMode = false
        return
      }

      const worldX = pointer.x + this.cameras.main.scrollX - this.terrainContainer.x
      const worldY = pointer.y + this.cameras.main.scrollY - this.terrainContainer.y
      const { gridX, gridY } = screenToGrid(worldX, worldY)

      const size = this.placementBuildingType === 'house' ? 2 : 1
      if (this.isValidPlacement(gridX, gridY, size)) {
        if (this.placementBuildingType === 'house') {
          this.placeHouse(gridX, gridY)
        } else {
          this.placeTeepee(gridX, gridY)
        }
      }
    }

    this.input.on('pointerup', this.placementHandler)
  }

  /**
   * Exit building placement mode
   */
  private exitPlacementMode(): void {
    this.placementMode = false
    this.placementBuildingType = null

    if (this.ghostBuilding) {
      this.ghostBuilding.destroy()
      this.ghostBuilding = null
    }

    // Remove grid overlay
    if (this.gridOverlay) {
      this.gridOverlay.destroy()
      this.gridOverlay = null
    }

    // Remove placement handler
    if (this.placementHandler) {
      this.input.off('pointerup', this.placementHandler)
      this.placementHandler = null
    }

    console.log('Placement mode deactivated')
  }

  /**
   * Check if area is valid for building placement
   * @param size - 1 for 1x1 (teepee), 2 for 2x2 (house)
   */
  private isValidPlacement(gridX: number, gridY: number, size: number = 2): boolean {
    // Check all tiles in size x size grid
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const checkX = gridX + dx
        const checkY = gridY + dy

        // Check bounds
        if (checkX < 0 || checkX >= WORLD_WIDTH || checkY < 0 || checkY >= WORLD_HEIGHT) {
          return false
        }

        // Check water
        if (this.terrain[checkY][checkX] === TerrainType.WATER) {
          return false
        }

        // Check occupied (trees, buildings)
        if (this.occupiedTiles.has(`${checkX},${checkY}`)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Place house at grid position
   */
  private placeHouse(gridX: number, gridY: number): void {
    if (!this.isValidPlacement(gridX, gridY)) {
      return
    }

    // Calculate center position of 2x2 area
    const centerX = gridX + 1.0  // Center of 2x2 area
    const centerY = gridY + 1.0
    const { x, y } = gridToScreen(centerX, centerY)

    // Create house sprite - use world coordinates for Y-based depth sorting
    const worldX = x + this.terrainContainer.x
    const worldY = y + TILE_HEIGHT + this.terrainContainer.y
    const house = this.add.image(worldX, worldY, 'house')
    const houseScale = ((TILE_WIDTH * 2) / house.width) * 1.5  // Same scale as ghost house
    house.setScale(houseScale)
    house.setOrigin(0.5, 1)
    house.setScrollFactor(1, 1)

    // Use Y position as depth for proper isometric sorting
    house.setDepth(worldY)
    console.log(`House placed at grid (${gridX}, ${gridY}) to (${gridX+1}, ${gridY+1}), worldY: ${worldY}, depth: ${house.depth}`)

    this.houses.push(house)

    // Mark all 4 tiles as occupied
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        this.occupiedTiles.add(`${gridX + dx},${gridY + dy}`)
      }
    }

    console.log(`House placed at (${gridX}, ${gridY})`)

    // Exit placement mode
    this.exitPlacementMode()

    // Spawn villager at house
    this.spawnVillager(gridX, gridY, 'house')
  }

  /**
   * Place teepee at grid position (1x1)
   */
  private placeTeepee(gridX: number, gridY: number): void {
    if (!this.isValidPlacement(gridX, gridY, 1)) {
      return
    }

    // Calculate center position of 1x1 tile
    const centerX = gridX + 0.5
    const centerY = gridY + 0.5
    const { x, y } = gridToScreen(centerX, centerY)

    // Create teepee sprite - use world coordinates for Y-based depth sorting
    const worldX = x + this.terrainContainer.x
    const worldY = y + TILE_HEIGHT + this.terrainContainer.y
    const teepee = this.add.image(worldX, worldY, 'teepee')
    const teepeeScale = (TILE_WIDTH / teepee.width) * 0.8  // Same scale as ghost teepee
    teepee.setScale(teepeeScale)
    teepee.setOrigin(0.5, 1)
    teepee.setScrollFactor(1, 1)

    // Use Y position as depth for proper isometric sorting
    teepee.setDepth(worldY)
    console.log(`Teepee placed at grid (${gridX}, ${gridY}), worldY: ${worldY}, depth: ${teepee.depth}`)

    this.teepees.push(teepee)

    // Mark tile as occupied
    this.occupiedTiles.add(`${gridX},${gridY}`)

    console.log(`Teepee placed at (${gridX}, ${gridY})`)

    // Exit placement mode
    this.exitPlacementMode()

    // Spawn villager at teepee
    this.spawnVillager(gridX, gridY, 'teepee')
  }

  /**
   * Spawn a villager at a building
   */
  private spawnVillager(gridX: number, gridY: number, type: BuildingType): void {
    const spawnX = gridX + 0.5
    const spawnY = gridY + 0.5
    const { x, y } = gridToScreen(spawnX, spawnY)

    // Create villager using world coordinates for Y-based depth sorting
    const worldX = x + this.terrainContainer.x
    const worldY = y + TILE_HEIGHT + this.terrainContainer.y
    const villager = this.add.image(worldX, worldY, 'villager_walk_1')
    villager.setOrigin(0.5, 1)
    villager.setScrollFactor(1, 1)

    // Scale villager to be smaller than buildings
    const villagerScale = (TILE_WIDTH / villager.width) * VILLAGER_SCALE_FACTOR
    villager.setScale(villagerScale)

    // Use Y position as depth for proper isometric sorting
    villager.setDepth(worldY)

    // Find initial target based on type (use world coordinates)
    let targetX = worldX
    let targetY = worldY
    let targetGridX = gridX
    let targetGridY = gridY

    if (type === 'house') {
      // Find nearest forest
      const forest = this.findNearestForest(gridX, gridY)
      if (forest) {
        const forestScreen = gridToScreen(forest.gridX + 0.5, forest.gridY + 0.5)
        targetX = forestScreen.x + this.terrainContainer.x
        targetY = forestScreen.y + TILE_HEIGHT + this.terrainContainer.y
        targetGridX = forest.gridX
        targetGridY = forest.gridY
      }
    } else {
      // Teepee villagers wander randomly
      const randomGridX = gridX + Phaser.Math.Between(-5, 5)
      const randomGridY = gridY + Phaser.Math.Between(-5, 5)
      const wanderScreen = gridToScreen(randomGridX, randomGridY)
      targetX = wanderScreen.x + this.terrainContainer.x
      targetY = wanderScreen.y + TILE_HEIGHT + this.terrainContainer.y
      targetGridX = randomGridX
      targetGridY = randomGridY
    }

    this.villagers.push({
      sprite: villager,
      type,
      state: 'walking',
      targetX,
      targetY,
      targetGridX,
      targetGridY,
      homeX: worldX,
      homeY: worldY,
      speed: VILLAGER_SPEED,
      animFrame: 0,
      animTimer: 0,
      workTimer: 0,
      hasWood: false
    })

    console.log(`Villager spawned at (${gridX}, ${gridY}), type: ${type}`)
  }

  /**
   * Find nearest forest tile
   */
  private findNearestForest(fromX: number, fromY: number): { gridX: number, gridY: number } | null {
    let nearest: { gridX: number, gridY: number, dist: number } | null = null

    for (let gridY = 0; gridY < WORLD_HEIGHT; gridY++) {
      for (let gridX = 0; gridX < WORLD_WIDTH; gridX++) {
        if (this.terrain[gridY][gridX] === TerrainType.FOREST) {
          const dist = Math.abs(gridX - fromX) + Math.abs(gridY - fromY)
          if (!nearest || dist < nearest.dist) {
            nearest = { gridX, gridY, dist }
          }
        }
      }
    }

    return nearest ? { gridX: nearest.gridX, gridY: nearest.gridY } : null
  }

  /**
   * Update villager movement and animation
   */
  private updateVillagers(delta: number): void {
    for (const villager of this.villagers) {
      // Update animation timer (only when walking)
      if (villager.state === 'walking') {
        villager.animTimer += delta
        if (villager.animTimer > VILLAGER_ANIM_INTERVAL) {
          villager.animTimer = 0
          villager.animFrame = (villager.animFrame + 1) % 2
          villager.sprite.setTexture(villager.animFrame === 0 ? 'villager_walk_1' : 'villager_walk_2')
        }
      }

      // Handle working state (cutting trees)
      if (villager.state === 'working') {
        villager.workTimer += delta
        if (villager.workTimer > TREE_WORK_DURATION) {
          villager.workTimer = 0
          villager.state = 'walking'
          villager.hasWood = true

          // Remove the tree sprite
          const treeKey = `${villager.targetGridX},${villager.targetGridY}`
          const tree = this.treeMap.get(treeKey)
          if (tree) {
            tree.destroy()
            this.treeMap.delete(treeKey)
            console.log(`Tree at (${villager.targetGridX}, ${villager.targetGridY}) cut down`)
          }

          // Add to cut trees list for meadow conversion after 5 seconds
          this.cutTrees.push({
            gridX: villager.targetGridX,
            gridY: villager.targetGridY,
            timer: 0
          })

          // Go home
          villager.targetX = villager.homeX
          villager.targetY = villager.homeY
          console.log('Villager finished cutting wood, going home')
        }
        continue // Skip movement while working
      }

      // Update position
      if (villager.state === 'walking') {
        const dx = villager.targetX - villager.sprite.x
        const dy = villager.targetY - villager.sprite.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 5) {
          // Reached target
          if (villager.type === 'house') {
            // Check if at home or at forest
            const isAtHome = Math.abs(villager.sprite.x - villager.homeX) < 10

            if (isAtHome) {
              // Arrived home
              if (villager.hasWood) {
                // Deliver wood
                this.woodCount += WOOD_PER_DELIVERY
                villager.hasWood = false
                if (this.woodText) {
                  this.woodText.setText(`🪵 Dřevo: ${this.woodCount}`)
                }
                console.log(`Wood delivered! Total: ${this.woodCount}`)
              }

              // Go to forest (use world coordinates)
              const { gridX, gridY } = screenToGrid(villager.sprite.x - this.terrainContainer.x, villager.sprite.y - this.terrainContainer.y - TILE_HEIGHT)
              const forest = this.findNearestForest(gridX, gridY)
              if (forest) {
                const forestScreen = gridToScreen(forest.gridX + 0.5, forest.gridY + 0.5)
                villager.targetX = forestScreen.x + this.terrainContainer.x
                villager.targetY = forestScreen.y + TILE_HEIGHT + this.terrainContainer.y
                villager.targetGridX = forest.gridX
                villager.targetGridY = forest.gridY
              }
            } else {
              // Arrived at forest - start working
              villager.state = 'working'
              villager.workTimer = 0
              villager.sprite.setTexture('villager_walk_1') // Stop on frame 1
              console.log('Villager started cutting wood')
            }
          } else {
            // Teepee villagers wander randomly (use world coordinates)
            const { gridX, gridY } = screenToGrid(villager.sprite.x - this.terrainContainer.x, villager.sprite.y - this.terrainContainer.y - TILE_HEIGHT)
            const randomGridX = gridX + Phaser.Math.Between(-10, 10)
            const randomGridY = gridY + Phaser.Math.Between(-10, 10)
            const wanderScreen = gridToScreen(randomGridX, randomGridY)
            villager.targetX = wanderScreen.x + this.terrainContainer.x
            villager.targetY = wanderScreen.y + TILE_HEIGHT + this.terrainContainer.y
          }
        } else {
          // Move towards target
          villager.sprite.x += (dx / distance) * villager.speed
          villager.sprite.y += (dy / distance) * villager.speed

          // Update depth based on Y position for proper isometric sorting
          villager.sprite.setDepth(villager.sprite.y)
        }
      }
    }
  }

  update(): void {
    // Placement mode: update ghost building position
    if (this.placementMode && this.ghostBuilding && this.placementBuildingType) {
      const pointer = this.input.activePointer
      const worldX = pointer.x + this.cameras.main.scrollX - this.terrainContainer.x
      const worldY = pointer.y + this.cameras.main.scrollY - this.terrainContainer.y

      // Convert to grid coordinates
      const { gridX, gridY } = screenToGrid(worldX, worldY)

      // Position ghost building at grid location (use world coordinates)
      const size = this.placementBuildingType === 'house' ? 2 : 1
      const centerOffset = size === 2 ? 1.0 : 0.5
      const { x, y } = gridToScreen(gridX + centerOffset, gridY + centerOffset)
      const ghostWorldX = x + this.terrainContainer.x
      const ghostWorldY = y + TILE_HEIGHT + this.terrainContainer.y
      this.ghostBuilding.setPosition(ghostWorldX, ghostWorldY)

      // Update depth based on Y position for proper isometric sorting
      this.ghostBuilding.setDepth(ghostWorldY)

      // Check if valid placement and tint accordingly
      const valid = this.isValidPlacement(gridX, gridY, size)
      if (valid) {
        this.ghostBuilding.setTint(0x00ff00) // Green = valid
      } else {
        this.ghostBuilding.setTint(0xff0000) // Red = invalid
      }

      // Cancel with right click or ESC
      const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      if (pointer.rightButtonDown() || escKey.isDown) {
        this.exitPlacementMode()
      }
    }

    // Camera movement with arrow keys or WASD (always enabled)
    const camera = this.cameras.main

    // Check if keyboard input is available
    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        camera.scrollX -= CAMERA_SPEED
      }
      if (this.cursors.right.isDown || this.wasd.D.isDown) {
        camera.scrollX += CAMERA_SPEED
      }

      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        camera.scrollY -= CAMERA_SPEED
      }
      if (this.cursors.down.isDown || this.wasd.S.isDown) {
        camera.scrollY += CAMERA_SPEED
      }
    }

    // Update villagers
    this.updateVillagers(this.game.loop.delta)

    // Update cut trees
    this.updateCutTrees(this.game.loop.delta)
  }

  /**
   * Handle window resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width
    const height = gameSize.height

    // Update camera viewport
    this.cameras.main.setSize(width, height)

    // Update UI positions to match new screen size
    if (this.woodText) {
      // Keep wood counter at top-left
      this.woodText.setPosition(20, 20)
    }

    // Update building buttons at bottom
    const menuY = height - 60
    const firstButtonX = width / 2 - 60
    const teepeeButtonX = width / 2 + 60

    if (this.houseButtonBg) {
      this.houseButtonBg.setPosition(firstButtonX, menuY)
    }
    if (this.houseButton) {
      this.houseButton.setPosition(firstButtonX, menuY)
    }
    if (this.teepeeButtonBg) {
      this.teepeeButtonBg.setPosition(teepeeButtonX, menuY)
    }
    if (this.teepeeButton) {
      this.teepeeButton.setPosition(teepeeButtonX, menuY)
    }
  }

  /**
   * Update cut trees - convert to meadow after 5 seconds
   */
  private updateCutTrees(delta: number): void {
    for (let i = this.cutTrees.length - 1; i >= 0; i--) {
      const cutTree = this.cutTrees[i]
      cutTree.timer += delta

      if (cutTree.timer > FOREST_TO_MEADOW_DELAY) {
        // Change terrain type to meadow
        this.terrain[cutTree.gridY][cutTree.gridX] = TerrainType.MEADOW

        // Update tile graphics
        const tileKey = `${cutTree.gridX},${cutTree.gridY}`
        const tile = this.tileGraphicsMap.get(tileKey)
        if (tile) {
          tile.clear()
          tile.fillStyle(TERRAIN_COLORS[TerrainType.MEADOW], 1)

          const { x, y } = gridToScreen(cutTree.gridX, cutTree.gridY)
          // Draw diamond shape
          tile.beginPath()
          tile.moveTo(x, y) // Top point
          tile.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2) // Right point
          tile.lineTo(x, y + TILE_HEIGHT) // Bottom point
          tile.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2) // Left point
          tile.closePath()
          tile.fillPath()
        }

        // Remove from occupied tiles
        this.occupiedTiles.delete(`${cutTree.gridX},${cutTree.gridY}`)

        // Remove from cutTrees list
        this.cutTrees.splice(i, 1)

        console.log(`Forest at (${cutTree.gridX}, ${cutTree.gridY}) converted to meadow`)
      }
    }
  }
}
