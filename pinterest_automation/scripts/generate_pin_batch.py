import csv
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "data" / "products_seed.csv"
TERMS = ROOT / "data" / "pinterest_terms.csv"
OUT = ROOT / "output"
STORE_URL = "https://chiquehome.com.br"
PINTEREST_COUPON_TEXT = "Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest."

TITLE_TEMPLATES = [
    "{keyword}: ideia elegante com {product_short}",
    "Como usar {product_short} na {keyword}",
    "{keyword} para deixar o ambiente mais sofisticado",
    "Inspire-se: {keyword} com toque Chique Home",
    "{product_short} para transformar sua {room}",
]

DESCRIPTION_TEMPLATES = [
    "Ideia de {keyword} para deixar sua casa mais bonita, funcional e sofisticada. Veja o produto na Chique Home e monte um ambiente com mais personalidade.",
    "Se voce esta buscando {keyword}, este item ajuda a renovar o ambiente sem reforma. Confira detalhes, medidas e opcoes na Chique Home.",
    "Uma inspiracao simples para quem quer {keyword} com acabamento elegante. Produto com compra segura, frete e rastreio.",
    "Transforme sua {room} com uma escolha visual e funcional. Veja essa sugestao de {keyword} na Chique Home.",
]

ROOM_BY_TYPE = {
    "Banheiro": "banheiro",
    "Tapete Cozinha": "cozinha",
    "Relogio": "sala ou cozinha",
    "Iluminacao": "sala, quarto ou cozinha",
}


def read_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def product_short(title):
    short = title.split(" - ")[0]
    short = short.replace(" para Sala/Quarto/Cozinha", "")
    short = short.replace(" para Cozinha/Sala", "")
    return short[:70]


def matches(product, term):
    haystack = " ".join([
        product["title"],
        product["product_type"],
        product["tags"],
    ]).lower()
    intent = term["intent"].lower()
    keyword = term["keyword"].lower()
    if intent in haystack:
        return True
    if "cozinha" in keyword and ("cozinha" in haystack or "tapete" in haystack):
        return True
    if "banheiro" in keyword and ("banheiro" in haystack or "lavabo" in haystack or "maquiagem" in haystack):
        return True
    if "sala" in keyword and ("relogio" in haystack or "lustre" in haystack or "luminaria" in haystack):
        return True
    if "iluminacao" in intent and ("lustre" in haystack or "luminaria" in haystack or "arandela" in haystack):
        return True
    if "relogio" in intent and "relogio" in haystack:
        return True
    return False


def make_url(handle, keyword, index):
    params = {
        "utm_source": "pinterest",
        "utm_medium": "organic_pin",
        "utm_campaign": "pinterest_organic_chiquehome",
        "utm_content": f"{keyword.replace(' ', '_')}_{index}",
    }
    return f"{STORE_URL}/products/{handle}?{urlencode(params)}"


def add_pinterest_coupon(description):
    return f"{description} {PINTEREST_COUPON_TEXT}"[:500]


def generate():
    products = read_csv(PRODUCTS)
    terms = sorted(read_csv(TERMS), key=lambda x: int(x["priority"]))
    rows = []
    start = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    slots = [9, 11, 13, 15, 17, 19, 21]
    idx = 1

    for product in products:
        relevant_terms = [t for t in terms if matches(product, t)]
        if not relevant_terms:
            relevant_terms = terms[:8]
        random.seed(product["handle"])
        selected = relevant_terms[:10]
        for term in selected:
            room = ROOM_BY_TYPE.get(product["product_type"], term["intent"])
            short = product_short(product["title"])
            title = random.choice(TITLE_TEMPLATES).format(
                keyword=term["keyword"],
                product_short=short,
                room=room,
            )
            description = random.choice(DESCRIPTION_TEMPLATES).format(
                keyword=term["keyword"],
                room=room,
            )
            description = add_pinterest_coupon(description)
            day_offset = (idx - 1) // len(slots)
            hour = slots[(idx - 1) % len(slots)]
            scheduled_at = (start + timedelta(days=day_offset)).replace(hour=hour)
            rows.append({
                "id": idx,
                "scheduled_at": scheduled_at.isoformat(),
                "board_name": term["board"],
                "keyword": term["keyword"],
                "title": title[:100],
                "description": description,
                "link": make_url(product["handle"], term["keyword"], idx),
                "image_url": product["image_url"],
                "alt_text": f"{short} - {term['keyword']} Chique Home"[:500],
                "product_title": product["title"],
                "product_handle": product["handle"],
                "status": "ready",
            })
            idx += 1
    return rows


def write_outputs(rows):
    OUT.mkdir(exist_ok=True)
    csv_path = OUT / "pins_batch.csv"
    json_path = OUT / "pins_batch.json"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(rows)} pins")
    print(csv_path)
    print(json_path)


if __name__ == "__main__":
    write_outputs(generate())
