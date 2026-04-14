FEATURE_PRICING = {
    "blog": 20,
    "cv": 20,
    "bio": 10,
    "social": 10,
    "rewrite": 10,
    "thesis": 40,
    "prompt_builder": 15,
    "short_link": 10,
    "video_5s": 300,
    "video_10s": 600,
}


def get_feature_cost(feature: str, duration: int | None = None) -> int:
    if feature == "video":
        if duration and duration > 5:
            return FEATURE_PRICING["video_10s"]
        return FEATURE_PRICING["video_5s"]

    return FEATURE_PRICING.get(feature, 10)