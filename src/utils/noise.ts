/**
 * Simple 2D noise generator for terrain generation
 * Using a basic pseudo-random approach with interpolation
 */

export class NoiseGenerator {
  private seed: number

  constructor(seed: number = Math.random() * 1000) {
    this.seed = seed
  }

  /**
   * Generate pseudo-random value based on coordinates
   */
  private random(x: number, y: number): number {
    const dot = x * 12.9898 + y * 78.233 + this.seed
    const sin = Math.sin(dot) * 43758.5453123
    return sin - Math.floor(sin)
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * Smooth interpolation (cosine)
   */
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  /**
   * Get interpolated noise value at coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @returns Value between 0 and 1
   */
  public noise(x: number, y: number): number {
    const floorX = Math.floor(x)
    const floorY = Math.floor(y)
    const fracX = x - floorX
    const fracY = y - floorY

    // Get corner values
    const v00 = this.random(floorX, floorY)
    const v10 = this.random(floorX + 1, floorY)
    const v01 = this.random(floorX, floorY + 1)
    const v11 = this.random(floorX + 1, floorY + 1)

    // Smooth interpolation
    const smoothX = this.smoothstep(fracX)
    const smoothY = this.smoothstep(fracY)

    // Interpolate
    const i1 = this.lerp(v00, v10, smoothX)
    const i2 = this.lerp(v01, v11, smoothX)
    return this.lerp(i1, i2, smoothY)
  }

  /**
   * Octave noise for more natural-looking results
   * @param x X coordinate
   * @param y Y coordinate
   * @param octaves Number of octaves (layers of noise)
   * @param persistence How much each octave contributes
   * @returns Value between 0 and 1
   */
  public octaveNoise(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5
  ): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= 2
    }

    return total / maxValue
  }
}
