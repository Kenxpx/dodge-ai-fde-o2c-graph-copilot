from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import get_settings


@dataclass
class LLMResult:
    text: str
    raw: dict[str, Any] | None = None


class BaseLLMProvider:
    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        raise NotImplementedError

    async def complete_text(self, system_prompt: str, user_prompt: str) -> LLMResult:
        raise NotImplementedError

    @staticmethod
    def _parse_json_text(text: str) -> dict[str, Any]:
        # Providers are asked for JSON, but they still occasionally wrap it in fences
        # or add a short preamble. This keeps the higher-level query flow simple.
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            cleaned = cleaned.removeprefix("json").strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(cleaned[start : end + 1])
            raise


class GeminiProvider(BaseLLMProvider):
    async def _request(self, *, system_prompt: str, user_prompt: str, json_mode: bool) -> LLMResult:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("Missing GEMINI_API_KEY.")

        # The prompt stays intentionally small here because the schema guide is already
        # doing the heavy lifting for query quality and guardrails.
        payload: dict[str, Any] = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.1},
        }
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        )
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            body = response.json()

        text = body["candidates"][0]["content"]["parts"][0]["text"]
        return LLMResult(text=text, raw=body)

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        result = await self._request(system_prompt=system_prompt, user_prompt=user_prompt, json_mode=True)
        return self._parse_json_text(result.text)

    async def complete_text(self, system_prompt: str, user_prompt: str) -> LLMResult:
        return await self._request(system_prompt=system_prompt, user_prompt=user_prompt, json_mode=False)


class OpenAICompatibleProvider(BaseLLMProvider):
    async def _request(self, *, system_prompt: str, user_prompt: str) -> LLMResult:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("Missing OPENAI_API_KEY.")

        payload = {
            "model": settings.openai_model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            body = response.json()

        text = body["choices"][0]["message"]["content"]
        return LLMResult(text=text, raw=body)

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        result = await self._request(
            system_prompt=system_prompt,
            user_prompt=f"{user_prompt}\n\nReturn valid JSON only. Do not use markdown fences.",
        )
        return self._parse_json_text(result.text)

    async def complete_text(self, system_prompt: str, user_prompt: str) -> LLMResult:
        return await self._request(system_prompt=system_prompt, user_prompt=user_prompt)


def get_llm_provider() -> BaseLLMProvider | None:
    settings = get_settings()
    # The query service can stay provider-agnostic if model selection happens here.
    if settings.llm_provider == "gemini":
        return GeminiProvider()
    if settings.llm_provider == "openai_compatible":
        return OpenAICompatibleProvider()
    return None
