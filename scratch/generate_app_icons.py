import os
from PIL import Image, ImageDraw

def draw_brain_icon(size):
    # Create high-resolution canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded square with vertical purple-to-pink gradient
    corner_radius = int(size * 0.22)
    
    # Create gradient image
    gradient = Image.new("RGBA", (size, size))
    g_draw = ImageDraw.Draw(gradient)
    
    # Colors: top violet #8B5CF6 (139, 92, 246) to bottom pink #EC4899 (236, 72, 153)
    c1 = (139, 92, 246)
    c2 = (236, 72, 153)
    
    for y in range(size):
        r = int(c1[0] + (c2[0] - c1[0]) * (y / size))
        g = int(c1[1] + (c2[1] - c1[1]) * (y / size))
        b = int(c1[2] + (c2[2] - c1[2]) * (y / size))
        g_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    # Create mask for rounded rect
    mask = Image.new("L", (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=corner_radius, fill=255)
    
    # Composite background
    bg = Image.composite(gradient, img, mask)
    b_draw = ImageDraw.Draw(bg)
    
    # Draw white brain lines in center
    stroke_w = max(2, int(size * 0.05))
    
    # Left hemisphere arcs & curves
    cx, cy = size / 2, size / 2
    scale = size / 100.0
    
    # Draw left hemisphere
    left_blobs = [
        (cx - 15 * scale, cy - 20 * scale, 12 * scale),
        (cx - 22 * scale, cy - 8 * scale, 14 * scale),
        (cx - 20 * scale, cy + 8 * scale, 13 * scale),
        (cx - 12 * scale, cy + 20 * scale, 10 * scale)
    ]
    for bx, by, br in left_blobs:
        b_draw.ellipse([bx - br, by - br, bx + br, by + br], outline=(255, 255, 255, 255), width=stroke_w)
        
    # Draw right hemisphere
    right_blobs = [
        (cx + 15 * scale, cy - 20 * scale, 12 * scale),
        (cx + 22 * scale, cy - 8 * scale, 14 * scale),
        (cx + 20 * scale, cy + 8 * scale, 13 * scale),
        (cx + 12 * scale, cy + 20 * scale, 10 * scale)
    ]
    for bx, by, br in right_blobs:
        b_draw.ellipse([bx - br, by - br, bx + br, by + br], outline=(255, 255, 255, 255), width=stroke_w)

    # Center fissure line
    b_draw.line([(cx, cy - 28 * scale), (cx, cy + 28 * scale)], fill=(255, 255, 255, 255), width=stroke_w)
    
    return bg

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

res_dir = r"d:\JEE\Android\app\src\main\res"

for folder, s in sizes.items():
    target_path = os.path.join(res_dir, folder)
    os.makedirs(target_path, exist_ok=True)
    
    icon_img = draw_brain_icon(s)
    
    # Save as PNG & WEBP to ensure full compatibility across all Android versions
    icon_img.save(os.path.join(target_path, "ic_launcher.png"))
    icon_img.save(os.path.join(target_path, "ic_launcher_round.png"))
    icon_img.save(os.path.join(target_path, "ic_launcher.webp"))
    icon_img.save(os.path.join(target_path, "ic_launcher_round.webp"))

print("All Android app icons successfully generated!")
