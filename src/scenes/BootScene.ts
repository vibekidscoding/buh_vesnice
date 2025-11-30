import Phaser from 'phaser'
import { ASSETS } from '@/config/constants'

/**
 * BootScene
 * Handles asset loading and initialization
 * For prototype: minimal loading, just transitions to game
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    // Create a loading bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50)

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Načítání...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    })
    loadingText.setOrigin(0.5, 0.5)

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x90EE90, 1)
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30)
    })

    // When loading is complete
    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })

    // Load terrain assets
    this.load.image(ASSETS.TERRAIN.TREE, 'assets/sprites/terrain/tree.png')
    this.load.image(ASSETS.TERRAIN.ROCKS, 'assets/sprites/terrain/rocks.png')

    // Load building assets
    this.load.image(ASSETS.BUILDINGS.HOUSE, 'assets/sprites/buildings/house.png')
    this.load.image(ASSETS.BUILDINGS.TEEPEE, 'assets/sprites/buildings/teepee.png')

    // Load villager assets for animation
    this.load.image(ASSETS.VILLAGERS.WALK_1, 'assets/sprites/villagers/postava_krok_1.png')
    this.load.image(ASSETS.VILLAGERS.WALK_2, 'assets/sprites/villagers/postava_krok_2.png')
  }

  create(): void {
    // Transition to the game scene
    console.log('BootScene complete, starting GameScene')
    this.scene.start('GameScene')
  }
}