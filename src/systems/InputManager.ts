import Phaser from 'phaser'
import { CAMERA_SPEED } from '@/config/constants'

export class InputManager {
  private scene: Phaser.Scene
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  
  // Camera drag state
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragMoved = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.setupKeyboard()
    this.setupMouse()
  }

  private setupKeyboard(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys()
      this.wasd = {
        W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      }
    }
  }

  private setupMouse(): void {
    const camera = this.scene.cameras.main
    camera.removeBounds()
    camera.setZoom(1)

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Reset drag moved state on every new click
      this.dragMoved = false
      
      // Use the current camera height, not the one from constructor time
      const currentCamera = this.scene.cameras.main
      const uiAreaHeight = 100
      const inUIArea = pointer.y >= currentCamera.height - uiAreaHeight

      console.log('Pointer Down:', pointer.x, pointer.y, 'In UI Area:', inUIArea)

      if (inUIArea) return

      this.isDragging = true
      this.dragMoved = false
      this.dragStartX = pointer.x
      this.dragStartY = pointer.y
    })

    this.scene.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false
        // dragMoved remains true until next click, so we can check it in click handlers
        console.log('Drag ended, moved:', this.dragMoved)
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.dragMoved = true
        const deltaX = pointer.x - this.dragStartX
        const deltaY = pointer.y - this.dragStartY

        this.scene.cameras.main.scrollX -= deltaX
        this.scene.cameras.main.scrollY -= deltaY

        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
      }
    })
  }

  public update(): void {
    const camera = this.scene.cameras.main
    
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

  public get isDragMoved(): boolean {
    return this.dragMoved
  }
  
  public get isCameraDragging(): boolean {
    return this.isDragging
  }
}