#!/usr/bin/env python3
"""Regenera los iconos web desde la geometría coordinator normalizada."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
RED = (217, 4, 41, 255)
WHITE = (255, 255, 255, 255)


def cubic(start, control1, control2, end, segments=160):
    points = []
    for index in range(segments + 1):
        t = index / segments
        inverse = 1 - t
        points.append(
            (
                inverse**3 * start[0]
                + 3 * inverse**2 * t * control1[0]
                + 3 * inverse * t**2 * control2[0]
                + t**3 * end[0],
                inverse**3 * start[1]
                + 3 * inverse**2 * t * control1[1]
                + 3 * inverse * t**2 * control2[1]
                + t**3 * end[1],
            )
        )
    return points


LEFT = cubic((0.245, 0.385), (0.275, 0.545), (0.375, 0.635), (0.5, 0.635))
RIGHT = cubic((0.755, 0.385), (0.725, 0.545), (0.625, 0.635), (0.5, 0.635))


def render(size, *, maskable=False):
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), RED if maskable else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if not maskable:
        draw.rounded_rectangle(
            (0, 0, canvas_size - 1, canvas_size - 1),
            radius=round(canvas_size * 0.22),
            fill=RED,
        )

    width = round(canvas_size * 0.078)

    def scaled(points):
        return [(round(x * canvas_size), round(y * canvas_size)) for x, y in points]

    draw.line(scaled(LEFT), fill=WHITE, width=width, joint="curve")
    draw.line(scaled(RIGHT), fill=WHITE, width=width, joint="curve")
    draw.line(scaled([(0.5, 0.435), (0.5, 0.79)]), fill=WHITE, width=width)
    radius = width // 2
    for x, y in [LEFT[0], LEFT[-1], RIGHT[0], RIGHT[-1], (0.5, 0.435), (0.5, 0.79)]:
        px, py = round(x * canvas_size), round(y * canvas_size)
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=WHITE)
    dot_radius = round(canvas_size * 0.055)
    dot_x, dot_y = round(canvas_size * 0.5), round(canvas_size * 0.235)
    draw.ellipse(
        (dot_x - dot_radius, dot_y - dot_radius, dot_x + dot_radius, dot_y + dot_radius),
        fill=WHITE,
    )
    return image.resize((size, size), Image.Resampling.LANCZOS)


for filename, size in {
    "favicon-32.png": 32,
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}.items():
    render(size).save(PUBLIC / filename, optimize=True)

render(512, maskable=True).save(PUBLIC / "icon-maskable-512.png", optimize=True)
