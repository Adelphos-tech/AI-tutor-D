"""
FastAPI Real-Time Voice Pipeline
Orchestrates Deepgram STT → Gemini 2.5 Pro → Deepgram TTS with <1s latency
"""

import asyncio
import json
import os
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

from voice_pipeline_streaming import VoicePipelineStreaming

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="Real-Time Voice AI Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "Real-Time Voice AI Backend",
        "status": "running",
        "endpoints": {
            "websocket": "/ws",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, material_id: str = None):
    """
    Main WebSocket endpoint for real-time voice streaming
    
    Client sends: {"type": "audio", "data": base64_audio} or {"type": "init", "material_id": "..."}
    Client receives: {"type": "transcript|audio|status", "data": ...}
    """
    await websocket.accept()
    logger.info(f"🔌 Client connected (material_id: {material_id})")
    
    # Create streaming pipeline
    pipeline = VoicePipelineStreaming(
        deepgram_api_key=os.getenv("DEEPGRAM_API_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        material_id=material_id
    )
    
    try:
        # Initialize pipeline
        await pipeline.initialize()
        await websocket.send_json({
            "type": "status",
            "data": "connected"
        })
        logger.info("✅ Pipeline initialized")
        
        # Create tasks for bidirectional streaming
        receive_task = asyncio.create_task(
            receive_audio(websocket, pipeline)
        )
        send_task = asyncio.create_task(
            send_responses(websocket, pipeline)
        )
        
        # Wait for either task to complete (or error)
        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
                
    except WebSocketDisconnect:
        logger.info("🔌 Client disconnected")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "data": str(e)
            })
        except:
            pass
    finally:
        # Cleanup
        await pipeline.cleanup()
        logger.info("🧹 Pipeline cleaned up")

async def receive_audio(websocket: WebSocket, pipeline: VoicePipelineStreaming):
    """
    Receive binary PCM audio from client and stream to Deepgram
    """
    try:
        while True:
            # Receive binary data (PCM audio)
            data = await websocket.receive_bytes()
            
            # Send directly to Deepgram streaming
            await pipeline.process_audio_chunk(data)
                
    except WebSocketDisconnect:
        logger.info("🔌 Receive task: Client disconnected")
    except Exception as e:
        logger.error(f"❌ Receive error: {e}", exc_info=True)
        raise

async def send_responses(websocket: WebSocket, pipeline: VoicePipelineStreaming):
    """
    Send transcripts and audio responses back to client
    """
    try:
        async for message in pipeline.get_output_stream():
            await websocket.send_json(message)
            
    except WebSocketDisconnect:
        logger.info("🔌 Send task: Client disconnected")
    except Exception as e:
        logger.error(f"❌ Send error: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
