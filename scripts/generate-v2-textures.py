"""Generate v2 editorial textures via Gemini image API (nano-banana contract)."""
import io
import os
import sys

import truststore

truststore.inject_into_ssl()

from google import genai
from google.genai import types
from PIL import Image

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    sys.exit("GEMINI_API_KEY not set")

MODEL = os.environ.get("NANO_BANANA_MODEL") or "gemini-3-pro-image-preview"
OUT = r"C:\dev\KasperSimonsen.dev\public\v2"

BASE = (
    "Abstract editorial photograph for a high-fashion website background, "
    "wide 16:9 cinematic crop, near-black monochrome palette, extreme "
    "chiaroscuro, deep shadow occupying most of the frame, subtle film grain, "
    "high contrast, surreal minimal composition, large areas of pure darkness. "
    "No people, no text, no logos, no color. "
)

JOBS = {
    "hero-texture.jpg": BASE
    + "Subject: raking side-light grazing across crumpled matte black silk "
    "fabric, one diagonal sweep of dim silver light.",
    "texture-forja.jpg": BASE
    + "Subject: dark industrial machinery in a foundry — massive steel forms, "
    "faint sparks frozen as dim white points, smoke drifting through a single "
    "hard shaft of light.",
    "texture-manuva.jpg": BASE
    + "Subject: towering warehouse racking receding into blackness, one narrow "
    "shaft of light falling across stacked pallets, dust in the beam.",
    "texture-silio.jpg": BASE
    + "Subject: macro of wheat grain and milled feed pouring through darkness, "
    "kernels catching a thin edge of silver light mid-fall.",
}

client = genai.Client(api_key=API_KEY)

import time

for filename, prompt in JOBS.items():
    try:
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        )
    except Exception:
        config = types.GenerateContentConfig(response_modalities=["IMAGE"])
    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL, contents=[prompt], config=config
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                print(f"429 on {filename}, waiting 60s (attempt {attempt + 1})")
                time.sleep(60)
            else:
                print(f"FAILED {filename}: {str(e)[:200]}")
                break
    if response is None:
        continue
    saved = False
    for part in response.parts:
        if getattr(part, "inline_data", None) and part.inline_data.data:
            img = Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")
            if img.width > 2400:
                img = img.resize(
                    (2400, int(img.height * 2400 / img.width)), Image.LANCZOS
                )
            img.save(os.path.join(OUT, filename), quality=86, optimize=True)
            print(f"saved {filename} {img.size}")
            saved = True
            break
    if not saved:
        print(f"FAILED {filename}: no image part in response")
