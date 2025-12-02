import Phaser from 'phaser'
import { UI_CONFIG, ASSETS, TIME_CONFIG } from '@/config/constants'
import { BuildingType } from '@/types/game'

export interface UIEvents {
  onBuildSelect: (type: BuildingType) => void
}

export class UIManager {
  private scene: Phaser.Scene
  private events: UIEvents
  
  private woodText: Phaser.GameObjects.Text | null = null
  private menuBg: Phaser.GameObjects.Graphics | null = null
  
  // Store button containers for easy repositioning
  private houseButtonContainer: Phaser.GameObjects.Container | null = null
  private teepeeButtonContainer: Phaser.GameObjects.Container | null = null
  private villagerButtonContainer: Phaser.GameObjects.Container | null = null
  
  // Confirmation Modal
  private confirmContainer: Phaser.GameObjects.Container | null = null
  
  // Clock UI
  private clockContainer: Phaser.GameObjects.Container | null = null
  private clockHand: Phaser.GameObjects.Line | null = null
  private clockIcon: Phaser.GameObjects.Text | null = null

  // Container for all UI elements
  private container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, events: UIEvents) {
    this.scene = scene
    this.events = events
    this.container = this.scene.add.container(0, 0)
    this.container.setScrollFactor(0, 0)
    this.container.setDepth(UI_CONFIG.depths.uiContainer)
  }

  public create(): void {
    this.createResourceDisplay()
    this.createBuildingMenu()
    this.createClock()
  }

  private createResourceDisplay(): void {
    this.woodText = this.scene.add.text(20, 20, '🪵 Dřevo: 0', {
      font: '24px monospace',
      color: UI_CONFIG.colors.textWhite,
      backgroundColor: UI_CONFIG.colors.textBackground,
      padding: { x: 10, y: 5 }
    })
    this.container.add(this.woodText)
  }

  private createBuildingMenu(): void {
    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height
    
    // Menu Background
    this.menuBg = this.scene.add.graphics()
    this.menuBg.fillStyle(UI_CONFIG.colors.menuBackground, UI_CONFIG.alphas.menuBackground)
    this.menuBg.fillRect(0, height - UI_CONFIG.menuBarHeight, width, UI_CONFIG.menuBarHeight)
    this.container.add(this.menuBg)

    // Buttons
    const menuY = height - UI_CONFIG.menuBarHeight / 2
    const firstButtonX = UI_CONFIG.firstButtonX
    
    // House Button
    this.houseButtonContainer = this.createButton(firstButtonX, menuY, ASSETS.BUILDINGS.HOUSE, 'house')
    
    // Teepee Button
    const teepeeButtonX = firstButtonX + UI_CONFIG.buttonSpacing
    this.teepeeButtonContainer = this.createButton(teepeeButtonX, menuY, ASSETS.BUILDINGS.TEEPEE, 'teepee')

    // Villager Button
    const villagerButtonX = teepeeButtonX + UI_CONFIG.buttonSpacing
    this.villagerButtonContainer = this.createButton(villagerButtonX, menuY, ASSETS.UI.VILLAGER_ICON, 'villager')
    
    this.container.add([this.houseButtonContainer, this.teepeeButtonContainer, this.villagerButtonContainer])
  }

  private createButton(x: number, y: number, texture: string, type: BuildingType): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    // Background
    const bg = this.scene.add.graphics()
    bg.fillStyle(UI_CONFIG.colors.buttonBackground, 1)
    bg.fillRoundedRect(
      -UI_CONFIG.buttonSize/2, 
      -UI_CONFIG.buttonSize/2, 
      UI_CONFIG.buttonSize, 
      UI_CONFIG.buttonSize, 
      8
    )
    
    // Icon
    const icon = this.scene.add.image(0, 0, texture)
    icon.setScale(0.15)
    
    container.add([bg, icon])
    
    // Make the container interactive
    container.setSize(UI_CONFIG.buttonSize, UI_CONFIG.buttonSize)
    container.setScrollFactor(0)
    container.setInteractive({ useHandCursor: true })
    
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.events.onBuildSelect(type)
    })
    
    container.on('pointerover', () => {
      icon.setTint(UI_CONFIG.colors.hoverTint)
    })
    
    container.on('pointerout', () => {
      icon.clearTint()
    })
    
    return container
  }

  /**
   * Show a confirmation modal at screen coordinates
   * @param x Screen X
   * @param y Screen Y
   * @param onConfirm Callback if confirmed
   * @param onCancel Callback if cancelled
   */
  public showConfirmation(x: number, y: number, onConfirm: () => void, onCancel: () => void): void {
    // Destroy existing modal if any
    this.hideConfirmation()

    this.confirmContainer = this.scene.add.container(x, y)
    this.confirmContainer.setDepth(UI_CONFIG.depths.confirmModal)
    this.confirmContainer.setScrollFactor(1) // Moves with world camera

    // Background Panel
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x000000, 0.8)
    bg.fillRoundedRect(-60, -30, 120, 60, 8)
    
    // Text "Obsadit?"
    const text = this.scene.add.text(0, -20, 'Obsadit?', { font: '14px monospace', color: '#fff' })
    text.setOrigin(0.5)

    // Check Button (Green Tick)
    const checkBtn = this.createIconBtn(25, 10, UI_CONFIG.colors.confirmGreen, '✓', () => {
      this.hideConfirmation()
      onConfirm()
    })

    // Cross Button (Red X)
    const crossBtn = this.createIconBtn(-25, 10, UI_CONFIG.colors.cancelRed, '✕', () => {
      this.hideConfirmation()
      onCancel()
    })

    this.confirmContainer.add([bg, text, checkBtn, crossBtn])
  }

  public hideConfirmation(): void {
    if (this.confirmContainer) {
      this.confirmContainer.destroy()
      this.confirmContainer = null
    }
  }

  private createIconBtn(x: number, y: number, color: number, symbol: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const size = 24

    const bg = this.scene.add.graphics()
    bg.fillStyle(color, 1)
    bg.fillCircle(0, 0, size/2)

    const text = this.scene.add.text(0, 0, symbol, { font: '16px monospace', color: '#fff' })
    text.setOrigin(0.5)

    container.add([bg, text])
    container.setSize(size, size)
    container.setInteractive({ useHandCursor: true })
    
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      onClick()
    })

    return container
  }

  private createClock(): void {
    const size = TIME_CONFIG.uiSize || 50 // Use TIME_CONFIG for size
    const x = this.scene.cameras.main.width - size - 20
    const y = size + 20

    this.clockContainer = this.scene.add.container(x, y)
    this.clockContainer.setScrollFactor(0, 0)
    this.clockContainer.setDepth(UI_CONFIG.depths.clock)

    // Clock Face
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x333333, 0.8)
    bg.fillCircle(0, 0, size / 2)
    bg.lineStyle(2, 0xffffff, 1)
    bg.strokeCircle(0, 0, size / 2)

    // Sky representation (half blue, half black)
    const sky = this.scene.add.graphics()
    // Day half
    sky.fillStyle(0x87CEEB, 1) // Sky Blue
    sky.slice(0, 0, size/2 - 4, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false)
    sky.fillPath()
    // Night half
    sky.fillStyle(0x000033, 1) // Dark Blue
    sky.slice(0, 0, size/2 - 4, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false)
    sky.fillPath()

    // Hand
    this.clockHand = this.scene.add.line(0, 0, 0, 0, 0, -size/2 + 5, 0xff0000, 1)
    this.clockHand.setLineWidth(2)

    // Sun/Moon Icon (Text for simplicity)
    this.clockIcon = this.scene.add.text(0, 0, '☀️', { font: '20px Arial' })
    this.clockIcon.setOrigin(0.5)

    this.clockContainer.add([bg, sky, this.clockHand, this.clockIcon])
    this.container.add(this.clockContainer)
  }

  public updateClock(progress: number): void {
    if (this.clockHand && this.clockIcon) {
        // Rotate hand: 0.0 is midnight (down), 0.5 is noon (up)
        // Angle 0 is RIGHT in Phaser. We want 0.0 (Midnight) to be DOWN (90 deg)
        // Progress 0 -> 90 deg
        // Progress 0.25 (Dawn) -> 180 deg (Left) - Wait, typical clock? 
        // Let's do: 0.0 (Midnight) -> Bottom, 0.5 (Noon) -> Top
        
        // Rotation angle (0 to 360 degrees based on progress)
        // We want the hand to point to the current "sky" sector
        // Let's say 0.5 (Noon) = -90 deg (Up)
        // 0.0 (Midnight) = 90 deg (Down)
        const angle = (progress * 360) + 90
        this.clockHand.setAngle(angle)

        // Update Icon
        if (progress > 0.25 && progress < 0.75) {
            this.clockIcon.setText('☀️')
        } else {
            this.clockIcon.setText('🌙')
        }
    }
  }

  /**
   * Create an indicator for an empty building
   * @param x World X position
   * @param y World Y position
   * @param depth Depth to render at
   */
  public createEmptyBuildingIndicator(x: number, y: number, depth: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const size = UI_CONFIG.emptyBuildingIndicator.size || 24
    
    // Background circle
    const bg = this.scene.add.graphics()
    bg.fillStyle(UI_CONFIG.colors.emptyBuildingBg, UI_CONFIG.alphas.emptyBuildingBg)
    bg.fillCircle(0, 0, size / 2)
    
    // Text
    const text = this.scene.add.text(0, 0, UI_CONFIG.emptyBuildingIndicator.text || '?', { 
      font: '16px monospace', 
      color: '#ffffff',
      fontStyle: 'bold'
    })
    text.setOrigin(0.5)
    
    container.add([bg, text])
    
    // Set depth and scroll factor (1 because it's part of the world)
    container.setDepth(depth)
    container.setScrollFactor(1)
    
    return container
  }

  public hideEmptyBuildingIndicator(indicator: Phaser.GameObjects.Container): void {
    if (indicator) {
      indicator.destroy()
    }
  }

  public updateWoodCount(count: number): void {
    if (this.woodText) {
      this.woodText.setText(`🪵 Dřevo: ${count}`)
    }
  }

  public handleResize(width: number, height: number): void {
    if (this.menuBg) {
      this.menuBg.clear()
      this.menuBg.fillStyle(UI_CONFIG.colors.menuBackground, UI_CONFIG.alphas.menuBackground)
      this.menuBg.fillRect(0, height - UI_CONFIG.menuBarHeight, width, UI_CONFIG.menuBarHeight)
    }

    const menuY = height - UI_CONFIG.menuBarHeight / 2
    
    if (this.houseButtonContainer) {
        this.houseButtonContainer.setPosition(UI_CONFIG.firstButtonX, menuY)
    }

    if (this.teepeeButtonContainer) {
        const tx = UI_CONFIG.firstButtonX + UI_CONFIG.buttonSpacing
        this.teepeeButtonContainer.setPosition(tx, menuY)
    }

    if (this.villagerButtonContainer) {
        const vx = UI_CONFIG.firstButtonX + UI_CONFIG.buttonSpacing * 2
        this.villagerButtonContainer.setPosition(vx, menuY)
    }

    // Update Clock Position
    if (this.clockContainer) {
        const size = TIME_CONFIG.uiSize || 50
        const x = width - size - 20
        const y = size + 20
        this.clockContainer.setPosition(x, y)
    }
  }
}
