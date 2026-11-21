import struct, zlib, math, os

def make_chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

def write_png(filename, width, height, pixels):
    raw = bytearray()
    row_len = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y*row_len : (y+1)*row_len])
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + make_chunk(b'IHDR', ihdr) + make_chunk(b'IDAT', idat) + make_chunk(b'IEND', b''))
    print(f"Generated: {filename} ({width}x{height})")

def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        p1x, p1y = poly[i]
        p2x, p2y = poly[(i + 1) % n]
        if min(p1y, p2y) < y <= max(p1y, p2y):
            if x <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or x <= xinters:
                    inside = not inside
    return inside

def render_kinetix(size, bg_mode='dark', is_monochrome=False, padding=0.15):
    # SS = 3 for ultra smooth anti-aliased edges
    SS = 3
    W = size * SS
    H = size * SS
    
    # Scale and center within padding
    scale = 1.0 - 2 * padding
    ox = padding * W
    oy = padding * H
    
    def pt(nx, ny):
        return (ox + nx * scale * W, oy + ny * scale * H)
    
    # Left aerodynamic pillar of 'K'
    pillar = [
        pt(0.12, 0.12),
        pt(0.28, 0.04),
        pt(0.28, 0.92),
        pt(0.12, 1.00),
    ]
    
    # Upper chevron (angled up-right)
    upper_wing = [
        pt(0.36, 0.46),
        pt(0.72, 0.04),
        pt(0.92, 0.04),
        pt(0.56, 0.46),
    ]
    
    # Lower chevron (angled down-right)
    lower_wing = [
        pt(0.56, 0.54),
        pt(0.92, 0.96),
        pt(0.72, 0.96),
        pt(0.36, 0.54),
    ]
    
    # Kinetic speed arrow / pulse wedge in center
    pulse_wedge = [
        pt(0.38, 0.47),
        pt(0.52, 0.47),
        pt(0.48, 0.53),
        pt(0.38, 0.53),
    ]

    c_white = [255, 255, 255, 255]
    c_orange_1 = [252, 76, 2, 255]    # Athletic Orange (#FC4C02)
    c_orange_2 = [255, 107, 34, 255]  # Kinetic Flame (#FF6B22)
    c_amber = [255, 145, 0, 255]     # Bright Amber Accent
    
    if is_monochrome:
        c_orange_1 = [255, 255, 255, 255]
        c_orange_2 = [255, 255, 255, 255]
        c_amber = [255, 255, 255, 255]

    pixels = bytearray(size * size * 4)
    
    for y in range(size):
        for x in range(size):
            r_acc, g_acc, b_acc, a_acc = 0, 0, 0, 0
            for sy in range(SS):
                sub_y = y * SS + sy + 0.5
                for sx in range(SS):
                    sub_x = x * SS + sx + 0.5
                    
                    if point_in_poly(sub_x, sub_y, pillar):
                        col = c_white
                    elif point_in_poly(sub_x, sub_y, upper_wing):
                        col = c_orange_1
                    elif point_in_poly(sub_x, sub_y, lower_wing):
                        col = c_orange_2
                    elif point_in_poly(sub_x, sub_y, pulse_wedge):
                        col = c_amber
                    else:
                        if bg_mode == 'transparent':
                            col = [0, 0, 0, 0]
                        elif bg_mode == 'orange':
                            col = [252, 76, 2, 255]
                        elif bg_mode == 'dark':
                            # Deep Obsidian Gradient from top-left #0F172A to #090D16
                            t = (sub_x + sub_y) / (W + H)
                            r = int(15 * (1 - t) + 8 * t)
                            g = int(23 * (1 - t) + 12 * t)
                            b = int(42 * (1 - t) + 22 * t)
                            col = [r, g, b, 255]
                        else:
                            col = [255, 255, 255, 255]
                            
                    r_acc += col[0]
                    g_acc += col[1]
                    b_acc += col[2]
                    a_acc += col[3]
                    
            idx = (y * size + x) * 4
            num = SS * SS
            pixels[idx] = r_acc // num
            pixels[idx + 1] = g_acc // num
            pixels[idx + 2] = b_acc // num
            pixels[idx + 3] = a_acc // num
            
    return pixels

# Generate all required icon assets
print("Rendering KINETIX brand icon assets...")

# 1. Main App Icon 1024x1024 (for store and root)
write_png("mobile-frontend/assets/images/icon.png", 1024, 1024, render_kinetix(1024, bg_mode='dark', padding=0.20))

# 2. Android Adaptive Foreground (transparent background, 512x512)
write_png("mobile-frontend/assets/images/android-icon-foreground.png", 512, 512, render_kinetix(512, bg_mode='transparent', padding=0.26))

# 3. Android Adaptive Background (512x512 dark obsidian)
write_png("mobile-frontend/assets/images/android-icon-background.png", 512, 512, render_kinetix(512, bg_mode='dark', padding=0.20))

# 4. Android Adaptive Monochrome (432x432, white symbol on transparent)
write_png("mobile-frontend/assets/images/android-icon-monochrome.png", 432, 432, render_kinetix(432, bg_mode='transparent', is_monochrome=True, padding=0.26))

# 5. Splash Screen Icon (512x512, transparent)
write_png("mobile-frontend/assets/images/splash-icon.png", 512, 512, render_kinetix(512, bg_mode='transparent', padding=0.20))

# 6. Favicon 48x48
write_png("mobile-frontend/assets/images/favicon.png", 48, 48, render_kinetix(48, bg_mode='dark', padding=0.15))

# Also generate mipmaps directly for Android!
mipmap_specs = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

for name, sz in mipmap_specs.items():
    dir_path = f"mobile-frontend/android/app/src/main/res/mipmap-{name}"
    # Remove existing .webp if any to avoid duplicate resource errors
    for f in ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_background.webp', 'ic_launcher_foreground.webp', 'ic_launcher_monochrome.webp']:
        p = os.path.join(dir_path, f)
        if os.path.exists(p):
            os.remove(p)
            
    # Write PNG icons
    write_png(os.path.join(dir_path, 'ic_launcher.png'), sz, sz, render_kinetix(sz, bg_mode='dark', padding=0.16))
    write_png(os.path.join(dir_path, 'ic_launcher_round.png'), sz, sz, render_kinetix(sz, bg_mode='dark', padding=0.16))
    write_png(os.path.join(dir_path, 'ic_launcher_background.png'), sz, sz, render_kinetix(sz, bg_mode='dark', padding=0.16))
    write_png(os.path.join(dir_path, 'ic_launcher_foreground.png'), sz, sz, render_kinetix(sz, bg_mode='transparent', padding=0.24))
    write_png(os.path.join(dir_path, 'ic_launcher_monochrome.png'), sz, sz, render_kinetix(sz, bg_mode='transparent', is_monochrome=True, padding=0.24))

print("All Kinetix brand icons successfully generated!")
