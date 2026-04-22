import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, "/home/anya/MyShortBIZ/server")

from db import SessionLocal
import json as pyjson

from models import TelephonySession, ThesisProject
from services.telephony_session_service import telephony_session_service


BASE_URL = "http://127.0.0.1:8000"
MAX_PCM_SECONDS = 5.0
LONG_CALL_TURNS = [
    ("Hi, what business is this?", ["rocketlink", "community"]),
    ("Give me the short version.", ["rocketlink", "trade"]),
    ("So is it more of a marketplace or a community app?", ["community", "marketplace"]),
    ("Who is it built for?", ["traders", "players"]),
    ("What can people actually do on it?", ["profiles", "chat", "trade"]),
    ("How does it make trading safer?", ["ratings", "scam", "moderation", "trust"]),
    ("What makes it better than scattered Discord servers?", ["chat", "one place", "servers", "apps"]),
    ("Is there a free tier?", ["free tier", "profile", "communities"]),
    ("What are the paid plans?", ["plus", "pro", "guild"]),
    ("What do Plus users get?", ["saved searches", "alerts", "bookmarks"]),
    ("And what does Pro add?", ["featured", "analytics", "priority"]),
    ("What is Guild for?", ["community management", "moderation", "groups"]),
    ("Do you mention yearly pricing too?", ["49.99", "99.99"]),
    ("What about one-time paid extras?", ["promoted listings", "boosts", "badge"]),
    ("Does the platform support search and alerts?", ["filters", "alerts", "search"]),
    ("What can item listings include?", ["rarity", "certification", "paint"]),
    ("What if I want to talk to a human later?", ["human", "callback"]),
    ("My callback number is 480-555-1212, and tomorrow afternoon works best.", ["callback number", "preferred time"]),
    ("I already gave both. Can you summarize what you have?", ["callback number", "preferred time"]),
    ("Great. What happens next?", ["next step", "follow-up"]),
    ("And if I miss the call?", ["miss", "follow-up"]),
    ("Thanks, that is all I needed.", ["welcome", "helping"]),
    ("What business is this again?", ["rocketlink"]),
    ("How is this safer than random trading servers?", ["trust", "ratings", "moderation"]),
    ("Who would normally use it?", ["players", "traders"]),
    ("Can users message each other in real time?", ["chat", "real time"]),
    ("What profile information can people show?", ["platforms", "rank", "history"]),
    ("Does it help users discover listings?", ["filters", "search", "alerts"]),
    ("How is RocketLink monetized?", ["freemium", "subscriptions", "extras"]),
    ("Can community leaders use it too?", ["moderators", "creators", "leaders"]),
    ("What does the free version let people do?", ["free tier", "profile", "listings"]),
    ("What is RocketLink Plus for?", ["listings", "messaging", "alerts"]),
    ("What is RocketLink Pro for?", ["featured", "analytics", "support"]),
    ("Can you remind me what Guild is for?", ["community management", "moderation"]),
    ("How do users find trades faster?", ["filters", "saved searches", "alerts"]),
    ("What kinds of listing details are supported?", ["rarity", "series", "platform"]),
    ("If I need a real person, what do you need from me?", ["name", "callback", "reason"]),
    ("My name is Alex Carter.", ["alex", "name"]),
    ("Can you summarize my follow-up request?", ["name", "callback number", "preferred time"]),
    ("What happens after you log that?", ["next step", "follow-up"]),
    ("If I miss the callback, can I update it?", ["new time", "follow-up"]),
    ("What kind of company is this?", ["community", "marketplace"]),
    ("What does the platform mainly help with?", ["connect", "trade", "chat"]),
    ("Is it mainly for collectors too?", ["collectors", "players"]),
    ("Can groups and communities be managed inside it?", ["moderation", "announcements", "events"]),
    ("Do users get trust badges or reputation signals?", ["trust", "ratings", "badges"]),
    ("What is the business line again?", ["878-251-9238", "business line"]),
    ("What can you help with on this call?", ["questions", "pricing", "callback"]),
    ("Tell me the short version one more time.", ["rocketlink", "trade"]),
    ("Who is it built for one more time?", ["players", "traders"]),
    ("What can people do on it one more time?", ["profiles", "chat", "trade"]),
    ("How does it make trading safer one more time?", ["trust", "ratings", "moderation"]),
    ("What makes it better than Discord one more time?", ["one place", "apps", "servers"]),
    ("Do you still have my callback number?", ["callback number"]),
    ("Do you still have my preferred time?", ["preferred time"]),
    ("Can you summarize everything you have for the follow-up?", ["callback number", "preferred time"]),
]
SCENARIOS = [
    {
        "name": "exact_demo_script",
        "turns": [
            ("Hi, what business is this?", ["rocketlink", "community"]),
            ("Give me the short version.", ["rocketlink", "trade"]),
            ("So is it more of a marketplace or a community app?", ["community", "marketplace"]),
            ("Who is it built for?", ["players", "traders"]),
            ("What can people actually do on it?", ["profiles", "chat", "trade"]),
            ("How does it make trading safer?", ["ratings", "scam", "moderation"]),
            ("What makes it better than scattered Discord servers?", ["chat", "trust", "one place"]),
            ("Is there a free tier?", ["free tier", "limited messaging"]),
            ("What are the paid plans?", ["plus", "pro", "guild"]),
            ("What do Plus users get?", ["plus", "messaging", "alerts", "badge"]),
            ("And what does Pro add?", ["pro", "analytics", "priority"]),
            ("What is Guild for?", ["guild", "community management", "moderation"]),
            ("Do you mention yearly pricing too?", ["49.99", "99.99"]),
            ("What about one-time paid extras?", ["promoted listings", "boosts", "badge"]),
            ("Does the platform support search and alerts?", ["filters", "alerts", "search"]),
            ("What can item listings include?", ["rarity", "certification", "platform"]),
            ("What if I want to talk to a human later?", ["human", "callback"]),
            ("My callback number is 480-555-1212, and tomorrow afternoon works best.", ["callback number", "preferred time"]),
            ("I already gave both. Can you summarize what you havy", ["callback number", "preferred time"]),
            ("Great. What happens next", ["next step", "follow-up"]),
            ("And if I miss the call?", ["miss", "follow-up"]),
            ("Thanks, that’s all I needed", ["welcome", "helping"]),
        ],
    },
    {
        "name": "opening_business_flow",
        "turns": [
            ("Hi. What business is this?", ["rocketlink", "marketplace"]),
            ("Give me the short version.", ["rocketlink", "trade"]),
            ("So is it more of a marketplace or a community app?", ["community", "marketplace"]),
            ("Who is it built for?", ["players", "traders"]),
        ],
    },
    {
        "name": "no_punctuation_business_flow",
        "turns": [
            ("what business is this", ["rocketlink", "community"]),
            ("so is it more of a marketplace or a community", ["community", "marketplace"]),
            ("who is it built for", ["players", "traders"]),
            ("what can people actually do on it", ["profiles", "chat", "trade"]),
        ],
    },
    {
        "name": "merged_turns",
        "turns": [
            ("Give me the short version. So is it more of a marketplace or a community app?", ["rocketlink", "community"]),
            ("Who is it billed for?", ["players", "traders"]),
        ],
    },
    {
        "name": "pricing_and_handoff",
        "turns": [
            ("How much does it cost?", ["free", "plus", "pro", "guild"]),
            ("How can I get in touch with a human?", ["callback", "human"]),
            ("How can I follow up?", ["callback", "follow-up"]),
        ],
    },
    {
        "name": "merged_pricing_cluster",
        "turns": [
            (
                "What are the paid plans What do plus users get?",
                ["plus", "pro", "guild", "messaging"],
            ),
            (
                "What are the paid plans What the plus users get?",
                ["plus", "pro", "guild", "messaging"],
            ),
            (
                "Is there a free tier? What are the paid plans What do plus users get?",
                ["free tier", "plus", "pro", "guild", "messaging"],
            ),
            (
                "Is there a free tier? What are the paid plans What the plus users get?",
                ["free tier", "plus", "pro", "guild", "messaging"],
            ),
            (
                "What are the paid plans? What do Plus users get?",
                ["plus", "pro", "guild", "messaging"],
            ),
            (
                "What do Plus users get? And what does Pro add?",
                ["plus", "featured", "priority"],
            ),
            (
                "And what does Pro add? What is Guild for?",
                ["featured", "guild", "community management"],
            ),
        ],
    },
    {
        "name": "trust_and_features",
        "turns": [
            ("What can people actually do on it?", ["profiles", "chat", "trade"]),
            ("How does it make trading safer?", ["verified", "ratings", "scam", "trust"]),
            ("Does it support search and alerts?", ["filters", "alerts", "search"]),
        ],
    },
    {
        "name": "cutoff_and_recovery",
        "turns": [
            ("Hi. What business is", ["cut off", "repeat"]),
            ("What business is this?", ["rocketlink", "marketplace"]),
        ],
    },
    {
        "name": "asr_variant_and_merge_recovery",
        "turns": [
            ("Who is it billed for?", ["traders", "players"]),
            ("Who is the dole for?", ["traders", "players"]),
            ("Who is it dealt for?", ["traders", "players"]),
            (
                "Who is it billed for? Who is the dole for? What can people actually do on it?",
                ["traders", "profiles", "chat", "trade"],
            ),
            (
                "What can people actually do on it? How does it make trading safer?",
                ["profiles", "chat", "trade", "ratings", "moderation"],
            ),
        ],
    },
]


def post_json(path: str, payload: dict, timeout: float = 5.0):
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
    elapsed = time.perf_counter() - started
    return json.loads(body.decode("utf-8")), elapsed


def post_stream(path: str, payload: dict, timeout: float = 5.0):
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
    elapsed = time.perf_counter() - started
    return raw, elapsed


def parse_stream_content(stream_raw: str) -> str:
    content_parts: list[str] = []
    for raw_line in stream_raw.splitlines():
        line = raw_line.strip()
        if not line.startswith("data: ") or line == "data: [DONE]":
            continue
        payload = json.loads(line[len("data: ") :])
        for choice in payload.get("choices", []):
            delta = choice.get("delta") or {}
            chunk = delta.get("content")
            if chunk:
                content_parts.append(chunk)
    return "".join(content_parts).strip()


def count_stream_content_chunks(stream_raw: str) -> int:
    count = 0
    for raw_line in stream_raw.splitlines():
        line = raw_line.strip()
        if not line.startswith("data: ") or line == "data: [DONE]":
            continue
        payload = json.loads(line[len("data: ") :])
        for choice in payload.get("choices", []):
            delta = choice.get("delta") or {}
            if delta.get("content"):
                count += 1
    return count


def ensure_session() -> str:
    db = SessionLocal()
    try:
        session = (
            db.query(TelephonySession)
            .filter(TelephonySession.session_metadata_json.isnot(None))
            .order_by(TelephonySession.updated_at.desc(), TelephonySession.created_at.desc())
            .first()
        )
        if not session:
            raise RuntimeError("No telephony session available for phone benchmark.")
        context = telephony_session_service.get_context(session)
        if not context.get("voice_prompt_path"):
            raise RuntimeError("No voice prompt path available for phone benchmark.")
        return session.call_id
    finally:
        db.close()


def latest_phone_number_id() -> str:
    db = SessionLocal()
    try:
        session = (
            db.query(TelephonySession)
            .filter(TelephonySession.phone_number_id.isnot(None))
            .order_by(TelephonySession.updated_at.desc(), TelephonySession.created_at.desc())
            .first()
        )
        if not session or not session.phone_number_id:
            raise RuntimeError("No telephony phone number ID available for benchmark.")
        return session.phone_number_id
    finally:
        db.close()


def event_envelope(call_id: str, phone_number_id: str, message_type: str, **message_fields):
    return {
        "message": {
            "type": message_type,
            "call": {
                "id": call_id,
                "phoneNumberId": phone_number_id,
                "customer": {"number": "+15555550123"},
            },
            **message_fields,
        }
    }


def run_long_call_stability() -> dict:
    phone_number_id = latest_phone_number_id()
    call_id = f"benchmark-long-{int(time.time())}"
    assistant_payload = event_envelope(call_id, phone_number_id, "assistant-request")
    post_json("/telephony/vapi/assistant-request", assistant_payload, timeout=10.0)

    db = SessionLocal()
    try:
        session = telephony_session_service.get_session(db, call_id)
        if not session:
            raise RuntimeError("assistant-request did not create a telephony session for benchmark.")
    finally:
        db.close()

    history = [{"role": "system", "content": "You are Nate."}]
    call_messages = [
        {
            "role": "system",
            "message": "You are Nate.",
            "time": 0,
            "secondsFromStart": 0,
        }
    ]
    max_turn_total = 0.0
    max_event_seconds = 0.0
    failures: list[str] = []

    for index, (prompt, expected_keywords) in enumerate(LONG_CALL_TURNS, start=1):
        transcript_payload = event_envelope(
            call_id,
            phone_number_id,
            "transcript",
            role="user",
            transcriptType="final",
            transcript=prompt,
        )
        _, transcript_elapsed = post_json("/telephony/vapi/events", transcript_payload, timeout=10.0)
        max_event_seconds = max(max_event_seconds, transcript_elapsed)

        stream_payload = {
            "model": "thesis-phone-agent",
            "stream": True,
            "messages": history + [{"role": "user", "content": prompt}],
        }
        stream_raw, chat_elapsed = post_stream("/telephony/vapi/chat/completions", stream_payload, timeout=10.0)
        reply = parse_stream_content(stream_raw)
        if "data: [DONE]" not in stream_raw or '"finish_reason": "stop"' not in stream_raw:
            failures.append(f"turn {index} stream did not terminate correctly for prompt {prompt!r}")
        if count_stream_content_chunks(stream_raw) != 1:
            failures.append(f"turn {index} stream emitted unexpected content chunk count for prompt {prompt!r}")
        reply_lower = reply.lower()
        if not any(keyword in reply_lower for keyword in expected_keywords):
            failures.append(f"turn {index} reply {reply!r} missing expected keywords {expected_keywords!r}")

        voice_payload = {
            "message": {
                "type": "voice-request",
                "call": {"id": call_id},
                "text": reply,
                "sampleRate": 8000,
            }
        }
        request = urllib.request.Request(
            f"{BASE_URL}/telephony/vapi/voice",
            data=json.dumps(voice_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        voice_started = time.perf_counter()
        with urllib.request.urlopen(request, timeout=15) as response_obj:
            voice_bytes = response_obj.read()
            voice_status = response_obj.status
        voice_elapsed = time.perf_counter() - voice_started
        if voice_status != 200 or len(voice_bytes) < 4000:
            failures.append(f"turn {index} voice route did not return usable PCM audio")
        pcm_seconds = len(voice_bytes) / (8000 * 2)
        if pcm_seconds > MAX_PCM_SECONDS:
            failures.append(f"turn {index} phone audio length {pcm_seconds:.3f}s > {MAX_PCM_SECONDS:.1f}s for prompt {prompt!r}")

        turn_total = chat_elapsed + voice_elapsed
        max_turn_total = max(max_turn_total, turn_total)
        if turn_total > 3.0:
            failures.append(f"turn {index} total latency {turn_total:.3f}s > 3.0s for prompt {prompt!r}")

        call_messages.extend(
            [
                {
                    "role": "user",
                    "message": prompt,
                    "time": index * 1000,
                    "secondsFromStart": float(index),
                },
                {
                    "role": "bot",
                    "message": reply,
                    "time": index * 1000 + 500,
                    "secondsFromStart": float(index) + 0.5,
                },
            ]
        )
        conversation_payload = event_envelope(
            call_id,
            phone_number_id,
            "conversation-update",
            messages=call_messages,
        )
        _, conversation_elapsed = post_json("/telephony/vapi/events", conversation_payload, timeout=10.0)
        max_event_seconds = max(max_event_seconds, conversation_elapsed)

        history.extend(
            [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": reply},
            ]
        )

    end_payload = event_envelope(
        call_id,
        phone_number_id,
        "end-of-call-report",
        artifact={
            "transcript": "\n".join(f"{message['role']}: {message['message']}" for message in call_messages if message.get("message")),
            "recording": {"mono": {"combinedUrl": "https://example.com/fake.wav"}},
            "messages": call_messages,
        },
    )
    post_json("/telephony/vapi/events", end_payload, timeout=10.0)

    db = SessionLocal()
    try:
        session = telephony_session_service.get_session(db, call_id)
        if not session:
            raise RuntimeError("Synthetic long-call session was not found after benchmark.")
        sizes = {
            "session_metadata_bytes": len(session.session_metadata_json or ""),
            "messages_bytes": len(session.messages_json or ""),
            "transcript_bytes": len(session.transcript_json or ""),
            "artifacts_bytes": len(session.artifacts_json or ""),
        }
        messages = pyjson.loads(session.messages_json or "[]")
        if sizes["session_metadata_bytes"] > 120000:
            failures.append(f"session metadata grew too large: {sizes['session_metadata_bytes']} bytes")
        if len(messages) > 120:
            failures.append(f"message history grew too large: {len(messages)} entries")
    finally:
        db.close()

    return {
        "call_id": call_id,
        "turns": len(LONG_CALL_TURNS),
        "max_turn_total_seconds": round(max_turn_total, 3),
        "max_event_seconds": round(max_event_seconds, 3),
        "failures": failures,
        "sizes": sizes,
    }


def run():
    call_id = ensure_session()
    max_non_stream = 0.0
    max_stream = 0.0
    failures: list[str] = []

    for scenario in SCENARIOS:
        history = [{"role": "system", "content": "You are Nate."}]
        for prompt, expected_keywords in scenario["turns"]:
            non_stream_payload = {
                "model": "thesis-phone-agent",
                "stream": False,
                "messages": history + [{"role": "user", "content": prompt}],
            }
            response, elapsed = post_json("/telephony/vapi/chat/completions", non_stream_payload)
            max_non_stream = max(max_non_stream, elapsed)
            reply = response["choices"][0]["message"]["content"].lower()
            if elapsed > 3.0:
                failures.append(f"{scenario['name']} non-stream latency {elapsed:.3f}s > 3.0s for prompt {prompt!r}")
            if not any(keyword in reply for keyword in expected_keywords):
                failures.append(f"{scenario['name']} reply {reply!r} missing expected keywords {expected_keywords!r}")

            stream_payload = {
                "model": "thesis-phone-agent",
                "stream": True,
                "messages": history + [{"role": "user", "content": prompt}],
            }
            stream_raw, stream_elapsed = post_stream("/telephony/vapi/chat/completions", stream_payload)
            max_stream = max(max_stream, stream_elapsed)
            if stream_elapsed > 3.0:
                failures.append(f"{scenario['name']} stream latency {stream_elapsed:.3f}s > 3.0s for prompt {prompt!r}")
            if "data: [DONE]" not in stream_raw or '"finish_reason": "stop"' not in stream_raw:
                failures.append(f"{scenario['name']} stream did not terminate correctly for prompt {prompt!r}")
            if count_stream_content_chunks(stream_raw) != 1:
                failures.append(f"{scenario['name']} stream emitted unexpected content chunk count for prompt {prompt!r}")

            history.extend(
                [
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": response["choices"][0]["message"]["content"]},
                ]
            )

    voice_payload = {
        "message": {
            "type": "voice-request",
            "call": {"id": call_id},
            "text": "RocketLink helps Rocket League players connect, chat, build trust, and trade items inside one dedicated platform.",
            "sampleRate": 8000,
        }
    }
    request = urllib.request.Request(
        f"{BASE_URL}/telephony/vapi/voice",
        data=json.dumps(voice_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    voice_started = time.perf_counter()
    with urllib.request.urlopen(request, timeout=10) as response:
        voice_bytes = response.read()
        voice_status = response.status
    voice_elapsed = time.perf_counter() - voice_started
    if voice_status != 200 or len(voice_bytes) < 4000:
        failures.append("voice route did not return usable PCM audio")
    pcm_seconds = len(voice_bytes) / (8000 * 2)
    if pcm_seconds > MAX_PCM_SECONDS:
        failures.append(f"voice audio length {pcm_seconds:.3f}s > {MAX_PCM_SECONDS:.1f}s")

    long_call_result = run_long_call_stability()
    failures.extend(long_call_result["failures"])

    result = {
        "passed": not failures,
        "failure_count": len(failures),
        "max_non_stream_seconds": round(max_non_stream, 3),
        "max_stream_seconds": round(max_stream, 3),
        "voice_seconds": round(voice_elapsed, 3),
        "voice_bytes": len(voice_bytes),
        "voice_pcm_seconds": round(pcm_seconds, 3),
        "scenarios": len(SCENARIOS),
        "turns": sum(len(item["turns"]) for item in SCENARIOS),
        "long_call": long_call_result,
        "failures": failures,
    }
    print(json.dumps(result, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    run()
