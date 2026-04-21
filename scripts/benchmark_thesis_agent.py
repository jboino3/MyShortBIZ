import json
import sys
import time
import urllib.request

sys.path.insert(0, "/home/anya/MyShortBIZ/server")

from routers.auth import create_access_token


USER_ID = "16b2a914-93db-4145-a6b7-38578d334471"
BASE_URL = "http://127.0.0.1:8000"


TOPIC_SPECS = [
    {
        "name": "business_overview",
        "keywords": ["rocketlink", "platform", "trading"],
        "prompts": [
            "What is this business?",
            "What does RocketLink do?",
            "What kind of company is RocketLink?",
            "Can you explain what this business does?",
            "What type of service is RocketLink?",
        ],
    },
    {
        "name": "business_type",
        "keywords": ["social trading", "marketplace", "community"],
        "prompts": [
            "What type of business is this?",
            "What kind of business would you call RocketLink?",
            "Is this a marketplace or a social app?",
            "How would you classify this business?",
            "What category of business is RocketLink in?",
        ],
    },
    {
        "name": "short_description",
        "keywords": ["rocketlink", "chat", "trade", "platform"],
        "prompts": [
            "Give me a short description of your business.",
            "Can you give me a brief description of RocketLink?",
            "Summarize your business in one short answer.",
            "What is the short version of what RocketLink is?",
            "Give me a quick summary of this business.",
        ],
    },
    {
        "name": "target_audience",
        "keywords": ["traders", "collectors", "players", "creators", "moderators"],
        "prompts": [
            "Who is the platform for?",
            "Who is the target audience?",
            "Who would normally use RocketLink?",
            "What kinds of users is RocketLink built for?",
            "Who is this product meant to serve?",
        ],
    },
    {
        "name": "social_features",
        "keywords": ["profiles", "groups", "chat", "communities"],
        "prompts": [
            "How does the social side work?",
            "What community features does RocketLink have?",
            "Can users interact with each other socially?",
            "How do people connect with each other in RocketLink?",
            "What makes RocketLink feel like a community app?",
        ],
    },
    {
        "name": "trading_features",
        "keywords": ["list", "filter", "items", "trade", "marketplace"],
        "prompts": [
            "How does the trading side work?",
            "Can users trade Rocket League items here?",
            "What trading tools are included?",
            "How do listings and trades work in RocketLink?",
            "How does RocketLink help people trade items?",
        ],
    },
    {
        "name": "trust_safety",
        "keywords": ["verified", "ratings", "scam", "moderation", "trust"],
        "prompts": [
            "What trust features are included?",
            "How does RocketLink handle trust and safety?",
            "What safety features help users trust each other?",
            "Does the platform mention scam reporting?",
            "How do you make trading safer on RocketLink?",
        ],
    },
    {
        "name": "value_prop",
        "keywords": ["friction", "one place", "messaging", "trading"],
        "prompts": [
            "What problem does the product solve?",
            "Why would a Rocket League player use this?",
            "What is the main value of RocketLink?",
            "Why is RocketLink useful compared with scattered trading servers?",
            "What does RocketLink improve for users?",
        ],
    },
    {
        "name": "difference_from_generic_chat",
        "keywords": ["trading", "one place", "community", "platform"],
        "prompts": [
            "What makes RocketLink different from generic chat servers?",
            "Why use this instead of a normal Discord server?",
            "How is RocketLink different from generic community apps?",
            "What makes this better than scattered chat channels?",
            "Why is RocketLink more than just a chat server?",
        ],
    },
    {
        "name": "free_tier",
        "keywords": ["free", "profile", "listings", "messages", "communities"],
        "prompts": [
            "Is there a free tier?",
            "What does the free version allow?",
            "What can someone do without paying?",
            "How much can a free user do on RocketLink?",
            "What is included in the free tier?",
        ],
    },
    {
        "name": "pricing_overview",
        "keywords": ["free", "plus", "pro", "guild"],
        "prompts": [
            "What is the overall pricing model?",
            "How is RocketLink priced?",
            "Can you explain the pricing tiers?",
            "What subscription options are available?",
            "What are the paid plans for RocketLink?",
        ],
    },
    {
        "name": "plus_price",
        "keywords": ["4.99", "plus"],
        "prompts": [
            "How much does RocketLink Plus cost?",
            "What is the price of the Plus plan?",
            "How much is Plus per month?",
            "What does RocketLink Plus cost every month?",
            "Can you tell me the monthly price for RocketLink Plus?",
        ],
    },
    {
        "name": "pro_price",
        "keywords": ["9.99", "pro"],
        "prompts": [
            "How much does RocketLink Pro cost?",
            "What is the price of the Pro plan?",
            "How much is Pro per month?",
            "What does RocketLink Pro cost every month?",
            "Can you tell me the monthly price for RocketLink Pro?",
        ],
    },
    {
        "name": "guild_price",
        "keywords": ["19.99", "guild"],
        "prompts": [
            "How much does RocketLink Guild cost?",
            "What is the price of the Guild plan?",
            "How much is Guild per month?",
            "What does RocketLink Guild cost every month?",
            "Can you tell me the monthly price for RocketLink Guild?",
        ],
    },
    {
        "name": "annual_pricing",
        "keywords": ["49.99", "99.99", "year"],
        "prompts": [
            "Do any plans have annual pricing?",
            "What yearly prices are mentioned?",
            "How much are the annual plans?",
            "Do Plus or Pro have yearly options?",
            "What are the per-year subscription prices?",
        ],
    },
    {
        "name": "plus_benefits",
        "keywords": ["plus", "messaging", "listings", "alerts", "searches"],
        "prompts": [
            "What do Plus users get?",
            "What features come with RocketLink Plus?",
            "What benefits are included in Plus?",
            "Why would someone upgrade to Plus?",
            "What does the Plus plan add?",
        ],
    },
    {
        "name": "pro_benefits",
        "keywords": ["pro", "analytics", "support", "filtering", "themes"],
        "prompts": [
            "What do Pro users get?",
            "What features come with RocketLink Pro?",
            "What benefits are included in Pro?",
            "Why would someone upgrade to Pro?",
            "What does the Pro plan add?",
        ],
    },
    {
        "name": "guild_benefits",
        "keywords": ["guild", "moderation", "branding", "events", "analytics"],
        "prompts": [
            "What do Guild users get?",
            "What features come with RocketLink Guild?",
            "What benefits are included in Guild?",
            "Why would someone choose the Guild plan?",
            "What does the Guild plan add?",
        ],
    },
    {
        "name": "monetization_model",
        "keywords": ["freemium", "subscription", "revenue", "pricing"],
        "prompts": [
            "How does the business make money?",
            "What is the business model?",
            "How would RocketLink generate revenue?",
            "How is RocketLink monetized?",
            "Where does the revenue come from?",
        ],
    },
    {
        "name": "one_time_purchases",
        "keywords": ["promoted listings", "visibility boosts", "cosmetic", "badge", "banner"],
        "prompts": [
            "Does the description mention any one-time purchases?",
            "Are there micro-monetization features?",
            "What optional one-off purchases are mentioned?",
            "Does RocketLink mention promoted listings or cosmetic upgrades?",
            "Besides subscriptions, what paid extras are described?",
        ],
    },
    {
        "name": "search_and_alerts",
        "keywords": ["filters", "saved searches", "alerts", "wishlists", "bookmarks"],
        "prompts": [
            "What search and discovery tools are included?",
            "Does RocketLink support trade alerts and saved searches?",
            "Can users search listings efficiently?",
            "What tools help users discover listings?",
            "How does RocketLink help users track items they want?",
        ],
    },
    {
        "name": "profiles",
        "keywords": ["profiles", "rank", "playstyle", "platforms", "history"],
        "prompts": [
            "What can users put on their profiles?",
            "What kind of profile information is mentioned?",
            "Do profiles include Rocket League preferences and history?",
            "How detailed are user profiles?",
            "What can a user profile show in RocketLink?",
        ],
    },
    {
        "name": "listing_details",
        "keywords": ["rarity", "certification", "paint", "series", "platform compatibility"],
        "prompts": [
            "What details can item listings include?",
            "Does the platform mention rarity and paint color in listings?",
            "What listing fields are described?",
            "Can listings include series and platform compatibility?",
            "How detailed are RocketLink item listings?",
        ],
    },
    {
        "name": "community_management",
        "keywords": ["moderation", "branding", "announcements", "event scheduling", "analytics"],
        "prompts": [
            "What community-management tools are mentioned?",
            "How does RocketLink support moderators and group owners?",
            "Are there branding, announcements, or event tools for communities?",
            "What tools help people run large RocketLink communities?",
            "Does RocketLink describe community-owner features?",
        ],
    },
    {
        "name": "trust_reputation",
        "keywords": ["ratings", "trust badges", "verified", "trade history", "reputation"],
        "prompts": [
            "Can users build a reputation on RocketLink?",
            "How does the platform show credibility?",
            "Does RocketLink mention verified users or trust badges?",
            "How is reputation handled on the platform?",
            "What trust signals are available to users?",
        ],
    },
    {
        "name": "groups_and_chat",
        "keywords": ["groups", "communities", "chat", "real time"],
        "prompts": [
            "Does it support groups or communities?",
            "Can users chat with each other?",
            "Can users message in real time?",
            "Are there topic-based groups or chat rooms?",
            "How do communities and chat work together in RocketLink?",
        ],
    },
    {
        "name": "filters_and_lists",
        "keywords": ["filter", "listings", "saved searches", "wishlists", "alerts"],
        "prompts": [
            "Can users filter listings?",
            "Does the platform support wishlists?",
            "Can users get alerts?",
            "Does RocketLink let users save searches?",
            "How can users track items they want to find later?",
        ],
    },
    {
        "name": "profile_customization",
        "keywords": ["profile", "customization", "themes", "badge"],
        "prompts": [
            "Can users customize profiles?",
            "Does the platform mention custom profile themes?",
            "Are there premium profile badges or themes?",
            "Can someone personalize their profile on RocketLink?",
            "What customization features are described for user profiles?",
        ],
    },
    {
        "name": "business_hours",
        "keywords": ["monday", "friday", "9:00", "6:00"],
        "prompts": [
            "What are your business hours?",
            "When are you open?",
            "What hours does the business operate?",
            "When can someone reach the business?",
            "What is the stated availability window?",
        ],
    },
    {
        "name": "follow_up_process",
        "keywords": ["name", "callback", "time window", "follow-up"],
        "prompts": [
            "How can I follow up?",
            "What is the follow-up process?",
            "How do I request a callback?",
            "What do you need from me for a follow-up?",
            "How can I ask someone to get back to me?",
        ],
    },
    {
        "name": "human_contact",
        "keywords": ["human", "name", "callback", "reason"],
        "prompts": [
            "How can I get in touch with a human?",
            "How do I speak with a real person?",
            "What should I do if I want a human follow-up?",
            "How do I reach a person instead of the AI?",
            "If I need a representative, what information should I leave?",
        ],
    },
    {
        "name": "leave_details",
        "keywords": ["name", "callback", "email", "message"],
        "prompts": [
            "Can I leave my information?",
            "What details should I leave for a follow-up?",
            "Can you take my details for a callback?",
            "What information do you need from me?",
            "If I want someone to contact me, what should I provide?",
        ],
    },
    {
        "name": "billing_followup",
        "keywords": ["billing", "callback", "summary", "human"],
        "prompts": [
            "Can you help with billing?",
            "What happens if I have a billing issue?",
            "How do billing problems get handled?",
            "If there is a payment issue, what do you do?",
            "Can billing concerns be escalated to a person?",
        ],
    },
    {
        "name": "after_hours",
        "keywords": ["after hours", "voicemail", "next-business-day", "follow-up"],
        "prompts": [
            "What happens after hours?",
            "What do you do when the business is closed?",
            "How is after-hours support handled?",
            "If I call outside business hours, what happens?",
            "What is the after-hours process?",
        ],
    },
    {
        "name": "voicemail",
        "keywords": ["voicemail", "follow-up", "message"],
        "prompts": [
            "Can I leave a voicemail?",
            "How do voicemail requests work?",
            "Do you take messages after hours?",
            "What happens if I leave a message?",
            "Can the system log a voicemail summary?",
        ],
    },
    {
        "name": "transfers",
        "keywords": ["escalate", "callback", "hour", "human"],
        "prompts": [
            "How do you handle transfers?",
            "What is the escalation process?",
            "How are urgent incidents routed to a person?",
            "If something needs escalation, what happens?",
            "What do you do with urgent billing or technical issues?",
        ],
    },
    {
        "name": "callback_number",
        "keywords": ["216-777-4448", "business line", "call back"],
        "prompts": [
            "What number should I call back?",
            "What is the business line?",
            "Which number is configured for the business?",
            "What phone number should someone use to reach the business?",
            "What is the callback number in this setup?",
        ],
    },
    {
        "name": "routing_mode",
        "keywords": ["routing mode", "ai first"],
        "prompts": [
            "What is the routing mode?",
            "How are calls routed right now?",
            "What call routing setup is configured?",
            "Is the current phone setup AI first?",
            "How does the current routing mode work?",
        ],
    },
    {
        "name": "account_creation",
        "keywords": ["email", "social", "profiles", "signup"],
        "prompts": [
            "How do users make an account?",
            "How would someone sign up?",
            "Does the description explain account creation?",
            "What is the signup path for new users?",
            "How would a new user get started?",
        ],
    },
    {
        "name": "support_scope",
        "keywords": ["pricing", "features", "trust", "callback"],
        "prompts": [
            "Do you offer support?",
            "What kinds of questions can you answer?",
            "What can you help me with?",
            "What is your support scope as the agent?",
            "What topics are you able to assist with?",
        ],
    },
]


def build_questions():
    questions = []
    for spec in TOPIC_SPECS:
        for prompt in spec["prompts"]:
            questions.append((prompt, spec["keywords"]))
    assert len(questions) == 200, len(questions)
    return questions


QUESTIONS = build_questions()


def post(path: str, payload: dict, token: str, timeout: int = 60):
    req = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as response:
        body = response.read()
    return json.loads(body.decode("utf-8")), time.perf_counter() - started


def main():
    token = create_access_token({"sub": USER_ID})
    post("/thesis/agent/reset", {}, token)

    results = []
    for question, expected_keywords in QUESTIONS:
        data, post_elapsed = post("/thesis/agent/respond", {"text": question}, token)
        answer = data["assistant_turn"]["text"].lower()
        passed_keywords = any(keyword.lower() in answer for keyword in expected_keywords)
        results.append(
            {
                "question": question,
                "answer": data["assistant_turn"]["text"],
                "total_seconds": round(post_elapsed, 3),
                "response_time_ms": data["response_time_ms"],
                "passed_keywords": passed_keywords,
                "audio_pending": data["assistant_turn"].get("audio_pending", False),
            }
        )

    max_total = max(item["total_seconds"] for item in results)
    failures = [item for item in results if not item["passed_keywords"] or item["total_seconds"] >= 3]
    print(json.dumps({
        "passed_all": len(failures) == 0,
        "max_total_seconds": max_total,
        "count": len(results),
        "failure_count": len(failures),
    }))
    for item in results:
        print(json.dumps(item))


if __name__ == "__main__":
    main()
