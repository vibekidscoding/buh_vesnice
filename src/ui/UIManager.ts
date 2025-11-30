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
    
    this.container.add([this.houseButtonContainer, this.teepeeButtonContainer])
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
    // To make a container interactive, we need to give it a size/shape
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
  }
}