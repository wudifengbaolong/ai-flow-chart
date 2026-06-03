from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func

from app.models.flow import FlowProject
from app.schemas.flow import FlowCreateRequest, FlowUpdateRequest, FlowResponse, FlowListResponse, FlowListItem
from app.deps import DB, CurrentUser

router = APIRouter(prefix="/api/flow", tags=["flow"])


@router.post("", response_model=FlowResponse, status_code=201)
async def create_flow(request: FlowCreateRequest, db: DB, user: CurrentUser):
    flow = FlowProject(
        user_id=user.id,
        title=request.title,
        graph_json=request.graph_json,
        puml_source=request.puml_source,
        source_code=request.source_code,
        source_language=request.source_language,
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)

    return FlowResponse(
        id=flow.id,
        title=flow.title,
        graph_json=flow.graph_json,
        puml_source=flow.puml_source,
        source_code=flow.source_code,
        source_language=flow.source_language,
        created_at=flow.created_at.isoformat(),
        updated_at=flow.updated_at.isoformat(),
    )


@router.get("", response_model=FlowListResponse)
async def list_flows(
    db: DB,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    # 查询总数
    count_result = await db.execute(
        select(func.count()).where(FlowProject.user_id == user.id)
    )
    total = count_result.scalar()

    # 查询列表
    offset = (page - 1) * size
    result = await db.execute(
        select(FlowProject)
        .where(FlowProject.user_id == user.id)
        .order_by(FlowProject.updated_at.desc())
        .offset(offset)
        .limit(size)
    )
    flows = result.scalars().all()

    return FlowListResponse(
        items=[
            FlowListItem(
                id=f.id,
                title=f.title,
                source_language=f.source_language,
                created_at=f.created_at.isoformat(),
                updated_at=f.updated_at.isoformat(),
            )
            for f in flows
        ],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{flow_id}", response_model=FlowResponse)
async def get_flow(flow_id: str, db: DB, user: CurrentUser):
    result = await db.execute(
        select(FlowProject).where(FlowProject.id == flow_id, FlowProject.user_id == user.id)
    )
    flow = result.scalar_one_or_none()

    if not flow:
        raise HTTPException(status_code=404, detail={
            "error": "NOT_FOUND",
            "message": "流程图不存在",
            "detail": {},
        })

    return FlowResponse(
        id=flow.id,
        title=flow.title,
        graph_json=flow.graph_json,
        puml_source=flow.puml_source,
        source_code=flow.source_code,
        source_language=flow.source_language,
        created_at=flow.created_at.isoformat(),
        updated_at=flow.updated_at.isoformat(),
    )


@router.put("/{flow_id}", response_model=FlowResponse)
async def update_flow(flow_id: str, request: FlowUpdateRequest, db: DB, user: CurrentUser):
    result = await db.execute(
        select(FlowProject).where(FlowProject.id == flow_id, FlowProject.user_id == user.id)
    )
    flow = result.scalar_one_or_none()

    if not flow:
        raise HTTPException(status_code=404, detail={
            "error": "NOT_FOUND",
            "message": "流程图不存在",
            "detail": {},
        })

    if request.title is not None:
        flow.title = request.title
    if request.graph_json is not None:
        flow.graph_json = request.graph_json
    if request.puml_source is not None:
        flow.puml_source = request.puml_source

    await db.commit()
    await db.refresh(flow)

    return FlowResponse(
        id=flow.id,
        title=flow.title,
        graph_json=flow.graph_json,
        puml_source=flow.puml_source,
        source_code=flow.source_code,
        source_language=flow.source_language,
        created_at=flow.created_at.isoformat(),
        updated_at=flow.updated_at.isoformat(),
    )


@router.delete("/{flow_id}", status_code=204)
async def delete_flow(flow_id: str, db: DB, user: CurrentUser):
    result = await db.execute(
        select(FlowProject).where(FlowProject.id == flow_id, FlowProject.user_id == user.id)
    )
    flow = result.scalar_one_or_none()

    if not flow:
        raise HTTPException(status_code=404, detail={
            "error": "NOT_FOUND",
            "message": "流程图不存在",
            "detail": {},
        })

    await db.delete(flow)
    await db.commit()
