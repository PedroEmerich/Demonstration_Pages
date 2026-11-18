import os
import json
from pathlib import Path
from PIL import Image, ImageStat

# Configurações exigidas
INPUT_DIR = Path("raw_photos")
OUTPUT_DIR = Path("bouquet/photos")
JSON_PATH = Path("bouquet-photos.json")
TARGET_SIZE = (1600, 1600)
WEBP_QUALITY = 83  # Entre 80 e 85

def check_pure_white_background(img: Image.Image, tolerance: int = 250) -> tuple[bool, float]:
    """Verifica os cantos superiores da imagem para garantir fundo #FFFFFF puro."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    # Amostra quadrados de 60x60 nos cantos superior esquerdo e superior direito
    top_left = rgb.crop((0, 0, 60, 60))
    top_right = rgb.crop((w - 60, 0, w, 60))
    
    mean_tl = sum(ImageStat.Stat(top_left).mean) / 3
    mean_tr = sum(ImageStat.Stat(top_right).mean) / 3
    avg_bg = (mean_tl + mean_tr) / 2
    return avg_bg >= tolerance, round(avg_bg, 1)

def process_photos():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not INPUT_DIR.exists():
        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Pasta '{INPUT_DIR}' criada. Coloque as fotos originais nela com os nomes exatos (ex: rosas-vermelho-12-kraft.jpg/png).")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    catalog_map = {item["id"]: item for item in catalog}
    processed = 0
    warnings = []

    for img_path in sorted(INPUT_DIR.iterdir()):
        if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}:
            continue
        
        stem = img_path.stem
        if stem not in catalog_map:
            warnings.append(f"[IGNORADO] Nome não consta na lista oficial: {img_path.name}")
            continue

        with Image.open(img_path) as im:
            # Preserva transparência se houver, senão converte para RGB
            has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
            if not has_alpha:
                is_white, bg_val = check_pure_white_background(im)
                if not is_white:
                    warnings.append(f"[ALERTA FUNDO] {img_path.name}: fundo médio={bg_val} (pode gerar mancha no multiply, ideal >= 252)")

            # Redimensionamento centralizado (crop quadrado se necessário + resize 1600x1600)
            w, h = im.size
            min_side = min(w, h)
            left = (w - min_side) // 2
            top = (h - min_side) // 2
            im_cropped = im.crop((left, top, left + min_side, top + min_side))
            im_resized = im_cropped.resize(TARGET_SIZE, Image.Resampling.LANCZOS)

            out_file = OUTPUT_DIR / f"{stem}.webp"
            im_resized.save(out_file, "WEBP", quality=WEBP_QUALITY, method=6)
            
            size_kb = out_file.stat().st_size / 1024
            if size_kb > 260:
                warnings.append(f"[PESO] {out_file.name}: {size_kb:.1f} KB (acima dos 250 KB recomendados)")

            catalog_map[stem]["available"] = True
            processed += 1
            print(f"[OK] {out_file.name} ({size_kb:.1f} KB)")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(list(catalog_map.values()), f, indent=2, ensure_ascii=False)

    print(f"\nConcluído: {processed} fotos processadas e atualizadas no {JSON_PATH}.")
    if warnings:
        print("\nAvisos:")
        for w in warnings:
            print(" -", w)

if __name__ == "__main__":
    process_photos()
