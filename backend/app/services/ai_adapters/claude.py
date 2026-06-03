import json
from typing import AsyncIterator

import httpx

from app.services.ai_adapters.base import AIAdapter


class ClaudeAdapter(AIAdapter):
    """Claude 适配器"""

    def __init__(self, base_url: str = "https://api.anthropic.com/v1", model: str = "claude-sonnet-4-20250514"):
        self.base_url = base_url
        self.model = model

    async def chat_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
    ) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        event = json.loads(line[6:])
                        if event.get("type") == "content_block_delta":
                            content = event.get("delta", {}).get("text", "")
                            if content:
                                yield content
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
    ) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]
