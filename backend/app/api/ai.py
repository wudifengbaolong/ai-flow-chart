import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.ai import AIConvertRequest, AIConvertResponse
from app.services.ai_proxy import convert_code, convert_code_stream

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/convert")
async def convert_endpoint(request: AIConvertRequest):
    """代码转 PUML，支持 SSE 流式和非流式两种模式"""
    try:
        # 非流式：返回完整结果
        result = await convert_code(
            code=request.code,
            language=request.language,
            provider=request.provider,
            api_key=request.api_key,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail={
            "error": "INVALID_PROVIDER",
            "message": str(e),
            "detail": {},
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "error": "AI_SERVICE_UNAVAILABLE",
            "message": f"AI 服务调用失败: {str(e)}",
            "detail": {},
        })


@router.post("/convert/stream")
async def convert_stream_endpoint(request: AIConvertRequest):
    """代码转 PUML，SSE 流式返回"""
    async def event_generator():
        try:
            full_puml = ""
            async for chunk in convert_code_stream(
                code=request.code,
                language=request.language,
                provider=request.provider,
                api_key=request.api_key,
            ):
                full_puml += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # 完成后解析 PUML
            from app.services.puml_parser import parse_puml, result_to_dict
            full_puml = full_puml.strip()
            if full_puml.startswith("```"):
                full_puml = full_puml.split("\n", 1)[1] if "\n" in full_puml else full_puml[3:]
            if full_puml.endswith("```"):
                full_puml = full_puml[:-3]
            full_puml = full_puml.strip()

            result = parse_puml(full_puml)
            graph_data = result_to_dict(result)

            yield f"data: {json.dumps({'type': 'done', 'puml': full_puml, 'graph': graph_data.get('graph', {})})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
