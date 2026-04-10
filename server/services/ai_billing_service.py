def calculate_platform_tokens(openai_total_tokens: int) -> int:
    """
    Convert OpenAI tokens to platform tokens.
    Example: 1000 OpenAI tokens = 1 platform token
    """
    return max(1, openai_total_tokens // 1000)