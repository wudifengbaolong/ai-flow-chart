from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.models.base import Base
from app.api.parse import router as parse_router
from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.flow import router as flow_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(title="AI Flow Diagram API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse_router)
app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(flow_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
