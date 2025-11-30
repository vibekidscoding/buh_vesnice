import Phaser from 'phaser'
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TERRAIN_COLORS,
  TERRAIN_CONFIG,
  TerrainType,
  VILLAGER_ANIM_INTERVAL,
  VILLAGER_SPEED,
  VILLAGER_SCALE_FACTOR,
  TREE_WORK_DURATION,
  WOOD_PER_DELIVERY,
  FOREST_TO_MEADOW_DELAY,
  TERRAIN_OBJECT_SCALES,
  ASSETS
} from '@/config/constants'
import { gridToScreen, screenToGrid } from '@/utils/isometric'
import { NoiseGenerator } from '@/utils/noise'
import type { Villager, CutTree, TerrainObjectData, BuildingType } from '@/types/game'
import { InputManager } from '@/systems/InputManager'
import { UIManager } from '@/ui/UIManager'

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
  
  // Building data map: "gridX,gridY" -> Building Data
  private buildingsMap: Map<string, { 
    type: BuildingType, 
    occupied: boolean, 
    sprite: Phaser.GameObjects.Image,
    emptyIndicator?: Phaser.GameObjects.Container 
  }> = new Map()
  
  private occupiedTiles: Set<string> = new Set() // Track occupied tiles (format: "x,y")

  // Cut tree tracking
  private cutTrees: CutTree[] = []

  // Villagers
  private villagers: Villager[] = []

  // Resources
  private woodCount: number = 0
  private noiseGenerator!: NoiseGenerator

  // Managers
  private inputManager!: InputManager
  private uiManager!: UIManager

  // Building placement
  private placementMode = false
  private placementBuildingType: BuildingType | null = null
  private ghostBuilding: Phaser.GameObjects.Image | null = null
  private justEnteredPlacementMode = false
  
  // Containers
  private terrainContainer!: Phaser.GameObjects.Container
  private groundContainer!: Phaser.GameObjects.Container
  private objectsContainer!: Phaser.GameObjects.Container
  
  private gridOverlay: Phaser.GameObjects.Graphics | null = null
  private placementHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    console.log('GameScene created')

    // Debug: Check if textures exist
    const texturesToCheck = ['house', 'teepee', 'tree', 'rocks', 'villager_walk_1']
    texturesToCheck.forEach(key => {
      const exists = this.textures.exists(key)
      console.log(`Texture '${key}' exists:`, exists)
      if (!exists) {
        console.warn(`WARNING: Texture '${key}' is missing! Creating placeholder.`)
        // Create a simple placeholder texture if missing
        const graphics = this.make.graphics({ x: 0, y: 0 })
        graphics.fillStyle(0xff00ff, 1)
        graphics.fillRect(0, 0, 256, 256)
        graphics.generateTexture(key, 256, 256)
      }
    })

    // Initialize noise generator
    this.noiseGenerator = new NoiseGenerator(Date.now())

    // Generate terrain
    this.generateTerrain()

    // Render terrain tiles
    this.renderTerrain()

    // Initialize Managers
    this.inputManager = new InputManager(this)
    this.uiManager = new UIManager(this, {
      onBuildSelect: (type: BuildingType) => this.enterPlacementMode(type)
    })
    this.uiManager.create()

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
    // Create main container for positioning
    this.terrainContainer = this.add.container(0, 0)
    
    // Create layers
    this.groundContainer = this.add.container(0, 0)
    this.objectsContainer = this.add.container(0, 0)
    
    // IMPORTANT: objectsContainer sorts children by depth (which will be set to Y)
    ;(this.objectsContainer as any).sortableChildren = true
    
    // Add layers to terrain container
    this.terrainContainer.add(this.groundContainer)
    this.terrainContainer.add(this.objectsContainer)

    // Store tree and rock data to create after container positioning
    const treeData: Array<{gridX: number, gridY: number, x: number, y: number}> = []
    const rockData: Array<{gridX: number, gridY: number, x: number, y: number}> = []

    // Draw tiles from top to bottom
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

        // No depth needed for tiles if added in order to groundContainer
        this.groundContainer.add(tile)
        
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
      this.createTerrainObject(ASSETS.TERRAIN.TREE, data, this.treeMap, this.trees)
    }

    // Create rocks using helper method
    console.log(`Creating ${rockData.length} rocks`)
    for (const data of rockData) {
      this.createTerrainObject(ASSETS.TERRAIN.ROCKS, data, this.rockMap, this.rocks)
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
    type: string,
    data: TerrainObjectData,
    targetMap: Map<string, Phaser.GameObjects.Image>,
    targetArray: Phaser.GameObjects.Image[]
  ): void {
    // Add to objects container, so use local coordinates (x, y) not world coordinates
    const object = this.add.image(data.x, data.y + TILE_HEIGHT, type)
    object.setOrigin(0.5, 1)
    
    // Determine scale based on type
    let scaleFactor = 1.0
    if (type === ASSETS.TERRAIN.TREE) scaleFactor = TERRAIN_OBJECT_SCALES.tree
    else if (type === ASSETS.TERRAIN.ROCKS) scaleFactor = TERRAIN_OBJECT_SCALES.rocks

    const scale = (TILE_WIDTH / object.width) * scaleFactor
    object.setScale(scale)

    // Depth based on grid position (gridX + gridY)
    // We use the data.gridX/Y directly for static objects for stability
    // Adding 1 ensures it sits above the flat tile at the same grid coord
    object.setDepth(data.gridX + data.gridY + 1)
    
    this.objectsContainer.add(object)
    targetArray.push(object)
    targetMap.set(`${data.gridX},${data.gridY}`, object)
  }

  /**
   * Enter building placement mode
   */
  private enterPlacementMode(buildingType: BuildingType): void {
    if (this.placementMode) return

    // Close any existing confirmation modal
    this.uiManager.hideConfirmation()

    this.placementMode = true
    this.placementBuildingType = buildingType
    this.justEnteredPlacementMode = true
    console.log(`Placement mode activated: ${buildingType}`)

    // Determine asset key
    let textureKey: string
    if (buildingType === 'villager') {
        textureKey = ASSETS.VILLAGERS.WALK_1
    } else if (buildingType === 'house') {
        textureKey = ASSETS.BUILDINGS.HOUSE
    } else {
        textureKey = ASSETS.BUILDINGS.TEEPEE
    }

    // Create ghost building sprite
    this.ghostBuilding = this.add.image(0, 0, textureKey)
    this.ghostBuilding.setAlpha(0.6)
    
    // Add to objects container so it sorts correctly with trees/rocks while moving
    this.objectsContainer.add(this.ghostBuilding)

    // Scale based on building type
    if (buildingType === 'house') {
      const houseScale = ((TILE_WIDTH * 2) / this.ghostBuilding.width) * 1.5
      this.ghostBuilding.setScale(houseScale)
    } else if (buildingType === 'teepee') {
      const teepeeScale = (TILE_WIDTH / this.ghostBuilding.width) * 0.8
      this.ghostBuilding.setScale(teepeeScale)
    } else {
        // Villager scale
        const villagerScale = (TILE_WIDTH / this.ghostBuilding.width) * VILLAGER_SCALE_FACTOR
        this.ghostBuilding.setScale(villagerScale)
    }
    this.ghostBuilding.setOrigin(0.5, 1)

    // Create grid overlay (only for buildings, optional for villagers)
    if (!this.gridOverlay) {
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
        this.gridOverlay.setDepth(999999) // Always on top of everything
        this.terrainContainer.add(this.gridOverlay)
    }

    // Add placement click handler
    this.placementHandler = (pointer: Phaser.Input.Pointer) => {
      // If we are dragging the camera, DO NOT place a building
      if (this.inputManager.isDragMoved) {
        console.log('Placement ignored: Camera was dragged')
        return
      }

      // Use inputManager.isDragMoved instead of local dragMoved
      if (!this.placementMode || !this.placementBuildingType) return

      // Ignore first click after entering placement mode (the button click itself)
      if (this.justEnteredPlacementMode) {
        this.justEnteredPlacementMode = false
        return
      }

      // Get world position relative to container
      const camera = this.cameras.main
      const worldX = pointer.x + camera.scrollX
      const worldY = pointer.y + camera.scrollY
      
      const localX = worldX - this.terrainContainer.x
      const localY = worldY - this.terrainContainer.y
      
      console.log(`Click at screen(${pointer.x},${pointer.y}) -> world(${worldX},${worldY}) -> local(${localX},${localY})`)

      // Convert local coordinate to grid
      const { gridX, gridY } = screenToGrid(localX, localY)

      // Check validity
      const size = this.placementBuildingType === 'house' ? 2 : 1
      // Villagers are 1x1 for placement check logic
      if (this.isValidPlacement(gridX, gridY, size)) {
        
        if (this.placementBuildingType === 'villager') {
            // Direct villager placement
            this.spawnVillager(gridX, gridY, 'teepee') // 'teepee' type just means wandering for now
            this.exitPlacementMode()
        } else {
            // Building placement
            if (this.placementBuildingType === 'house') {
                this.placeHouse(gridX, gridY)
            } else {
                this.placeTeepee(gridX, gridY)
            }
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
        // Villagers can walk on occupied tiles, but for now let's restrict spawning on top of trees/buildings
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

    // Create house sprite inside container
    const house = this.add.image(x, y + TILE_HEIGHT, ASSETS.BUILDINGS.HOUSE)
    const houseScale = ((TILE_WIDTH * 2) / house.width) * 1.5  // Same scale as ghost house
    house.setScale(houseScale)
    house.setOrigin(0.5, 1)
    
    // Grid-based depth. House is 2x2.
    // house.setDepth((gridX + 1) + (gridY + 1) + 1)
    // Switching to Y-based depth for correct visual overlap
    house.setDepth(house.y)
    
    // Mark as unoccupied initially
    // house.setTint(0x888888) // Removed tint
    
    this.objectsContainer.add(house)
    this.houses.push(house)
    
    // Create empty indicator
    // Position slightly above the house
    const indicatorY = house.y - (TILE_HEIGHT * 1.5) 
    const emptyIndicator = this.uiManager.createEmptyBuildingIndicator(house.x, indicatorY, house.depth + 1)
    this.objectsContainer.add(emptyIndicator)
    
    // Register building data
    this.buildingsMap.set(`${gridX},${gridY}`, { 
        type: 'house', 
        occupied: false, 
        sprite: house,
        emptyIndicator: emptyIndicator // Store reference
    })

    // Mark all 4 tiles as occupied
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        this.occupiedTiles.add(`${gridX + dx},${gridY + dy}`)
      }
    }

    console.log(`House placed at (${gridX}, ${gridY})`)

    // Exit placement mode immediately
    this.exitPlacementMode()

    // Show Confirmation Modal for Villager Spawn
    // We need world coordinates for the modal to appear near the house
    // Convert container coords (x,y) to world coords
    const worldX = x + this.terrainContainer.x
    const worldY = y + this.terrainContainer.y - 50 // Above house

    this.uiManager.showConfirmation(worldX, worldY, 
        () => {
            // Confirmed
            this.spawnVillager(gridX, gridY, 'house')
        },
        () => {
            // Cancelled
            console.log('Villager spawn skipped')
        }
    )
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

    // Create teepee sprite inside container
    const teepee = this.add.image(x, y + TILE_HEIGHT, ASSETS.BUILDINGS.TEEPEE)
    const teepeeScale = (TILE_WIDTH / teepee.width) * 0.8  // Same scale as ghost teepee
    teepee.setScale(teepeeScale)
    teepee.setOrigin(0.5, 1)
    
    // Grid-based depth
    // teepee.setDepth(gridX + gridY + 1)
    // Switching to Y-based depth
    teepee.setDepth(teepee.y)
    
    // Mark as unoccupied initially
    // teepee.setTint(0x888888) // Removed tint
    
    this.objectsContainer.add(teepee)
    this.teepees.push(teepee)
    
    // Create empty indicator
    const indicatorY = teepee.y - TILE_HEIGHT
    const emptyIndicator = this.uiManager.createEmptyBuildingIndicator(teepee.x, indicatorY, teepee.depth + 1)
    this.objectsContainer.add(emptyIndicator)
    
    // Register building data
    this.buildingsMap.set(`${gridX},${gridY}`, { 
        type: 'teepee', 
        occupied: false, 
        sprite: teepee,
        emptyIndicator: emptyIndicator
    })

    // Mark tile as occupied
    this.occupiedTiles.add(`${gridX},${gridY}`)

    console.log(`Teepee placed at (${gridX}, ${gridY})`)

    // Exit placement mode
    this.exitPlacementMode()

    // Show Confirmation Modal for Villager Spawn
    const worldX = x + this.terrainContainer.x
    const worldY = y + this.terrainContainer.y - 30

    this.uiManager.showConfirmation(worldX, worldY, 
        () => {
            this.spawnVillager(gridX, gridY, 'teepee')
        },
        () => {
            console.log('Villager spawn skipped')
        }
    )
  }

  /**
   * Spawn a villager at a building
   */
  private spawnVillager(gridX: number, gridY: number, type: BuildingType): void {
    const spawnX = gridX + 0.5
    const spawnY = gridY + 0.5
    const { x, y } = gridToScreen(spawnX, spawnY)

    // Create villager inside container
    const villager = this.add.image(x, y + TILE_HEIGHT, ASSETS.VILLAGERS.WALK_1)
    villager.setOrigin(0.5, 1)

    // Scale villager to be smaller than buildings
    const villagerScale = (TILE_WIDTH / villager.width) * VILLAGER_SCALE_FACTOR
    villager.setScale(villagerScale)

    // Initial depth based on Y
    villager.setDepth(villager.y)
    
    this.objectsContainer.add(villager)

    // Targets are in SCREEN coordinates relative to container
    let targetX = x
    let targetY = y + TILE_HEIGHT
    let targetGridX = gridX
    let targetGridY = gridY

    // Check if spawning at a building and mark it as occupied
    const buildingKey = `${gridX},${gridY}`
    const buildingData = this.buildingsMap.get(buildingKey)
    // We need to cast to any because TypeScript doesn't know about the new 'emptyIndicator' property on the map value yet without updating the Map definition locally, 
    // but simpler is just to access it. The map definition was actually updated in a previous step implicitly by usage, but let's be safe.
    if (buildingData && (type === 'house' || type === 'teepee')) {
        buildingData.occupied = true
        // buildingData.sprite.clearTint() // No longer using tint
        
        // Remove empty indicator
        if ((buildingData as any).emptyIndicator) {
            this.uiManager.hideEmptyBuildingIndicator((buildingData as any).emptyIndicator)
            ;(buildingData as any).emptyIndicator = undefined
        }
        
        console.log(`Building at ${buildingKey} is now occupied`)
    }

    if (type === 'house') {
      // Find nearest forest
      const forest = this.findNearestForest(gridX, gridY)
      if (forest) {
        const forestScreen = gridToScreen(forest.gridX + 0.5, forest.gridY + 0.5)
        targetX = forestScreen.x
        targetY = forestScreen.y + TILE_HEIGHT
        targetGridX = forest.gridX
        targetGridY = forest.gridY
      }
    } else {
      // Teepee villagers wander randomly
      const randomGridX = gridX + Phaser.Math.Between(-5, 5)
      const randomGridY = gridY + Phaser.Math.Between(-5, 5)
      const wanderScreen = gridToScreen(randomGridX, randomGridY)
      targetX = wanderScreen.x
      targetY = wanderScreen.y + TILE_HEIGHT
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
      homeX: x,
      homeY: y + TILE_HEIGHT,
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
          const texture = villager.animFrame === 0 ? ASSETS.VILLAGERS.WALK_1 : ASSETS.VILLAGERS.WALK_2
          villager.sprite.setTexture(texture)
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
                // Update UI via Manager
                this.uiManager.updateWoodCount(this.woodCount)
                console.log(`Wood delivered! Total: ${this.woodCount}`)
              }

              // Go to forest (use world coordinates)
              // Coordinates are relative to container now
              const { gridX, gridY } = screenToGrid(villager.sprite.x, villager.sprite.y - TILE_HEIGHT)
              const forest = this.findNearestForest(gridX, gridY)
              if (forest) {
                const forestScreen = gridToScreen(forest.gridX + 0.5, forest.gridY + 0.5)
                villager.targetX = forestScreen.x
                villager.targetY = forestScreen.y + TILE_HEIGHT
                villager.targetGridX = forest.gridX
                villager.targetGridY = forest.gridY
              }
            } else {
              // Arrived at forest - start working
              villager.state = 'working'
              villager.workTimer = 0
              villager.sprite.setTexture(ASSETS.VILLAGERS.WALK_1) // Stop on frame 1
              console.log('Villager started cutting wood')
            }
          } else {
            // Teepee villagers wander randomly
            const { gridX, gridY } = screenToGrid(villager.sprite.x, villager.sprite.y - TILE_HEIGHT)
            const randomGridX = gridX + Phaser.Math.Between(-10, 10)
            const randomGridY = gridY + Phaser.Math.Between(-10, 10)
            const wanderScreen = gridToScreen(randomGridX, randomGridY)
            villager.targetX = wanderScreen.x
            villager.targetY = wanderScreen.y + TILE_HEIGHT
          }
        } else {
          // Move towards target
          villager.sprite.x += (dx / distance) * villager.speed
          villager.sprite.y += (dy / distance) * villager.speed

          // Update depth to Y position
          villager.sprite.setDepth(villager.sprite.y)
        }
      }
      
      // New Logic: Check for nearby empty buildings to move in
      if (villager.state === 'walking' || villager.state === 'idle') {
        this.checkNearbyBuildings(villager)
      }
    }
  }

  /**
   * Check if villager is near an empty building and move in
   */
  private checkNearbyBuildings(villager: Villager): void {
    // Only checking if not already assigned a specific task (like cutting wood)
    // But currently 'walking' covers everything. We should ideally differentiate 'wandering' vs 'working_walk'
    // For this prototype, let's just check proximity to ANY empty building
    
    // Calculate current grid position
    const { gridX, gridY } = screenToGrid(villager.sprite.x, villager.sprite.y - TILE_HEIGHT)
    
    // Check if we are AT an empty building
    const key = `${gridX},${gridY}`
    const building = this.buildingsMap.get(key)
    
    if (building && !building.occupied && (building.type === 'house' || building.type === 'teepee')) {
        // Move in!
        building.occupied = true
        
        // Update visual: remove indicator
        if ((building as any).emptyIndicator) {
            this.uiManager.hideEmptyBuildingIndicator((building as any).emptyIndicator)
            ;(building as any).emptyIndicator = undefined
        }
        
        // Remove villager from game (they went inside)
        villager.sprite.destroy()
        const index = this.villagers.indexOf(villager)
        if (index > -1) {
            this.villagers.splice(index, 1)
        }
        
        console.log(`Villager moved into ${building.type} at ${key}`)
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

      // Position ghost building at grid location (relative to container)
      const size = this.placementBuildingType === 'house' ? 2 : 1
      const centerOffset = size === 2 ? 1.0 : 0.5
      const { x, y } = gridToScreen(gridX + centerOffset, gridY + centerOffset)
      
      this.ghostBuilding.setPosition(x, y + TILE_HEIGHT)

      // Update depth to Y position
      this.ghostBuilding.setDepth(this.ghostBuilding.y)

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

    // Delegate input update to manager
    this.inputManager.update()

    // Update villagers
    this.updateVillagers(this.game.loop.delta)

    // Update cut trees
    this.updateCutTrees(this.game.loop.delta)

    // Force sort objects by depth
    this.objectsContainer.sort('depth')
  }

  /**
   * Handle window resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Delegate UI resize to manager
    this.uiManager.handleResize(gameSize.width, gameSize.height)
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