from PIL import Image

def remove_white_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        r, g, b, a = item
        
        # Calculate how close the pixel is to white
        avg = (r + g + b) / 3.0
        
        if avg > 245:
            # Pure white -> completely transparent
            newData.append((255, 255, 255, 0))
        elif avg > 200:
            # Off white (anti-aliasing) -> partially transparent
            # Map avg 200-245 to alpha 255-0
            alpha = int(255 - ((avg - 200) / 45.0 * 255))
            newData.append((r, g, b, alpha))
        else:
            # Not white -> keep original
            newData.append((r, g, b, a))

    img.putdata(newData)
    img.save(output_path, "PNG")

remove_white_bg("d:/Aura-Brand/public/aura-logo.png", "d:/Aura-Brand/public/aura-logo.png")
