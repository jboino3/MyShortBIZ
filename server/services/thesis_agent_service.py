from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


class ThesisAgentService:
    _STOPWORDS = {
        "the",
        "and",
        "for",
        "you",
        "your",
        "with",
        "this",
        "that",
        "can",
        "are",
        "about",
        "they",
        "them",
        "their",
        "from",
        "into",
        "have",
        "does",
        "what",
    }

    def _clean(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def _contains_any(self, text: str, phrases: list[str]) -> bool:
        normalized_text = f" {self._clean(text).lower()} "
        for phrase in phrases:
            normalized_phrase = self._clean(phrase).lower()
            if not normalized_phrase:
                continue
            pattern = rf"(?<![a-z0-9]){re.escape(normalized_phrase)}(?![a-z0-9])"
            if re.search(pattern, normalized_text):
                return True
        return False

    def _tokens(self, text: str) -> set[str]:
        return {
            token
            for token in re.findall(r"[a-z0-9']+", text.lower())
            if len(token) > 1 and token not in self._STOPWORDS
        }

    def _sentences(self, text: str) -> list[str]:
        return [item.strip() for item in re.split(r"(?<=[.!?])\s+", text.strip()) if item.strip()]

    def _question_like_segments(self, text: str) -> list[str]:
        cleaned = self._clean(text)
        if not cleaned:
            return []

        sentences = self._sentences(cleaned)
        if len(sentences) > 1:
            filtered = [
                item for item in sentences
                if not re.fullmatch(r"(hi|hello|hey|good morning|good afternoon|good evening)[.!?]?", item, flags=re.IGNORECASE)
                and not re.fullmatch(r"(great|okay|ok|alright|sounds good|got it|perfect|right)[.!?]?", item, flags=re.IGNORECASE)
            ]
            return filtered or sentences
        return [cleaned]

    def _paragraphs(self, text: str) -> list[str]:
        return [item.strip() for item in re.split(r"\n\s*\n", text.strip()) if item.strip()]

    def _shorten(self, text: str, max_chars: int = 260, max_sentences: int = 2) -> str:
        sentences = self._sentences(self._clean(text))
        if not sentences:
            return self._clean(text)[:max_chars].rstrip()
        candidate = " ".join(sentences[:max_sentences]).strip()
        if len(candidate) <= max_chars:
            return candidate
        clipped = candidate[:max_chars].rsplit(" ", 1)[0].rstrip(" ,;:")
        return clipped or candidate[:max_chars].rstrip()

    def _trim_dangling_tail(self, text: str) -> str:
        cleaned = self._clean(text).rstrip(" ,;:-")
        cleaned = re.sub(r"\b(and|or|but|with|for|to|of|in|on|at)\s+\1\b\.?$", r"\1", cleaned, flags=re.IGNORECASE)
        while re.search(r"\b(and|or|but|with|for|to|of|in|on|at)\b$", cleaned, flags=re.IGNORECASE):
            cleaned = re.sub(r"\s+\b(and|or|but|with|for|to|of|in|on|at)\b$", "", cleaned, flags=re.IGNORECASE).rstrip(" ,;:-")
        return cleaned

    def _is_incomplete_question(self, text: str) -> bool:
        cleaned = self._clean(text).lower()
        if not cleaned:
            return False
        if cleaned.endswith(("?", ".", "!")):
            return False
        tokens = re.findall(r"[a-z0-9']+", cleaned)
        if len(tokens) >= 5:
            if tuple(tokens[-2:]) in {
                ("built", "for"),
                ("meant", "for"),
                ("good", "for"),
                ("looking", "for"),
                ("support", "search"),
                ("search", "alerts"),
                ("paid", "plans"),
            }:
                return False
            if tokens[-1] not in {"and", "or", "with", "about", "to", "a", "an", "the", "my", "your", "our"}:
                return False
        return bool(
            re.search(
                r"\b(what|who|how|where|when|why|is|are|do|does|can|could|would|should|the|a|an|of|for|about)$",
                cleaned,
            )
        )

    def _extract_sentence(self, description: str, keywords: list[str], fallback: str, max_chars: int = 220) -> str:
        paragraph = self._matching_paragraph(description, keywords)
        if not paragraph:
            return self._shorten(fallback, max_chars=max_chars)

        lowered_keywords = [keyword.lower() for keyword in keywords]
        for sentence in self._sentences(paragraph):
            lowered_sentence = sentence.lower()
            if any(re.search(rf"\b{re.escape(keyword)}\b", lowered_sentence) for keyword in lowered_keywords):
                return self._shorten(sentence, max_chars=max_chars, max_sentences=1)

        return self._shorten(paragraph, max_chars=max_chars, max_sentences=1)

    def _matching_paragraph(self, description: str, keywords: list[str]) -> str:
        paragraphs = self._paragraphs(description)
        best = ""
        best_score = 0
        for paragraph in paragraphs:
            lowered = paragraph.lower()
            score = sum(1 for keyword in keywords if re.search(rf"\b{re.escape(keyword)}\b", lowered))
            if score > best_score:
                best = paragraph
                best_score = score
        return best

    def _extract_pricing(self, description: str) -> dict[str, str]:
        tiers: dict[str, str] = {}
        cleaned = self._clean(description)
        tier_pattern = re.compile(
            r"(RocketLink\s+(Plus|Pro|Guild))[, ]+priced at\s+\$([0-9]+\.[0-9]{2})\s+per month(?:\s+or\s+\$([0-9]+\.[0-9]{2})\s+per year)?",
            re.IGNORECASE,
        )
        for match in tier_pattern.finditer(cleaned):
            tier_name = match.group(1).strip()
            monthly = match.group(3)
            yearly = match.group(4)
            tiers[tier_name.lower()] = (
                f"{tier_name} costs ${monthly} per month"
                + (f" or ${yearly} per year." if yearly else ".")
            )

        free_paragraph = self._matching_paragraph(description, ["free tier", "free", "limited", "active listings"])
        if free_paragraph:
            tiers["free"] = self._shorten(free_paragraph, max_chars=180, max_sentences=1)
        return tiers

    def _extract_positioning(self, description: str, business_name: str) -> str:
        match = re.search(r"In one concise positioning statement,\s*(.+)", description, re.IGNORECASE | re.DOTALL)
        if match:
            return self._shorten(match.group(1), max_chars=145, max_sentences=1)
        paragraph = self._matching_paragraph(description, ["dedicated social trading platform", "concise positioning statement"])
        if paragraph:
            return self._shorten(paragraph, max_chars=145, max_sentences=1)
        return self._shorten(description or f"{business_name} is a business phone assistant demo.", max_chars=145, max_sentences=1)

    def _topic_summary(self, description: str, keywords: list[str], fallback: str, max_chars: int = 190) -> str:
        paragraph = self._matching_paragraph(description, keywords)
        return self._shorten(paragraph or fallback, max_chars=max_chars)

    def _extract_price_value(self, text: str) -> str:
        match = re.search(r"\$([0-9]+\.[0-9]{2})", text)
        return match.group(1) if match else "not listed"

    def _best_sentence_match(self, description: str, query: str, min_score: int = 2) -> str | None:
        query_tokens = self._tokens(query)
        if not query_tokens:
            return None

        best_sentence = None
        best_score = 0
        for paragraph in self._paragraphs(description):
            for sentence in self._sentences(paragraph):
                sentence_tokens = self._tokens(sentence)
                score = len(query_tokens & sentence_tokens)
                if score > best_score:
                    best_score = score
                    best_sentence = sentence

        if best_sentence and best_score >= min_score:
            return self._shorten(best_sentence, max_chars=210, max_sentences=1)
        return None

    def _build_business_knowledge(
        self,
        *,
        agent_config: dict[str, Any],
        phone_config: dict[str, Any],
        business_name: str,
    ) -> dict[str, str]:
        description = self._clean(agent_config.get("business_description", ""))
        business_hours = self._clean(agent_config.get("business_hours", "Monday to Friday, 9:00 AM to 6:00 PM"))
        call_objective = self._clean(agent_config.get("call_objective", "Answer questions and collect caller information."))
        fallback_behavior = self._clean(
            agent_config.get("fallback_behavior", "Collect the caller's name, callback number, and the reason for the call.")
        )
        transfer_instructions = self._clean(
            agent_config.get("transfer_instructions", "Escalate the request to a human follow-up.")
        )
        after_hours_behavior = self._clean(
            agent_config.get("after_hours_behavior", "Take a concise voicemail summary and promise a next-business-day reply.")
        )
        routing_mode = self._clean(phone_config.get("routing_mode", "ai_first").replace("_", " "))
        phone_number = self._clean(phone_config.get("phone_number", ""))

        business_summary = "RocketLink is a Rocket League trading and community app."
        business_type = "It combines community chat with a Rocket League item marketplace."
        short_description = "RocketLink helps Rocket League players connect, chat, and trade in one app."
        social_summary = "Users can create profiles, join groups, chat in real time, and build trusted relationships around Rocket League trading."
        trading_summary = "Users can list Rocket League items, browse and filter listings, negotiate trades, and manage inventories in one structured marketplace."
        audience_summary = "It is built for Rocket League traders, players, creators, moderators, and community leaders."
        trust_summary = "It makes trading safer with profiles, ratings, trade history, scam reporting, and moderation."
        value_summary = "It puts chat, trust signals, and item trading in one place instead of scattered servers and apps."
        monetization_summary = (
            "RocketLink uses a freemium model with a free tier, paid Plus, Pro, and Guild subscriptions, "
            "and optional one-time extras like promoted listings, visibility boosts, cosmetic upgrades, banner customization, and seasonal badge packs."
        )
        feature_summary = "Users can build profiles, chat, browse listings, and trade Rocket League items in one app."
        pricing = self._extract_pricing(description)

        plus_price = pricing.get("rocketlink plus", "RocketLink Plus pricing is not clearly stated in the saved description.")
        pro_price = pricing.get("rocketlink pro", "RocketLink Pro pricing is not clearly stated in the saved description.")
        guild_price = pricing.get("rocketlink guild", "RocketLink Guild pricing is not clearly stated in the saved description.")
        free_tier = (
            "The free tier lets users create a profile, join public communities, browse listings, send a limited number of direct messages per day, and keep a small number of active listings."
            if pricing.get("free")
            else "The free tier is described as limited but usable for onboarding and light usage."
        )
        plus_benefits = "Plus adds more active listings, unlimited direct messaging, expanded saved searches, trade alerts, trader bookmarks, and a premium profile badge."
        pro_benefits = "Pro adds featured listings, advanced item filtering, inventory analytics, custom profile themes, priority support, deeper reputation insights, and enhanced trade history tools."
        guild_benefits = "Guild focuses on community management with advanced moderation tools, larger private groups, branding options, announcements, event scheduling, discovery boosts, and engagement analytics."
        one_time_purchases = "The description mentions optional paid extras such as promoted listings, temporary visibility boosts, cosmetic profile upgrades, community banner customization, and seasonal badge packs."
        search_summary = "Search and discovery features include advanced filters, saved searches, trade alerts, wishlists, trader bookmarks, and recommendation tools."
        profile_summary = "Profiles can show Rocket League interests, favorite item types, rank, playstyle, preferred platforms, and trading history."
        listing_details = "Listings can include rarity, certification, paint color, series, platform compatibility, and trade preferences."
        community_management = "Community tools include moderation controls, branding, announcements, event scheduling, boosted discovery, member caps, and engagement analytics."
        follow_up = "I can help with a follow-up. Please share your name, callback number, email if useful, and a short reason for the follow-up."
        human_contact = "To reach a human, leave your name, callback number, and the reason you need a person, and I can route that for follow-up."
        leave_details = "You can leave your name, callback number, email if helpful, and a short message, and I can log it for a human follow-up."
        next_step = "Next, a human follows up using your callback number and preferred time."
        missed_call = "If you miss it, give me a new time window and I can log the update."
        follow_up_captured = "I have your callback number and preferred time. I still need your name for the handoff."
        follow_up_captured_with_name = "I have your callback number, preferred time, and name. I can pass that to a human follow-up."
        follow_up_summary = "I have your callback number and preferred time. I still do not have your name."
        follow_up_summary_with_name = "I have your name, callback number, and preferred time for the follow-up."

        pricing_summary = (
            f"RocketLink has a free tier. Plus is ${self._extract_price_value(plus_price)}, "
            f"Pro is ${self._extract_price_value(pro_price)}, and Guild is ${self._extract_price_value(guild_price)} per month."
        )

        return {
            "business_summary": business_summary,
            "short_description": short_description,
            "business_type": business_type,
            "social_summary": social_summary,
            "trading_summary": trading_summary,
            "audience_summary": audience_summary,
            "trust_summary": trust_summary,
            "value_summary": value_summary,
            "feature_summary": feature_summary,
            "monetization_summary": monetization_summary,
            "one_time_purchases": one_time_purchases,
            "search_summary": search_summary,
            "profile_summary": profile_summary,
            "listing_details": listing_details,
            "community_management": community_management,
            "pricing_summary": pricing_summary,
            "free_tier": free_tier,
            "plus_price": plus_price,
            "pro_price": pro_price,
            "guild_price": guild_price,
            "plus_benefits": plus_benefits,
            "pro_benefits": pro_benefits,
            "guild_benefits": guild_benefits,
            "hours": f"We're open {business_hours}.",
            "schedule": "Yes. Tell me your name, callback number, and the time window you want.",
            "schedule_confirm": "That works. I can log that request for follow-up. Please include your name and callback number if you have not shared them yet.",
            "billing": f"I can log the billing issue for follow-up. {transfer_instructions} Please share your name, callback number, and a short summary.",
            "after_hours": f"After hours, I can take a voicemail summary and queue a next-business-day follow-up.",
            "voicemail": f"The after-hours path is to take a voicemail summary and arrange a next-business-day follow-up.",
            "follow_up": follow_up,
            "human_contact": human_contact,
            "leave_details": leave_details,
            "next_step": next_step,
            "missed_call": missed_call,
            "follow_up_captured": follow_up_captured,
            "follow_up_captured_with_name": follow_up_captured_with_name,
            "follow_up_summary": follow_up_summary,
            "follow_up_summary_with_name": follow_up_summary_with_name,
            "routing": f"The current call routing mode is {routing_mode}.",
            "number": f"The configured business line for this thesis setup is {phone_number}." if phone_number else "The business line is configured in the phone setup stage.",
            "support": "Yes. I can answer questions about the business, pricing, features, trust and safety, and callback requests.",
            "fallback_behavior": f"If I am unsure, this is the fallback process: {fallback_behavior}",
            "transfer": f"For escalation, the current instruction is: {transfer_instructions}",
            "identity": f"I’m {agent_config.get('agent_name', 'Maya')}, the AI phone agent for {business_name}. I help with questions, pricing, and follow-up requests.",
            "greeting": self._shorten(agent_config.get("greeting_script", "Thanks for calling. How can I help you today?"), max_chars=200, max_sentences=1),
            "disclosure": "Callers are told they are speaking with an AI business phone agent using the cloned business voice.",
            "smalltalk": f"I’m doing well and ready to help on behalf of {business_name}.",
            "account_creation": "The description says users create profiles, but it does not define signup mechanics. Email or social sign-in would be a typical path.",
            "general_knowledge_fallback": (
                "That is outside the saved business description. I can still help with simple conversational questions, "
                "but I am most reliable on the business, pricing, features, and callback workflow."
            ),
            "general_unknown_business": (
                "That specific detail is not clearly stated in the saved business description. "
                f"What is clear is this: {business_summary}"
            ),
        }

    def warmup_prompts(self) -> list[str]:
        return [
            "What does this business do?",
            "How much does it cost?",
            "How do you handle transfers?",
            "What happens after hours?",
            "How do users make an account?",
        ]

    def demo_phone_prompts(self) -> list[str]:
        return [
            "Hi, what business is this?",
            "Give me the short version.",
            "So is it more of a marketplace or a community app?",
            "Who is it built for?",
            "What can people actually do on it?",
            "How does it make trading safer?",
            "What makes it better than scattered Discord servers?",
            "Is there a free tier?",
            "What are the paid plans?",
            "What do Plus users get?",
            "And what does Pro add?",
            "What is Guild for?",
            "Do you mention yearly pricing too?",
            "What about one-time paid extras?",
            "Does the platform support search and alerts?",
            "What can item listings include?",
            "What if I want to talk to a human later?",
            "My callback number is 480-555-1212, and tomorrow afternoon works best.",
            "I already gave both. Can you summarize what you havy",
            "Great. What happens next",
            "And if I miss the call?",
            "Thanks, that’s all I needed",
        ]

    def critical_demo_phone_prompts(self) -> list[str]:
        return self.demo_phone_prompts()[:-1]

    def demo_phone_replies(
        self,
        *,
        agent_config: dict[str, Any],
        phone_config: dict[str, Any],
        business_name: str,
        prompts: list[str] | None = None,
    ) -> list[str]:
        replies: list[str] = []
        history: list[dict[str, Any]] = []
        for prompt in prompts or self.demo_phone_prompts():
            reply = self.build_phone_reply(
                agent_config=agent_config,
                phone_config=phone_config,
                business_name=business_name,
                history=history,
                user_message=prompt,
                max_chars=150,
            )
            replies.append(reply)
            history.extend(
                [
                    {"role": "user", "text": prompt},
                    {"role": "assistant", "text": reply},
                ]
            )
        return replies

    def warmup_replies(
        self,
        *,
        agent_config: dict[str, Any],
        phone_config: dict[str, Any],
        business_name: str,
    ) -> list[str]:
        knowledge = self._build_business_knowledge(
            agent_config=agent_config,
            phone_config=phone_config,
            business_name=business_name,
        )
        phone_replies: list[str] = self.demo_phone_replies(
            agent_config=agent_config,
            phone_config=phone_config,
            business_name=business_name,
        )

        ordered = [
            *phone_replies,
            knowledge["identity"],
            knowledge["greeting"],
            knowledge["disclosure"],
            knowledge["smalltalk"],
            "Let me think.",
        ]
        return list(dict.fromkeys(item for item in ordered if item))

    def phone_warmup_turns(self) -> list[tuple[list[dict[str, Any]], str]]:
        shared_follow_up_history = [
            {"role": "user", "text": "What if I want to talk to a human later?"},
            {"role": "assistant", "text": "To reach a human, leave your name, callback number, and the reason you need a person, and I can route that for follow-up."},
            {"role": "user", "text": "My callback number is 480-555-1212, and tomorrow afternoon works best."},
            {"role": "assistant", "text": "I have your callback number and preferred time. I still need your name for the handoff."},
            {"role": "user", "text": "My name is Alex Carter."},
            {"role": "assistant", "text": "Thanks. I have your name as Alex Carter."},
        ]
        return [
            ([], "Hi, what business is this?"),
            ([], "Give me the short version."),
            ([], "So is it more of a marketplace or a community app?"),
            ([], "Who is it built for?"),
            ([], "What can people actually do on it?"),
            ([], "What can people actually do on it? How does it make trading safer?"),
            ([], "How does it make trading safer?"),
            ([], "What makes it better than scattered Discord servers?"),
            ([], "Is there a free tier?"),
            ([], "What are the paid plans?"),
            ([], "What do Plus users get?"),
            ([], "What are the paid plans What do plus users get?"),
            ([], "Is there a free tier? What are the paid plans What do plus users get?"),
            ([], "What are the paid plans? What do Plus users get?"),
            ([], "What do Plus users get? And what does Pro add?"),
            ([], "And what does Pro add? What is Guild for?"),
            ([], "And what does Pro add?"),
            ([], "What is Guild for?"),
            ([], "Do you mention yearly pricing too?"),
            ([], "What about one-time paid extras?"),
            ([], "Does the platform support search and alerts?"),
            ([], "What can item listings include?"),
            ([], "What can you help with on this call?"),
            ([], "What business is this again?"),
            ([], "How is this safer than random trading servers?"),
            ([], "Who would normally use it?"),
            ([], "Who is it billed for?"),
            ([], "Who is the dole for?"),
            ([], "Who is it dealt for?"),
            ([], "Who is it both for?"),
            ([], "Can users message each other in real time?"),
            ([], "What profile information can people show?"),
            ([], "Does it help users discover listings?"),
            ([], "How is RocketLink monetized?"),
            ([], "Can community leaders use it too?"),
            ([], "What does the free version let people do?"),
            ([], "What is RocketLink Plus for?"),
            ([], "What is RocketLink Pro for?"),
            ([], "Can you remind me what Guild is for?"),
            ([], "How do users find trades faster?"),
            ([], "What kinds of listing details are supported?"),
            ([], "If I need a real person, what do you need from me?"),
            ([], "What kind of company is this?"),
            ([], "What does the platform mainly help with?"),
            ([], "Is it mainly for collectors too?"),
            ([], "Can groups and communities be managed inside it?"),
            ([], "Do users get trust badges or reputation signals?"),
            ([], "What is the business line again?"),
            (shared_follow_up_history[:2], "My callback number is 480-555-1212, and tomorrow afternoon works best."),
            (shared_follow_up_history[:4], "My name is Alex Carter."),
            (shared_follow_up_history, "I already gave both. Can you summarize what you have?"),
            (shared_follow_up_history, "Can you summarize my follow-up request?"),
            (shared_follow_up_history, "Great. What happens next?"),
            (shared_follow_up_history, "And if I miss the call?"),
            (shared_follow_up_history, "Do you still have my callback number?"),
            (shared_follow_up_history, "Do you still have my preferred time?"),
            (shared_follow_up_history, "Can you summarize everything you have for the follow-up?"),
        ]

    def _is_identity_question(self, text: str) -> bool:
        return bool(re.search(r"\b(your name|who are you|what are you|who am i speaking with|who is this speaking)\b", text))

    def _is_business_question(self, text: str) -> bool:
        return bool(
            re.search(
                r"\b(what do you do|what does this business do|what does rocketlink do|what is this business|tell me about the business|what services do you offer|what can you help with|what business is this|which business is this)\b",
                text,
            )
        )

    def _is_smalltalk_question(self, text: str) -> bool:
        return bool(
            re.search(
                r"\b(how are you|how is your day|how's your day|how are you doing|how's it going|how is it going)\b",
                text,
            )
        )

    def _is_time_question(self, text: str) -> bool:
        return bool(re.search(r"\b(what time is it|current time|time is it|what's the time|tell me the time)\b", text))

    def _time_reply(self) -> str:
        now = datetime.now(ZoneInfo("America/Phoenix"))
        hour = now.strftime("%I").lstrip("0") or "12"
        period = now.strftime("%p")
        return f"It is currently about {hour} {period} in Arizona."

    def _has_contact_details(self, text: str) -> bool:
        return bool(re.search(r"\b\d{3}\D?\d{3}\D?\d{4}\b", text)) or "@" in text

    def _has_time_preference(self, text: str) -> bool:
        return bool(
            re.search(
                r"\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|morning|afternoon|evening|\d{1,2}(:\d{2})?\s?(am|pm)?)\b",
                text,
            )
        )

    def _extract_phone_number(self, text: str) -> str | None:
        match = re.search(r"\b(\d{3})\D?(\d{3})\D?(\d{4})\b", text)
        if not match:
            return None
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

    def _extract_time_preference(self, text: str) -> str | None:
        match = re.search(
            r"\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday)(?:\s+(morning|afternoon|evening))?\b",
            text,
            flags=re.IGNORECASE,
        )
        if match:
            day = match.group(1).capitalize()
            part = match.group(2).lower() if match.group(2) else None
            return f"{day} {part}".strip() if part else day

        match = re.search(r"\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b", text, flags=re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return None

    def _extract_name(self, text: str) -> str | None:
        match = re.search(r"\bmy name is ([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\b", text, flags=re.IGNORECASE)
        if not match:
            return None
        parts = [part.capitalize() for part in re.findall(r"[A-Za-z]+", match.group(1))]
        return " ".join(parts) if parts else None

    def _extract_follow_up_reason(self, text: str) -> str | None:
        lowered = text.lower()
        for pattern in [
            r"\bfollow up about ([^.?!,]+)",
            r"\bcallback about ([^.?!,]+)",
            r"\babout ([^.?!,]+)",
        ]:
            match = re.search(pattern, lowered)
            if match:
                candidate = self._clean(match.group(1)).strip(" .,!?:;")
                if candidate and candidate not in {"me", "it", "that", "this", "both"}:
                    return candidate
        return None

    def _collect_follow_up_context(self, history: list[dict[str, Any]], current_message: str) -> dict[str, str]:
        callback_number = ""
        preferred_time = ""
        caller_name = ""
        reason = ""
        wants_human = False

        for text in [item.get("text", "") for item in history if item.get("role") == "user"] + [current_message]:
            lowered = (text or "").lower()
            current_turn_requests_human = self._contains_any(lowered, ["human", "real person", "representative", "follow up", "follow-up", "callback"])
            if current_turn_requests_human:
                wants_human = True
            callback_number = callback_number or (self._extract_phone_number(text or "") or "")
            preferred_time = preferred_time or (self._extract_time_preference(text or "") or "")
            caller_name = caller_name or (self._extract_name(text or "") or "")
            if current_turn_requests_human or (
                wants_human and self._contains_any(lowered, ["reason", "issue", "problem", "follow up about", "callback about"])
            ):
                reason = reason or (self._extract_follow_up_reason(text or "") or "")

        return {
            "callback_number": callback_number,
            "preferred_time": preferred_time,
            "caller_name": caller_name,
            "reason": reason,
            "wants_human": "yes" if wants_human else "",
        }

    def _general_knowledge_reply(self, lowered: str, knowledge: dict[str, str]) -> str | None:
        if re.search(r"\bwhat day is it|what day of the week is it|what is today's date|what is todays date\b", lowered):
            now = datetime.now(ZoneInfo("America/Phoenix"))
            return f"Today in Arizona is {now.strftime('%A, %B')} {now.day}."
        if re.search(r"\bhow old are you\b", lowered):
            return "I am a configured AI business phone agent, so I do not have a personal age."
        if re.search(r"\bdefine the word\b", lowered):
            return (
                "That is outside the saved business description. I do not have a dictionary source wired in here, "
                "so I would rather avoid giving you an unreliable definition."
            )
        return None

    def build_reply(
        self,
        *,
        agent_config: dict[str, Any],
        phone_config: dict[str, Any],
        business_name: str,
        history: list[dict[str, Any]],
        user_message: str,
    ) -> str:
        text = self._clean(user_message)
        lowered = text.lower()
        knowledge = self._build_business_knowledge(
            agent_config=agent_config,
            phone_config=phone_config,
            business_name=business_name,
        )

        asks_hours = self._contains_any(lowered, ["hours", "open", "close", "available today", "when can someone reach", "availability window", "business operate"])
        asks_schedule = self._contains_any(lowered, ["book", "appointment", "schedule", "meeting", "availability", "follow up"])
        asks_billing = self._contains_any(lowered, ["billing", "refund", "charge", "payment", "invoice"])
        asks_after_hours = self._contains_any(lowered, ["after hours", "closed", "weekend", "outside business hours", "after-hours", "business is closed"])
        asks_voicemail = self._contains_any(lowered, ["voicemail", "leave a message", "leave message"])
        asks_number = self._contains_any(lowered, ["number", "phone number", "callback line", "call back", "business line"])
        asks_human = self._contains_any(lowered, ["human", "person", "real person", "representative"])
        asks_follow_up = self._contains_any(lowered, ["follow up", "follow-up", "followup", "get back to me", "contact me back", "reach out to me", "request a callback"])
        asks_leave_info = self._contains_any(lowered, ["leave my info", "leave my information", "leave my details", "take my details", "take my information", "can i leave information", "what information do you need from me", "what should i provide"])
        asks_support = self._contains_any(
            lowered,
            [
                "do you offer support",
                "what kinds of questions can you answer",
                "what can you help me with",
                "support scope",
                "topics are you able to assist with",
                "what topics are you able to assist with",
            ],
        )
        asks_transfer = self._contains_any(lowered, ["transfer", "transfers", "escalate", "escalation", "escalations"])
        asks_fallback = self._contains_any(lowered, ["if you are unsure", "if you are not sure", "fallback", "unsure", "unknown"])
        asks_disclosure = self._contains_any(lowered, ["ai voice", "cloned voice", "ai agent", "disclose", "disclosure"])
        asks_pricing = self._contains_any(lowered, ["price", "pricing", "priced", "cost", "fee", "subscription", "how much", "paid plans"])
        asks_routing = self._contains_any(lowered, ["routing mode", "routing", "route calls", "forwarding mode", "calls routed", "ai first", "phone setup"])
        asks_account = self._contains_any(lowered, ["create account", "make an account", "sign up", "register", "login", "account creation", "signup path", "get started"])
        asks_plus = self._contains_any(lowered, ["plus tier", "rocketlink plus", "plus plan", "plus users", "plus user", " plus "]) or lowered.endswith("plus?")
        asks_pro = self._contains_any(lowered, ["pro tier", "rocketlink pro", "pro plan", "pro users", "pro user", " pro "]) or lowered.endswith("pro?")
        asks_guild = self._contains_any(lowered, ["guild tier", "rocketlink guild", "guild plan", "guild users", "guild user", " guild "]) or lowered.endswith("guild?")
        asks_free = self._contains_any(lowered, ["free tier", "free plan", "free version", "without paying"])
        asks_audience = self._contains_any(lowered, ["who is it for", "who is it though for", "who is this for", "target audience", "who uses it", "who is the app for", "creators", "moderators", "community leaders", "who would normally use", "meant to serve", "built for", "collectors", "casual players", "leaders use it"])
        asks_social = self._contains_any(lowered, ["community", "social", "chat", "groups", "profiles", "socially", "connect with each other"])
        asks_trading = self._contains_any(lowered, ["trade", "trading", "marketplace", "listings", "items"])
        asks_trust = self._contains_any(lowered, ["trust", "safety", "safe", "safer", "scam", "reputation", "ratings", "moderation", "credibility", "trust signals"])
        asks_features = self._contains_any(lowered, ["features", "what can users do", "what can people do", "what can people actually do", "what does it include", "tools", "moderator dashboards", "wishlists", "alerts", "customize profiles"])
        asks_value = self._contains_any(lowered, ["why use", "value", "benefit", "why would someone use it", "problem does it solve", "problem does the product solve", "why would a rocket league player use this", "scattered trading servers", "scattered chat channels", "generic chat servers", "scattered discord servers", "instead of discord", "better than discord"])
        asks_monetization = self._contains_any(lowered, ["make money", "revenue", "monetize", "monetized", "monetization", "business model"])
        asks_positioning = self._contains_any(lowered, ["positioning statement", "different from", "what makes", "concise positioning"])
        asks_search = self._contains_any(
            lowered,
            [
                "filter listings",
                "saved searches",
                "save searches",
                "trade alerts",
                "alerts",
                "wishlists",
                "bookmark",
                "track items",
                "discover listings",
                "search listings",
                "discovery tools",
                "find trades faster",
            ],
        )
        asks_profile = self._contains_any(lowered, ["profile", "profiles", "customize profiles", "custom profile", "custom profile themes", "personalize their profile"])
        asks_realtime = self._contains_any(lowered, ["real time", "real-time", "message in real time", "message each other"])
        asks_business_type = self._contains_any(lowered, ["type of business", "what kind of business", "what kind of company", "what type of business", "marketplace or a social app", "marketplace or a community", "marketplace or community", "category of business", "type of service"])
        asks_short_description = self._contains_any(lowered, ["short description", "brief description", "give me a short description", "summarize your business", "brief summary", "short version", "quick summary"])
        asks_main_help = self._contains_any(lowered, ["mainly help with", "main help with", "main purpose", "what does the platform mainly help with", "what is the platform mainly for"])
        asks_annual = self._contains_any(lowered, ["per year", "per-year", "annual", "yearly", "annual pricing", "yearly options", "yearly pricing"])
        asks_one_time = self._contains_any(lowered, ["one-time purchase", "one-time purchases", "one time purchase", "one time purchases", "one time payed extras", "one time paid extras", "one off purchase", "one-off purchases", "one-off purchase", "micro-monetization", "promoted listings", "visibility boosts", "seasonal badge", "banner customization", "paid extras", "payed extras"])
        asks_listing_details = self._contains_any(
            lowered,
            [
                "rarity",
                "certification",
                "paint color",
                "series",
                "platform compatibility",
                "trade preferences",
                "listing details",
                "listing fields",
                "item listings include",
                "item listing include",
                "detailed are rocketlink item listings",
                "detailed are item listings",
            ],
        )
        asks_community_management = self._contains_any(lowered, ["community management", "community-management", "group owners", "community branding", "announcements", "event scheduling", "member caps", "engagement analytics", "run large communities", "large rocketlink communities", "community-owner"])

        shares_contact = self._has_contact_details(lowered)
        shares_time = self._has_time_preference(lowered)
        recent_user_turns = [item["text"] for item in history if item.get("role") == "user"][-6:]
        follow_up_context = self._collect_follow_up_context(history, user_message)
        recent_schedule_context = any(
            self._contains_any(item.lower(), ["book", "appointment", "schedule", "meeting", "time", "callback", "follow up"])
            for item in recent_user_turns
        )

        if self._is_identity_question(lowered):
            return knowledge["identity"]

        if self._is_time_question(lowered):
            return self._time_reply()

        if self._is_smalltalk_question(lowered):
            return knowledge["smalltalk"]

        general_knowledge = self._general_knowledge_reply(lowered, knowledge)
        if general_knowledge:
            return general_knowledge

        if asks_short_description:
            return knowledge["short_description"]

        if asks_main_help:
            return knowledge["short_description"]

        if asks_business_type:
            return knowledge["business_type"]

        if asks_value:
            return knowledge["value_summary"]

        if asks_features and not asks_search:
            return knowledge["feature_summary"]

        if asks_hours and asks_schedule:
            return f"{knowledge['hours']} {knowledge['schedule']}"

        if re.search(r"\bi already gave both\b|\bsummarize what you have\b", lowered):
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                if follow_up_context["caller_name"]:
                    return knowledge["follow_up_summary_with_name"]
                return knowledge["follow_up_summary"]
            return "I do not have enough follow-up details yet. Please share your callback number and preferred time."

        if re.search(r"\bsummarize my follow[- ]up request\b|\bsummarize my callback request\b", lowered):
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                if follow_up_context["caller_name"]:
                    return knowledge["follow_up_summary_with_name"]
                return knowledge["follow_up_summary"]
            return knowledge["follow_up"]

        if re.search(r"\bdo you still have my callback number\b|\bdo you still have my preferred time\b|\bcan you summarize everything you have for the follow[- ]up\b", lowered):
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                if follow_up_context["caller_name"]:
                    return knowledge["follow_up_summary_with_name"]
                return knowledge["follow_up_summary"]
            return "I do not have enough follow-up details yet. Please share your callback number and preferred time."

        if re.search(
            r"\bwhat happens next\b|\bwhat happens now\b|\bwhat is the next step\b|\bwhat happens after you log that\b|\bafter you log that\b|\bafter you log it\b|\bwhat happens after that\b",
            lowered,
        ):
            return knowledge["next_step"]

        if re.search(r"\bif i miss the call\b|\bmiss the call\b|\bmiss the callback\b", lowered):
            return knowledge["missed_call"]

        if (recent_schedule_context or follow_up_context["wants_human"]) and (shares_contact or shares_time):
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                if follow_up_context["caller_name"]:
                    return knowledge["follow_up_captured_with_name"]
                return knowledge["follow_up_captured"]
            return knowledge["schedule_confirm"]

        if asks_follow_up and (shares_contact or shares_time):
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                if follow_up_context["caller_name"]:
                    return knowledge["follow_up_captured_with_name"]
                return knowledge["follow_up_captured"]
            return knowledge["schedule_confirm"]

        if asks_human and asks_leave_info:
            return knowledge["human_contact"]

        if asks_leave_info:
            return knowledge["leave_details"]

        if asks_follow_up:
            return knowledge["follow_up"]

        if asks_schedule:
            return knowledge["schedule"]

        if asks_plus and self._contains_any(lowered, ["what do", "benefit", "get", "include", "features"]):
            return knowledge["plus_benefits"]

        if asks_pro and self._contains_any(lowered, ["what do", "benefit", "get", "include", "features"]):
            return knowledge["pro_benefits"]

        if asks_guild and self._contains_any(lowered, ["what do", "benefit", "get", "include", "features"]):
            return knowledge["guild_benefits"]

        if re.search(r"\bwhat is guild for\b|\bwhat does guild do\b", lowered):
            return knowledge["guild_benefits"]

        if asks_annual:
            return f"Annual pricing is mentioned for Plus at $49.99 per year and Pro at $99.99 per year. Guild is described at $19.99 per month."

        if asks_one_time:
            return knowledge["one_time_purchases"]

        if asks_monetization:
            return knowledge["monetization_summary"]

        if asks_plus or asks_pro or asks_guild:
            if asks_plus:
                return knowledge["plus_benefits"] if self._contains_any(lowered, ["benefit", "benefits", "get", "include", "features", "upgrade", "add"]) else knowledge["plus_price"]
            if asks_pro:
                return knowledge["pro_benefits"] if self._contains_any(lowered, ["benefit", "benefits", "get", "include", "features", "upgrade", "add"]) else knowledge["pro_price"]
            return knowledge["guild_benefits"] if self._contains_any(lowered, ["benefit", "benefits", "get", "include", "features", "upgrade", "add"]) else knowledge["guild_price"]

        if asks_free:
            return knowledge["free_tier"]

        if re.search(r"\bwhat are the paid plans\b|\bpaid plans\b|\bwhat plans do you have\b", lowered):
            return knowledge["pricing_summary"]

        if asks_pricing:
            return knowledge["pricing_summary"]

        if asks_account:
            return knowledge["account_creation"]

        if asks_after_hours:
            return knowledge["after_hours"]

        if asks_voicemail:
            return knowledge["voicemail"]

        if asks_transfer:
            return knowledge["transfer"]

        if asks_fallback:
            return knowledge["fallback_behavior"]

        if asks_disclosure:
            return knowledge["disclosure"]

        if asks_routing:
            return knowledge["routing"]

        if asks_hours:
            return knowledge["hours"]

        if asks_billing:
            return knowledge["billing"]

        if asks_community_management:
            return knowledge["community_management"]

        if asks_listing_details:
            return knowledge["listing_details"]

        if asks_search:
            return knowledge["search_summary"]

        if asks_number:
            return knowledge["number"]

        if asks_audience:
            return knowledge["audience_summary"]

        if asks_trust:
            return knowledge["trust_summary"]

        if asks_realtime:
            return knowledge["social_summary"]

        if asks_social:
            return knowledge["social_summary"]

        if asks_trading:
            return knowledge["trading_summary"]

        if asks_search or asks_profile:
            if asks_profile and not asks_search and not asks_features:
                return knowledge["profile_summary"]
            if asks_search and not asks_features:
                return knowledge["search_summary"]
            return knowledge["feature_summary"]

        if asks_positioning:
            return knowledge["value_summary"] if "different from" in lowered else knowledge["business_summary"]

        if self._is_business_question(lowered):
            return knowledge["business_summary"]

        if asks_human:
            return knowledge["human_contact"]

        if asks_support and asks_trading:
            return knowledge["trading_summary"]

        if asks_support:
            return knowledge["support"]

        if re.search(r"\b(thank you|thanks)\b", lowered):
            return "You’re welcome."

        retrieved_detail = self._best_sentence_match(agent_config.get("business_description", ""), lowered)
        if retrieved_detail:
            return retrieved_detail

        query_tokens = self._tokens(lowered)
        knowledge_candidates = [
            ("pricing", {"pricing", "price", "cost", "plan", "subscription", "monthly", "yearly"}, knowledge["pricing_summary"]),
            ("audience", {"audience", "players", "traders", "collectors", "creators", "moderators"}, knowledge["audience_summary"]),
            ("trading", {"trade", "trading", "marketplace", "listing", "items", "inventory"}, knowledge["trading_summary"]),
            ("social", {"community", "social", "chat", "groups", "profiles", "friends"}, knowledge["social_summary"]),
            ("trust", {"trust", "safe", "safety", "ratings", "reputation", "moderation", "verified"}, knowledge["trust_summary"]),
            ("features", {"features", "messaging", "alerts", "wishlists", "searches", "dashboards", "announcements", "events"}, knowledge["feature_summary"]),
            ("value", {"benefit", "friction", "streamline", "one place", "companion"}, knowledge["value_summary"]),
            ("follow_up", {"follow", "callback", "human", "person", "contact"}, knowledge["follow_up"]),
            ("business", {"rocketlink", "business", "platform", "rocket", "league"}, knowledge["business_summary"]),
        ]

        best_reply = None
        best_score = 0
        for _, topic_tokens, reply in knowledge_candidates:
            score = len(query_tokens & topic_tokens)
            if score > best_score:
                best_score = score
                best_reply = reply

        if best_reply and best_score >= 1:
            return best_reply

        if any(token in lowered for token in ["rocketlink", "app", "platform", "business", "trading", "community"]):
            return knowledge["general_unknown_business"]

        return knowledge["general_knowledge_fallback"]

    def build_turn(self, role: str, text: str, audio_base64: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "role": role,
            "text": self._clean(text),
            "created_at": datetime.utcnow().isoformat(),
        }
        if audio_base64:
            payload["audio_base64"] = audio_base64
        return payload

    def build_phone_reply(
        self,
        *,
        agent_config: dict[str, Any],
        phone_config: dict[str, Any],
        business_name: str,
        history: list[dict[str, Any]],
        user_message: str,
        max_chars: int = 150,
    ) -> str:
        text = self._clean(user_message)
        lowered = text.lower()
        knowledge = self._build_business_knowledge(
            agent_config=agent_config,
            phone_config=phone_config,
            business_name=business_name,
        )

        if self._is_incomplete_question(lowered):
            reply = "I heard the start of your question, but it sounded cut off. Please repeat it one more time."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=1)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        asks_free = self._contains_any(lowered, ["free tier", "free plan", "free version", "without paying"])
        asks_pricing = self._contains_any(lowered, ["price", "pricing", "priced", "cost", "fee", "subscription", "how much", "paid plans"])
        asks_plus = self._contains_any(lowered, ["plus tier", "rocketlink plus", "plus plan", "plus users", "plus user", " plus "]) or lowered.endswith("plus?")
        asks_pro = self._contains_any(lowered, ["pro tier", "rocketlink pro", "pro plan", "pro users", "pro user", " pro "]) or lowered.endswith("pro?")
        asks_guild = self._contains_any(lowered, ["guild tier", "rocketlink guild", "guild plan", "guild users", "guild user", " guild "]) or lowered.endswith("guild?")

        if asks_free and asks_pricing and asks_plus:
            reply = "There is a free tier. Plus is about five dollars, Pro ten, and Guild twenty monthly."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_pricing and asks_plus and asks_pro:
            reply = "Plus is about five dollars, Pro ten, and Guild twenty monthly. Pro adds featured listings and analytics."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_plus and asks_pro and asks_guild:
            reply = "Plus adds listings and messaging. Pro adds featured listings. Guild is for community management."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_free and asks_pricing:
            reply = "There is a free tier. Plus is about five dollars, Pro ten, and Guild twenty monthly."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_pricing and asks_plus:
            reply = "Plus is about five dollars, Pro ten, and Guild twenty monthly. Plus adds listings and messaging."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_plus and asks_pro:
            reply = "Plus adds listings and messaging. Pro adds featured listings and analytics."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        if asks_pro and asks_guild:
            reply = "Pro adds featured listings and analytics. Guild is for moderation and scheduling."
            reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
            if reply and reply[-1] not in ".!?":
                reply += "."
            return reply

        segments = self._question_like_segments(text)
        if len(segments) > 1:
            segment_lowers = [segment.lower() for segment in segments]
            asks_short = any(
                self._contains_any(segment, ["short version", "short description", "brief description", "brief summary", "quick summary"])
                for segment in segment_lowers
            )
            asks_type = any(
                self._contains_any(segment, ["what kind of business", "type of business", "marketplace or community app", "marketplace or a community app", "marketplace or a community", "marketplace or community", "what type of business"])
                for segment in segment_lowers
            )
            asks_audience = any(
                self._contains_any(segment, ["who is it for", "who is it though for", "who is this for", "target audience", "built for", "billed for", "dealt for", "dole for"])
                for segment in segment_lowers
            )
            asks_features = any(
                self._contains_any(segment, ["what can people do", "what can users do", "what can people actually do", "what does it include", "features"])
                for segment in segment_lowers
            )
            asks_trust = any(
                self._contains_any(segment, ["how does it make trading safer", "make trading safer", "how is this safer", "safer than", "trust", "safety", "safe", "scam", "reputation", "ratings", "moderation"])
                for segment in segment_lowers
            )

            if asks_short and asks_type and asks_audience:
                combined = (
                    "RocketLink helps Rocket League players connect, chat, and trade in one platform. "
                    "It is both a community app and an item trading marketplace for traders, collectors, players, creators, and moderators."
                )
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

            if asks_short and asks_type:
                combined = (
                    "RocketLink helps Rocket League players connect, chat, and trade in one platform. "
                    "It is both a community app and an item trading marketplace."
                )
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

            if asks_type and asks_audience:
                combined = (
                    "It is both a community app and an item trading marketplace, "
                    "built for Rocket League traders, collectors, players, creators, and moderators."
                )
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

            if asks_audience and asks_features:
                combined = (
                    "It is for Rocket League traders, players, creators, and moderators. "
                    "Users can make profiles, chat, browse listings, and trade items."
                )
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

            if asks_features and asks_trust:
                combined = (
                    "Users can make profiles, chat, browse listings, and trade items. "
                    "It uses ratings, trade history, scam reports, and moderation."
                )
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

            replies: list[str] = []
            seen: set[str] = set()
            for segment in segments[:3]:
                reply = self.build_phone_reply(
                    agent_config=agent_config,
                    phone_config=phone_config,
                    business_name=business_name,
                    history=history,
                    user_message=segment,
                    max_chars=max_chars,
                )
                normalized = self._clean(reply)
                if normalized and normalized not in seen:
                    seen.add(normalized)
                    replies.append(normalized)
                if len(replies) >= 2:
                    break

            if replies:
                combined = " ".join(replies[:2])
                combined = self._trim_dangling_tail(combined)
                combined = self._shorten(combined, max_chars=max_chars, max_sentences=2)
                if combined and combined[-1] not in ".!?":
                    combined += "."
                return combined

        if self._contains_any(lowered, ["who is it for", "who is it though for", "who is this for", "target audience", "built for", "billed for", "dealt for", "dole for", "both for", "collectors", "casual players", "community leaders use it"]):
            reply = "It is for Rocket League traders, players, creators, and moderators."
        elif self._extract_name(user_message):
            reply = f"Thanks. I have your name as {self._extract_name(user_message)}."
        elif self._contains_any(lowered, ["do you still have my callback number", "do you still have my preferred time", "summarize everything you have for the follow-up"]):
            follow_up_context = self._collect_follow_up_context(history, user_message)
            if follow_up_context["callback_number"] and follow_up_context["preferred_time"]:
                reply = (
                    "I have your name, callback number, and preferred time."
                    if follow_up_context["caller_name"]
                    else "I have your callback number and preferred time. I still need your name."
                )
            else:
                reply = "Please share your callback number and preferred time."
        elif self._contains_any(lowered, ["mainly help with", "main help with", "main purpose", "what does the platform mainly help with", "what is the platform mainly for"]):
            reply = knowledge["short_description"]
        elif self._contains_any(lowered, ["human", "real person", "representative", "follow up", "follow-up"]):
            reply = "Leave your name, callback number, and reason, and I can route a follow-up."
        elif self._contains_any(lowered, ["yearly pricing", "annual pricing", "per year", "yearly", "annual"]):
            reply = "Yearly pricing is about fifty dollars for Plus and one hundred for Pro."
        elif self._contains_any(lowered, ["how much", "pricing", "price", "cost", "subscription", "paid plans"]):
            reply = "Plus is about five dollars, Pro ten, and Guild twenty monthly."
        elif self._contains_any(lowered, ["what business is this", "which business is this", "what is this business", "tell me about the business"]):
            reply = "RocketLink is a Rocket League trading app with community chat."
        elif self._contains_any(lowered, ["what kind of business", "type of business", "marketplace or community app", "marketplace or a community app", "marketplace or a community", "marketplace or community", "what type of business"]):
            reply = "It is both a community app and an item marketplace."
        elif self._contains_any(lowered, ["short version", "short description", "brief description", "brief summary", "quick summary"]):
            reply = knowledge["short_description"]
        elif self._contains_any(lowered, ["how does it make trading safer", "make trading safer", "how is this safer", "safer than", "trust", "safety", "safe", "scam", "reputation", "ratings", "moderation"]):
            reply = "It uses ratings, trade history, scam reports, and moderation."
        elif self._contains_any(lowered, ["better than scattered discord servers", "better than discord", "scattered discord servers", "instead of discord", "scattered servers"]):
            reply = "It keeps chat, listings, and trust tools in one place."
        elif self._contains_any(lowered, ["what is guild for", "what does guild do", "remind me what guild is for"]):
            reply = "Guild is for moderation, announcements, scheduling, and community analytics."
        elif self._contains_any(lowered, ["groups and communities", "communities be managed", "community leaders use it", "managed inside it", "run large communities"]):
            reply = "Yes. It supports moderation, announcements, event scheduling, and larger managed communities."
        elif self._contains_any(lowered, ["trust badges", "reputation signals", "reputation badge", "trust signals"]):
            reply = "Yes. It uses trust signals like ratings, trade history, scam reporting, and moderation."
        elif self._contains_any(lowered, ["profile information", "profile details", "profiles show"]):
            reply = "Profiles can show interests, item types, rank, preferred platforms, and trading history."
        elif self._contains_any(lowered, ["find trades faster"]):
            reply = "Users can find trades faster with filters, saved searches, and trade alerts."
        elif self._contains_any(lowered, ["free version", "free tier", "free plan"]):
            reply = "Yes. The free tier covers profiles, communities, listings, and limited messaging."
        elif self._contains_any(lowered, ["plus users get", "rocketlink plus for", "plus plan", "plus tier"]):
            reply = "Plus adds more listings, messaging, alerts, and a premium badge."
        elif self._contains_any(lowered, ["pro add", "rocketlink pro for", "pro plan", "pro tier"]):
            reply = "Pro adds featured listings, filters, analytics, and priority support."
        elif self._contains_any(lowered, ["guild for", "guild plan", "guild tier"]):
            reply = "Guild is for moderation, announcements, scheduling, and analytics."
        elif self._contains_any(lowered, ["what can you help with on this call", "what can you help with", "what kinds of questions can you answer"]):
            reply = "I can answer business questions, pricing, features, trust and safety, and help collect callback details."
        elif self._contains_any(lowered, ["platform mainly help with", "what is the platform mainly for"]):
            reply = knowledge["short_description"]
        elif self._contains_any(lowered, ["what can people do", "what can users do", "what can people actually do", "what does it include", "features"]):
            reply = "Users can make profiles, chat, browse listings, and trade items."
        elif self._contains_any(lowered, ["one-time paid extras", "one time paid extras", "one time payed extras", "paid extras", "promoted listings", "visibility boosts", "badge packs"]):
            reply = "Optional extras are promoted listings, boosts, upgrades, and badges."
        elif self._contains_any(lowered, ["search and alerts", "support search and alerts", "saved searches", "trade alerts"]):
            reply = "Yes. It supports filters, saved searches, alerts, wishlists, and bookmarks."
        elif self._contains_any(lowered, ["item listings include", "listing details", "listing fields", "item listing include"]):
            reply = "Listings show rarity, color, platform, and trade preferences."
        elif self._is_business_question(lowered):
            reply = knowledge["short_description"]
        else:
            reply = self.build_reply(
                agent_config=agent_config,
                phone_config=phone_config,
                business_name=business_name,
                history=history,
                user_message=user_message,
            )

        reply = self._trim_dangling_tail(reply)
        reply = self._shorten(reply, max_chars=max_chars, max_sentences=2)
        reply = self._trim_dangling_tail(reply)
        if reply and reply[-1] not in ".!?":
            reply += "."
        return reply


thesis_agent_service = ThesisAgentService()
