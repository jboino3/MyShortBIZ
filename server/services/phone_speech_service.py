from __future__ import annotations


def normalize_phone_tts_text(text: str) -> str:
    normalized = " ".join((text or "").split())
    price_replacements = {
        "$4.99": "four ninety-nine",
        "$9.99": "nine ninety-nine",
        "$19.99": "nineteen ninety-nine",
        "$49.99": "forty-nine ninety-nine",
        "$99.99": "ninety-nine ninety-nine",
    }
    for raw, spoken in price_replacements.items():
        normalized = normalized.replace(raw, spoken)
    return normalized
