import Phaser from 'phaser'
import { UI_CONFIG, ASSETS } from '@/config/constants'
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
      console.log(`UI Button Clicked: ${type}`)
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
    // Should move with camera if attached to world object, but here we use screen coordinates
    // If x,y are passed as screen coordinates, we want ScrollFactor 0.
    // But if they are passed as world coordinates (e.g. above house), we want ScrollFactor 1.
    // Since we want it "near the house", let's assume World Coordinates are passed and set ScrollFactor 1.
    this.confirmContainer.setScrollFactor(1) 

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
  }
}
