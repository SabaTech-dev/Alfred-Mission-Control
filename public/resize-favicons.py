from PIL import Image
import os

def resize_favicon(input_path, output_path, size):
    """Resize image to square favicon"""
    try:
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if needed for favicon
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            img = img.resize((size, size), Image.LANCZOS)
            img.save(output_path)
            print(f"Created {output_path} ({size}x{size})")
    except Exception as e:
        print(f"Error creating {output_path}: {e}")

# Create favicons from logo-transparent.png
resize_favicon('logo-transparent.png', 'favicon-16x16.png', 16)
resize_favicon('logo-transparent.png', 'favicon-32x32.png', 32)
resize_favicon('logo-transparent.png', 'apple-touch-icon.png', 180)

print("All favicons updated successfully!")
