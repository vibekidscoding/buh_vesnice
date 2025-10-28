import Phaser from 'phaser'
import { gameConfig } from '@/config/game.config'
import { BootScene } from '@/scenes/BootScene'
import { GameScene } from '@/scenes/GameScene'

/**
 * Main entry point
 * Initialize and start the Phaser game
 */

// Add scenes to config
const config = {
  ...gameConfig,
  scene: [BootScene, GameScene]
}

// Create and start the game
window.addEventListener('load', () => {
  const game = new Phaser.Game(config)

  // Log game info
  console.log('Bůh Vesnice - Prototype')
  console.log('Phaser version:', Phaser.VERSION)
  console.log('Game initialized')

  // Make game accessible for debugging
  ;(window as any).game = game
})
