from fastapi import APIRouter, HTTPException

from app.schemas.parse import ParseRequest, ParseResponse
from app.services.puml_parser import parse_puml, result_to_dict

router = APIRouter(prefix="/api/parse", tags=["parse"])


@router.post("/puml", response_model=ParseResponse)
async def parse_puml_endpoint(request: ParseRequest) -> ParseResponse:
    """Parse PlantUML activity diagram into Graph JSON."""
    if not request.puml.strip():
        raise HTTPException(status_code=422, detail={
            "error": "EMPTY_INPUT",
            "message": "PUML 内容不能为空",
            "detail": {},
        })

    result = parse_puml(request.puml)

    if result.errors:
        raise HTTPException(status_code=422, detail={
            "error": "PUML_SYNTAX_ERROR",
            "message": "; ".join(result.errors),
            "detail": {"errors": result.errors},
        })

    return result_to_dict(result)
