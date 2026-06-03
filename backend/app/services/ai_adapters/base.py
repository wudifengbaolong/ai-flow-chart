from abc import ABC, abstractmethod
from typing import AsyncIterator


class AIAdapter(ABC):
    """AI 供应商适配器抽象接口"""

    @abstractmethod
    async def chat_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
    ) -> AsyncIterator[str]:
        """流式调用 AI，逐块返回内容"""
        ...

    @abstractmethod
    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
    ) -> str:
        """非流式调用 AI，返回完整内容"""
        ...
