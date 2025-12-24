"""
Image Generation API Routes.
Handles image generation and editing using configured providers (Nebius, OpenRouter, etc.).
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.services.image_generation.service import ImageGenerationService
from libs.core.config import ConfigurationService
from libs.core.logging import create_logger

logger = create_logger("api.image")

router = APIRouter(
    tags=["Image Generation"],
)


class ImageGenerationRequest(BaseModel):
    """Request model for image generation."""
    prompt: str = Field(..., description="Text prompt describing the image to generate")
    previous_image_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded previous image for editing"
    )
    previous_image_mime_type: Optional[str] = Field(
        default="image/png",
        description="MIME type of the previous image"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation ID for tracking"
    )


class ImageGenerationResponse(BaseModel):
    """Response model for image generation."""
    success: bool
    image_base64: Optional[str] = None
    mime_type: Optional[str] = None
    model: Optional[str] = None
    text_response: Optional[str] = None
    error: Optional[str] = None
    timestamp: str


async def get_config_service(request: Request) -> ConfigurationService:
    """Get the configuration service from the request container."""
    container = request.app.container
    config_service = container.config_service()
    return config_service


@router.post("/generate")
async def generate_image(
    request: Request,
    config_service: ConfigurationService = Depends(get_config_service),
) -> JSONResponse:
    """
    Generate or edit an image using AI.

    For new image generation, provide only the prompt.
    For image editing, provide the previous_image_base64 along with the editing instruction.
    """
    try:
        # Parse body manually to handle bytes from proxy
        raw_body = await request.body()
        try:
            body_data = json.loads(raw_body)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse request body: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        body = ImageGenerationRequest(**body_data)
        logger.info(f"Image generation request: prompt='{body.prompt[:100]}...', editing={body.previous_image_base64 is not None}")

        # Create the image generation service
        service = ImageGenerationService(config_service, logger)

        # Generate the image
        result = await service.generate_image(
            prompt=body.prompt,
            previous_image_base64=body.previous_image_base64,
            previous_image_mime_type=body.previous_image_mime_type or "image/png",
        )

        response = ImageGenerationResponse(
            success=result.get("success", False),
            image_base64=result.get("image_base64"),
            mime_type=result.get("mime_type"),
            model=result.get("model"),
            text_response=result.get("text_response"),
            error=result.get("error"),
            timestamp=datetime.utcnow().isoformat(),
        )

        if not response.success:
            logger.warning(f"Image generation failed: {response.error}")
            return JSONResponse(
                status_code=400,
                content=response.model_dump(),
            )

        logger.info(f"Image generation successful, model: {response.model}")
        return JSONResponse(content=response.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/stream")
async def generate_image_stream(
    request: Request,
    config_service: ConfigurationService = Depends(get_config_service),
) -> StreamingResponse:
    """
    Generate or edit an image with SSE streaming for progress updates.

    Emits events:
    - status: Progress updates
    - image: The generated image data
    - complete: Final completion event
    - error: Error event if generation fails
    """
    # Parse body before the stream generator
    raw_body = await request.body()
    try:
        body_data = json.loads(raw_body)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse request body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    body = ImageGenerationRequest(**body_data)

    async def event_stream():
        try:
            # Emit status event
            yield _sse_event("status", {
                "step": "starting",
                "message": "Starting image generation...",
                "timestamp": datetime.utcnow().isoformat(),
            })

            # Create the service
            service = ImageGenerationService(config_service, logger)

            yield _sse_event("status", {
                "step": "generating",
                "message": "Generating image with AI model...",
                "timestamp": datetime.utcnow().isoformat(),
            })

            # Generate the image
            result = await service.generate_image(
                prompt=body.prompt,
                previous_image_base64=body.previous_image_base64,
                previous_image_mime_type=body.previous_image_mime_type or "image/png",
            )

            if result.get("success"):
                # Emit the image data
                yield _sse_event("image", {
                    "image_base64": result.get("image_base64"),
                    "mime_type": result.get("mime_type", "image/png"),
                    "model": result.get("model"),
                    "text_response": result.get("text_response"),
                    "timestamp": datetime.utcnow().isoformat(),
                })

                # Emit completion
                yield _sse_event("complete", {
                    "success": True,
                    "model": result.get("model"),
                    "timestamp": datetime.utcnow().isoformat(),
                })
            else:
                # Emit error
                yield _sse_event("error", {
                    "error": result.get("error", "Unknown error"),
                    "model": result.get("model"),
                    "timestamp": datetime.utcnow().isoformat(),
                })

        except Exception as e:
            logger.error(f"Image generation stream error: {e}", exc_info=True)
            yield _sse_event("error", {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_event(event_name: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"


@router.get("/models")
async def get_available_models(
    request: Request,
    config_service: ConfigurationService = Depends(get_config_service),
) -> JSONResponse:
    """Get list of available image generation models."""
    try:
        from app.utils.aimodels import ModelType
        from libs.core.constants import ConfigPath as config_node_constants

        ai_models = await config_service.get_config(
            config_node_constants.AI_MODELS.value,
            use_cache=True,
        )

        if not ai_models:
            return JSONResponse(content={"models": []})

        image_models = ai_models.get(ModelType.IMAGE_GENERATION.value) or []

        # Return sanitized model info (without API keys)
        models = []
        for model in image_models:
            config = model.get("configuration", {})
            models.append({
                "modelKey": model.get("modelKey"),
                "provider": model.get("provider"),
                "model": config.get("model"),
                "isDefault": model.get("isDefault", False),
            })

        return JSONResponse(content={"models": models})

    except Exception as e:
        logger.error(f"Error getting image models: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

