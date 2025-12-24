"""
Image Generation Service supporting multiple providers (OpenRouter, Nebius, etc.).
Supports both image generation and image editing (with previous image as input).
"""

import base64
from logging import Logger
from typing import Any, Dict, List, Optional

import httpx

from app.utils.aimodels import ModelType
from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants


class ImageGenerationService:
    """Service for generating and editing images using various API providers."""

    DEFAULT_MODEL = "black-forest-labs/flux-schnell"
    NEBIUS_API_BASE = "https://api.tokenfactory.nebius.com/v1"
    OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"

    def __init__(self, config_service: ConfigurationService, logger: Logger):
        self.config_service = config_service
        self.logger = logger
        self._api_key: Optional[str] = None
        self._model: str = self.DEFAULT_MODEL

    async def _get_config(self) -> Dict[str, Any]:
        """Get image generation model configuration."""
        try:
            ai_models = await self.config_service.get_config(
                config_node_constants.AI_MODELS.value,
                use_cache=True,
            )

            if not ai_models:
                self.logger.warning("No AI models configuration found, using environment defaults")
                return self._get_env_fallback()

            # Get imageGeneration models
            image_models = ai_models.get(ModelType.IMAGE_GENERATION.value) or []

            if not image_models:
                self.logger.warning("No imageGeneration models configured, using environment defaults")
                return self._get_env_fallback()

            # Find default model or use first one
            config = next(
                (cfg for cfg in image_models if cfg.get("isDefault")),
                image_models[0]
            )

            return config

        except Exception as e:
            self.logger.error(f"Failed to get image generation config: {e}")
            return self._get_env_fallback()

    def _get_env_fallback(self) -> Dict[str, Any]:
        """Fallback to environment variables for image generation configuration."""
        import os

        # Try Nebius first, then OpenRouter
        nebius_key = os.getenv("NEBIUS_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("DEEPRESEARCH_API_KEY")

        if nebius_key:
            return {
                "provider": "openAICompatible",
                "configuration": {
                    "apiKey": nebius_key,
                    "model": self.DEFAULT_MODEL,
                    "endpoint": self.NEBIUS_API_BASE,
                }
            }
        elif openrouter_key:
            return {
                "provider": "openRouter",
                "configuration": {
                    "apiKey": openrouter_key,
                    "model": "google/gemini-2.5-flash-image",
                    "endpoint": self.OPENROUTER_API_BASE,
                }
            }
        else:
            raise ValueError("No API key found. Set NEBIUS_API_KEY or OPENROUTER_API_KEY in environment.")

    async def generate_image(
        self,
        prompt: str,
        previous_image_base64: Optional[str] = None,
        previous_image_mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """
        Generate or edit an image using configured API provider.

        Args:
            prompt: The text prompt describing what to generate/edit
            previous_image_base64: Optional base64-encoded image for editing
            previous_image_mime_type: MIME type of the previous image

        Returns:
            Dict containing:
                - success: bool
                - image_base64: str (base64-encoded generated image)
                - mime_type: str (e.g., "image/png")
                - model: str (model used)
                - error: str (if success is False)
        """
        try:
            config = await self._get_config()
            provider = config.get("provider", "openAICompatible")
            configuration = config.get("configuration", {})

            api_key = configuration.get("apiKey")
            if not api_key:
                raise ValueError("No API key configured for image generation")

            model = configuration.get("model", self.DEFAULT_MODEL)
            endpoint = configuration.get("endpoint", self.NEBIUS_API_BASE)

            self.logger.info(f"Generating image with provider: {provider}, model: {model}, editing: {previous_image_base64 is not None}")

            # Route to appropriate API method
            if provider == "openAICompatible" and "nebius" in endpoint.lower():
                return await self._generate_with_nebius(api_key, model, endpoint, prompt, previous_image_base64)
            else:
                # Default to OpenRouter/chat completions style
                return await self._generate_with_chat_api(api_key, model, endpoint, prompt, previous_image_base64, previous_image_mime_type)

        except Exception as e:
            self.logger.error(f"Image generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "model": getattr(self, '_model', self.DEFAULT_MODEL),
            }

    async def _generate_with_nebius(
        self,
        api_key: str,
        model: str,
        endpoint: str,
        prompt: str,
        previous_image_base64: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate image using Nebius images/generations API."""
        self.logger.debug(f"Using Nebius images/generations API: {endpoint}")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # Nebius uses standard OpenAI images.generate API format
        payload = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "response_format": "b64_json",
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{endpoint}/images/generations",
                    headers=headers,
                    json=payload,
                )

                if response.status_code != 200:
                    error_text = response.text
                    self.logger.error(f"Nebius API error: {response.status_code} - {error_text}")
                    return {
                        "success": False,
                        "error": f"Nebius API error: {response.status_code} - {error_text}",
                        "model": model,
                    }

                result = response.json()
                self.logger.debug(f"Nebius response keys: {result.keys()}")

                # Extract base64 image from response
                if "data" in result and len(result["data"]) > 0:
                    image_data = result["data"][0]
                    if "b64_json" in image_data:
                        return {
                            "success": True,
                            "image_base64": image_data["b64_json"],
                            "mime_type": "image/png",
                            "model": model,
                        }
                    elif "url" in image_data:
                        # If URL returned instead of b64, fetch and convert
                        return await self._fetch_and_encode_image(image_data["url"], model)

                return {
                    "success": False,
                    "error": "Nebius did not return image data",
                    "model": model,
                }

        except Exception as e:
            self.logger.error(f"Nebius generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "model": model,
            }

    async def _generate_with_chat_api(
        self,
        api_key: str,
        model: str,
        endpoint: str,
        prompt: str,
        previous_image_base64: Optional[str] = None,
        previous_image_mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """Generate image using chat completions API (OpenRouter, etc.)."""
        self.logger.debug(f"Using chat completions API: {endpoint}")

        # Build the message content
        content: List[Dict[str, Any]] = []

        # If we have a previous image, include it first (for editing)
        if previous_image_base64:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{previous_image_mime_type};base64,{previous_image_base64}"
                }
            })
            # Add the editing instruction
            content.append({
                "type": "text",
                "text": prompt
            })
        else:
            # Simple generation prompt
            content.append({
                "type": "text",
                "text": f"Generate an image: {prompt}"
            })

        # Prepare the API request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thero.ai",
            "X-Title": "Thero AI Image Generation",
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if response.status_code != 200:
                    error_text = response.text
                    self.logger.error(f"Chat API error: {response.status_code} - {error_text}")
                    return {
                        "success": False,
                        "error": f"API error: {response.status_code} - {error_text}",
                        "model": model,
                    }

                result = response.json()
                self.logger.debug("Chat API response received")

                # Extract the generated image from the response
                choices = result.get("choices", [])
                if not choices:
                    return {
                        "success": False,
                        "error": "No response from model",
                        "model": model,
                    }

                message = choices[0].get("message", {})
                message_content = message.get("content", "")

                # Check if the response contains an image
                image_data = self._extract_image_from_response(message, result)

                if image_data:
                    return {
                        "success": True,
                        "image_base64": image_data["base64"],
                        "mime_type": image_data.get("mime_type", "image/png"),
                        "model": model,
                        "text_response": message_content if isinstance(message_content, str) else None,
                    }
                else:
                    # Model might have returned text instead of an image
                    return {
                        "success": False,
                        "error": "Model did not return an image. Response: " + str(message_content)[:500],
                        "model": model,
                        "text_response": message_content if isinstance(message_content, str) else None,
                    }

        except Exception as e:
            self.logger.error(f"Chat API generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "model": model,
            }

    async def _fetch_and_encode_image(self, image_url: str, model: str) -> Dict[str, Any]:
        """Fetch image from URL and encode as base64."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                if response.status_code == 200:
                    image_base64 = base64.b64encode(response.content).decode("utf-8")
                    return {
                        "success": True,
                        "image_base64": image_base64,
                        "mime_type": "image/png",
                        "model": model,
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Failed to fetch image from URL: {image_url}",
                        "model": model,
                    }
        except Exception as e:
            self.logger.error(f"Failed to fetch and encode image: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": model,
            }

    def _extract_image_from_response(
        self,
        message: Dict[str, Any],
        full_response: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract image data from various response formats."""

        # Format 1: OpenRouter Gemini format - images array in message
        # Example: message.images[0].image_url.url = "data:image/png;base64,..."
        images = message.get("images", [])
        if images and len(images) > 0:
            for img in images:
                if isinstance(img, dict):
                    # Check for image_url format
                    if img.get("type") == "image_url":
                        url = img.get("image_url", {}).get("url", "")
                        if url.startswith("data:"):
                            try:
                                header, b64_data = url.split(",", 1)
                                mime_type = header.split(";")[0].replace("data:", "")
                                self.logger.debug(f"Extracted image from message.images, mime_type: {mime_type}")
                                return {
                                    "base64": b64_data,
                                    "mime_type": mime_type,
                                }
                            except Exception as e:
                                self.logger.warning(f"Failed to parse image data URL: {e}")

        # Format 2: Content is a list with parts (Gemini style)
        content = message.get("content")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    # Check for inline_data (base64 image)
                    if "inline_data" in part:
                        inline_data = part["inline_data"]
                        return {
                            "base64": inline_data.get("data"),
                            "mime_type": inline_data.get("mime_type", "image/png"),
                        }
                    # Check for image_url
                    if part.get("type") == "image_url":
                        url = part.get("image_url", {}).get("url", "")
                        if url.startswith("data:"):
                            try:
                                header, b64_data = url.split(",", 1)
                                mime_type = header.split(";")[0].replace("data:", "")
                                return {
                                    "base64": b64_data,
                                    "mime_type": mime_type,
                                }
                            except Exception:
                                pass

        # Format 3: Content is a string with embedded base64 or URL
        if isinstance(content, str):
            # Check if it's a data URL
            if content.startswith("data:image"):
                try:
                    header, b64_data = content.split(",", 1)
                    mime_type = header.split(";")[0].replace("data:", "")
                    return {
                        "base64": b64_data,
                        "mime_type": mime_type,
                    }
                except Exception:
                    pass

        # Format 4: Check for generated_images in response (some models)
        generated_images = full_response.get("generated_images", [])
        if generated_images and len(generated_images) > 0:
            img = generated_images[0]
            if isinstance(img, dict):
                return {
                    "base64": img.get("b64_json") or img.get("base64"),
                    "mime_type": img.get("mime_type", "image/png"),
                }

        return None

