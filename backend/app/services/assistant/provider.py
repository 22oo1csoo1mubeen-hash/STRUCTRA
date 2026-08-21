"""LLM provider integration for Assistant Chat.

Supports Groq (Primary) with automatic Gemini fallback, circuit breaker protection,
bounded retries, exponential backoff, and graceful timeout handling.
"""

import asyncio
import logging
import time
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_ASSISTANT_SYSTEM_PROMPT = """\
You are STRUCTRA, the intelligent AI assistant embedded inside the STRUCTRA document management application.
You help users explore and understand their saved receipts, invoices, spending patterns, vendor history, and line items.

RULES YOU MUST STRICTLY FOLLOW:
1. ONLY answer using the facts provided in the <retrieved_context> block.
2. NEVER fabricate or hallucinate vendor names, item quantities, totals, receipt dates, or purchases.
3. Understand user queries intelligently and contextually (including temporal ranges like "before 2000", "in 1995", "oldest receipt", "cheapest item", etc.).
4. If an exact match for a specific year, vendor, or item is not found in the context:
   - State clearly that no exact record was found for that specific search.
   - If available in the context, mention the user's closest recorded receipts, available date range, or related records to be helpful rather than leaving a dead-end.
   - If the request is broad or ambiguous, provide whatever relevant facts are available and politely invite the user to clarify.
5. Only say "no documents found" if the user's document library is completely empty or the query is completely unrelated to their data.
6. Always state exact calculated numbers provided in the context (item count, total amount, quantities).
7. Keep your response concise, polite, polished, and structured.
8. Use ₹ for Indian Rupee amounts where appropriate.
9. Use clean bullet points when listing items or documents with filename, date, vendor, and amount.
10. When asked to list items matching a range or criteria, list matching items completely without omitting details.
11. Treat 'receipts', 'documents', 'invoices', 'bills', 'purchases', 'statements', and 'records' as completely interchangeable terms for user documents. Never claim that an invoice is not a receipt or vice versa. Any query asking for a year (e.g. '2002', 'receipts in 2002', 'invoices from 2002', 'documents from 2002') refers to all user documents for that year.
"""


class AssistantChatProvider:
    """Orchestrates LLM generation with primary Groq chat completions, Gemini fallback, and circuit protection."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._groq_failure_count: int = 0
        self._groq_cooldown_until: float = 0.0
        self._gemini_failure_count: int = 0
        self._gemini_cooldown_until: float = 0.0

    async def generate_reply(
        self,
        context_json: str,
        user_message: str,
        conversation_history: list[dict[str, str]],
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> str:
        """Generate conversational reply using primary Groq LLM with Gemini fallback."""
        now = time.time()

        # 1. Attempt Primary: Groq (if key exists and circuit is not open)
        if self.settings.groq_api_key and now >= self._groq_cooldown_until:
            try:
                reply = await self._call_groq(
                    context_json=context_json,
                    user_message=user_message,
                    conversation_history=conversation_history,
                    client=http_client,
                )
                if reply:
                    self._groq_failure_count = 0
                    return reply
            except Exception as exc:
                self._groq_failure_count += 1
                if self._groq_failure_count >= 3:
                    self._groq_cooldown_until = time.time() + 30.0
                    logger.warning("Groq provider tripped circuit breaker (3 consecutive failures). Cooldown for 30s.")
                logger.warning("Groq assistant call failed: %s. Attempting fallback.", exc)
        elif self.settings.groq_api_key:
            logger.info("Groq provider in cooldown (circuit open). Skipping straight to Gemini fallback.")

        # 2. Attempt Fallback: Gemini (if key exists and circuit is not open)
        if self.settings.gemini_api_key and now >= self._gemini_cooldown_until:
            try:
                reply = await self._call_gemini(
                    context_json=context_json,
                    user_message=user_message,
                    conversation_history=conversation_history,
                )
                if reply:
                    self._gemini_failure_count = 0
                    return reply
            except Exception as exc:
                self._gemini_failure_count += 1
                if self._gemini_failure_count >= 3:
                    self._gemini_cooldown_until = time.time() + 30.0
                logger.warning("Gemini assistant fallback call failed: %s", exc)

        # 3. Fallback when no provider is configured or all providers fail
        if not self.settings.groq_api_key and not self.settings.gemini_api_key:
            return (
                "The AI assistant is currently not configured with an API key. "
                "Please set up the GROQ_API_KEY or GEMINI_API_KEY."
            )

        return (
            "I'm having trouble generating an answer right now. "
            "Please check your connection and try again in a moment."
        )

    async def _call_groq(
        self,
        context_json: str,
        user_message: str,
        conversation_history: list[dict[str, str]],
        client: httpx.AsyncClient | None = None,
    ) -> str:
        """Execute Groq Chat Completions API with candidate model fallback, bounded retries, and timeout."""
        api_key = self.settings.groq_api_key.get_secret_value().strip() if self.settings.groq_api_key else ""
        if not api_key:
            raise ValueError("Groq API key is empty.")

        requested_model = (self.settings.groq_model or "openai/gpt-oss-120b").strip()

        system_content = f"{_ASSISTANT_SYSTEM_PROMPT}\n\n<retrieved_context>\n{context_json}\n</retrieved_context>"
        messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]

        # Include bounded history (last 8 turns)
        for turn in conversation_history[-8:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        # List of models to try in order if 404 (model_not_found) occurs
        candidate_models = [requested_model]
        for fallback_m in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound-mini"]:
            if fallback_m not in candidate_models:
                candidate_models.append(fallback_m)

        for model in candidate_models:
            max_retries = 2
            base_delay = 0.5

            for attempt in range(1, max_retries + 2):
                try:
                    payload = {
                        "model": model,
                        "messages": messages,
                        "max_tokens": 4096,
                        "temperature": 0.3,
                    }
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    }
                    if client is not None:
                        response = await client.post(
                            _GROQ_CHAT_URL,
                            headers=headers,
                            json=payload,
                            timeout=15.0,
                        )
                        response.raise_for_status()
                        data = response.json()
                    else:
                        async with httpx.AsyncClient(timeout=15.0) as default_client:
                            response = await default_client.post(
                                _GROQ_CHAT_URL,
                                headers=headers,
                                json=payload,
                            )
                            response.raise_for_status()
                            data = response.json()

                    reply_text = data["choices"][0]["message"]["content"].strip()
                    return reply_text
                except httpx.HTTPStatusError as err:
                    status_code = getattr(getattr(err, "response", None), "status_code", None)
                    # If model not found (404), break retry loop and try next candidate model
                    if status_code == 404:
                        logger.warning("Groq model '%s' not found (404). Trying next candidate.", model)
                        break
                    is_transient = status_code in (429, 500, 502, 503, 504)
                    if is_transient and attempt <= max_retries:
                        delay = base_delay * (2 ** (attempt - 1))
                        logger.warning("Groq transient error (status=%s). Retrying in %ss (attempt %s/%s)...", status_code, delay, attempt, max_retries)
                        await asyncio.sleep(delay)
                        continue
                    raise
                except httpx.TimeoutException:
                    if attempt <= max_retries:
                        await asyncio.sleep(base_delay)
                        continue
                    raise
                except Exception:
                    raise

        raise RuntimeError("Groq retries and candidate models exhausted.")

    async def _call_gemini(
        self,
        context_json: str,
        user_message: str,
        conversation_history: list[dict[str, str]],
    ) -> str:
        """Execute Gemini GenAI SDK for assistant chat completion with bounded timeout."""
        from app.services.ai.providers.gemini import _get_genai_client

        api_key = self.settings.gemini_api_key.get_secret_value().strip() if self.settings.gemini_api_key else ""
        if not api_key:
            raise ValueError("Gemini API key is empty.")

        client = _get_genai_client(api_key)
        model = self.settings.gemini_model or "gemini-2.0-flash"

        system_content = f"{_ASSISTANT_SYSTEM_PROMPT}\n\n<retrieved_context>\n{context_json}\n</retrieved_context>"
        full_prompt = f"{system_content}\n\nUser Question: {user_message}"

        # Strict 10-second timeout prevents indefinite hangs on blocked network/auth calls
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=full_prompt,
            ),
            timeout=10.0,
        )

        return (response.text or "").strip()
