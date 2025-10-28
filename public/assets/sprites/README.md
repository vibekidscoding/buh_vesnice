# Sprites

## Directory Structure

- `buildings/` - Building sprites (houses, farms, workshops, etc.)
- `villagers/` - Villager character sprites and animations
- `resources/` - Resource item sprites (wood, stone, food)
- `terrain/` - Ground tiles, trees, rocks, water

## Sprite Guidelines

### Isometric Format
- All sprites should follow isometric perspective (2:1 ratio)
- Base tile size: 64x32 pixels
- Buildings can be larger (multiples of base size)

### Naming Convention
```
<category>_<name>_<variant>.png

Examples:
building_house_1.png
building_house_2.png
villager_idle_01.png
villager_walk_01.png
terrain_grass_01.png
resource_wood_stack.png
```

### File Format
- PNG format with transparency
- Optimize file size (use tools like TinyPNG)
- Organized by type in subdirectories

## Placeholder Assets

For initial development, you can use:
- Colored rectangles/diamonds for buildings
- Simple shapes for villagers
- Basic icons for resources

## Art Style Notes
- Forest/medieval theme
- Natural earth tones (greens, browns, grays)
- Czech countryside aesthetic
- Hand-drawn or pixel art style
