import Phaser from 'phaser'
import { TIME_CONFIG } from '@/config/constants'

export class TimeManager {
  private time: number = 0 // 0.0 to 1.0 (0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
  private elapsed: number = 0 // Total elapsed ms

  constructor(_scene: Phaser.Scene) { // Scene parameter is still needed for instantiation, but not stored.
    // Start at dawn (0.25)
    this.time = 0.25
    this.elapsed = 0.25 * TIME_CONFIG.dayDuration
  }

  public update(delta: number): void {
    this.elapsed += delta
    // Normalize to 0-1 loop
    this.time = (this.elapsed % TIME_CONFIG.dayDuration) / TIME_CONFIG.dayDuration
  }

  /**
   * Returns current cycle progress (0.0 - 1.0)
   */
  public getTime(): number {
    return this.time
  }

  /**
   * Calculates darkness level (alpha) based on current time
   * Returns 0.0 (Bright) to MAX_DARKNESS (Dark)
   */
  public getDarknessLevel(): number {
    const { dawn, noon, dusk, maxDarkness } = TIME_CONFIG
    
    if (this.time >= dawn && this.time < noon) {
      // Dawn to Noon: Dark -> Light
      // Map [0.25, 0.5] -> [MAX, 0]
      const progress = (this.time - dawn) / (noon - dawn)
      return maxDarkness * (1 - progress)
    } else if (this.time >= noon && this.time < dusk) {
      // Noon to Dusk: Light -> Dark
      // Map [0.5, 0.75] -> [0, MAX]
      const progress = (this.time - noon) / (dusk - noon)
      return maxDarkness * progress
    } else if (this.time >= dusk || this.time < dawn) {
      // Night: Darkest
      return maxDarkness
    }
    
    return 0
  }

  /**
   * Returns intensity for lights (0.0 = Off/Dim, 1.0 = Full Bright)
   */
  public getLightIntensity(): number {
    const { dawn, dusk } = TIME_CONFIG
    
    // Lights should be completely OFF during the bright part of the day
    // Add a buffer around dawn/dusk to avoid flickering
    const dawnEnd = dawn + 0.1 // Lights off shortly after dawn
    const duskStart = dusk - 0.1 // Lights on shortly before dusk
    
    if (this.time > dawnEnd && this.time < duskStart) {
        return 0
    }

    // Otherwise calculate based on darkness
    const darkness = this.getDarknessLevel()
    return Math.min(1, darkness / (TIME_CONFIG.maxDarkness * 0.5))
  }
}
