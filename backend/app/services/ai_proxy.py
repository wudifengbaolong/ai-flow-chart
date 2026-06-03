from typing import AsyncIterator

from app.services.ai_adapters.base import AIAdapter
from app.services.ai_adapters.openai import OpenAIAdapter
from app.services.ai_adapters.claude import ClaudeAdapter
from app.services.puml_parser import parse_puml, result_to_dict

SYSTEM_PROMPT = """你是一个代码分析器，负责将源代码转换为 PlantUML 流程图。

核心原则：简洁明了，只展示代码的核心逻辑，忽略细节。

规则：
1. 严格使用 PlantUML activity diagram 语法
2. 必须以 @startuml 开头，@enduml 结尾
3. if/else 必须用 endif 完整闭合
4. 循环使用 while/endwhile
5. 不要添加注释或解释，只输出 PUML 代码
6. 所有标签使用中文，简洁描述
7. 每个标签控制在 8 个字以内

关键规则：
- 整个流程图只能有 1 个 start 和 1 个 stop
- return 语句不要生成 stop，直接作为流程节点处理
- if/else 的每个分支结束后汇合，不要在分支内提前结束
- 所有分支最终必须汇合到同一条主线

简化原则：
- 一个函数只生成一个简洁的流程图
- 合并连续的操作步骤为一个节点
- 忽略变量声明、类型转换等细节
- 只保留核心业务逻辑"""

ADAPTERS: dict[str, AIAdapter] = {
    "deepseek": OpenAIAdapter(base_url="https://api.deepseek.com/v1", model="deepseek-chat"),
    "openai": OpenAIAdapter(base_url="https://api.openai.com/v1", model="gpt-4o-mini"),
    "claude": ClaudeAdapter(),
}


def get_adapter(provider: str) -> AIAdapter:
    adapter = ADAPTERS.get(provider)
    if not adapter:
        raise ValueError(f"Unsupported provider: {provider}. Supported: {list(ADAPTERS.keys())}")
    return adapter


def build_user_prompt(code: str, language: str) -> str:
    return f"将以下 {language} 代码转换为 PlantUML 流程图：\n\n{code}"


async def convert_code_stream(
    code: str,
    language: str,
    provider: str,
    api_key: str,
) -> AsyncIterator[str]:
    """流式转换代码为 PUML，逐块返回"""
    adapter = get_adapter(provider)
    user_prompt = build_user_prompt(code, language)

    async for chunk in adapter.chat_stream(SYSTEM_PROMPT, user_prompt, api_key):
        yield chunk


async def convert_code(
    code: str,
    language: str,
    provider: str,
    api_key: str,
) -> dict:
    """非流式转换代码为 PUML，返回完整结果"""
    adapter = get_adapter(provider)
    user_prompt = build_user_prompt(code, language)

    puml = await adapter.chat(SYSTEM_PROMPT, user_prompt, api_key)

    # 清理 PUML（去除 markdown 代码块标记）
    puml = puml.strip()
    if puml.startswith("```"):
        puml = puml.split("\n", 1)[1] if "\n" in puml else puml[3:]
    if puml.endswith("```"):
        puml = puml[:-3]
    puml = puml.strip()

    # 解析为 Graph JSON
    result = parse_puml(puml)
    graph_data = result_to_dict(result)

    return {
        "puml": puml,
        "graph": graph_data.get("graph", {}),
        "errors": graph_data.get("errors", []),
    }
