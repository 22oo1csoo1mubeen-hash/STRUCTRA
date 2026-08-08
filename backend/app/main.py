"""FastAPI application entry point."""

from fastapi import FastAPI

from app.api.router import api_router

app = FastAPI(
    title="Structra Backend",
    version="0.1.0",
    description="Backend foundation for Structra.",
)
app.include_router(api_router)
