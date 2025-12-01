import os
import asyncio
import json
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import aiofiles
from deepgram import (
    DeepgramClient,
    PrerecordedOptions, 
    SpeakOptions
)
from groq import Groq
from dotenv import load_dotenv
import httpx
import base64
import io

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Tutor Live Voice Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class LiveVoiceSession:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.is_active = False
        self.conversation_context = []
        self.current_transcript = ""
        
    async def start_session(self):
        """Start the live voice session"""
        try:
            logger.info(f"Starting live voice session {self.session_id}")
            self.is_active = True
            
            await self.send_to_client({
                "type": "session_started",
                "message": "Live voice session started"
            })
            
            return True
                
        except Exception as e:
            logger.error(f"Error starting session: {str(e)}")
            return False
    
    async def process_audio_chunk(self, audio_data: bytes):
        """Process audio chunk for transcription"""
        try:
            logger.info(f"Processing audio chunk of size: {len(audio_data)}")
            
            # Use prerecorded transcription for audio chunks
            options = PrerecordedOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                punctuate=True,
                diarize=False,
            )
            
            # Transcribe audio chunk
            response = deepgram.listen.prerecorded.v("1").transcribe_file(
                {"buffer": audio_data}, options
            )
            
            # Extract transcript
            transcript = ""
            confidence = 0.0
            
            if response.results and response.results.channels:
                channel = response.results.channels[0]
                if channel.alternatives:
                    alternative = channel.alternatives[0]
                    transcript = alternative.transcript or ""
                    confidence = alternative.confidence or 0.0
            
            if transcript.strip():
                logger.info(f"Transcribed: {transcript}")
                
                # Send transcript to client
                await self.send_to_client({
                    "type": "transcript",
                    "transcript": transcript,
                    "is_final": True,
                    "confidence": confidence
                })
                
                # Process the transcript
                await self.process_user_message(transcript)
            
        except Exception as e:
            logger.error(f"Error processing audio chunk: {str(e)}")
            await self.send_to_client({
                "type": "error",
                "message": f"Audio processing error: {str(e)}"
            })
    
    async def process_user_message(self, message: str):
        """Process user message and generate AI response"""
        try:
            logger.info(f"Processing user message: {message}")
            
            # Add to conversation context
            self.conversation_context.append({"role": "user", "content": message})
            
            # Generate AI response
            ai_response = await self.generate_ai_response(message)
            
            # Add AI response to context
            self.conversation_context.append({"role": "assistant", "content": ai_response})
            
            # Send AI response to client
            await self.send_to_client({
                "type": "ai_response",
                "message": ai_response
            })
            
            # Generate speech for AI response
            await self.synthesize_and_send_speech(ai_response)
            
        except Exception as e:
            logger.error(f"Error processing user message: {str(e)}")
            await self.send_to_client({
                "type": "error",
                "message": "Failed to process your message"
            })
    
    async def generate_ai_response(self, user_message: str) -> str:
        """Generate AI response using Groq"""
        try:
            # Create system prompt
            system_prompt = """You are an expert AI academic tutor with PhD-level knowledge. 
            You provide clear, concise explanations in a conversational manner suitable for voice interaction.
            Keep responses focused and under 100 words for better voice experience.
            Be encouraging and helpful."""
            
            # Prepare messages (limit context to last 6 exchanges)
            messages = [{"role": "system", "content": system_prompt}]
            recent_context = self.conversation_context[-6:] if len(self.conversation_context) > 6 else self.conversation_context
            messages.extend(recent_context)
            
            # Generate response
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=200,  # Shorter for voice
                temperature=0.7,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI response generation error: {str(e)}")
            return "I'm sorry, I'm having trouble processing that right now. Could you please try again?"
    
    async def synthesize_and_send_speech(self, text: str):
        """Synthesize speech and send to client"""
        try:
            logger.info(f"Synthesizing speech for: {text[:50]}...")
            
            # Configure TTS options
            options = SpeakOptions(
                model="aura-asteria-en",
                encoding="linear16",
                sample_rate=24000,
            )
            
            # Generate speech
            response = deepgram.speak.v("1").save(
                {"text": text}, options
            )
            
            # Get audio data
            audio_data = response["audio"]
            
            # Convert to base64 for WebSocket transmission
            audio_b64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Send audio to client
            await self.send_to_client({
                "type": "audio_response",
                "audio": audio_b64,
                "format": "linear16",
                "sample_rate": 24000
            })
            
            logger.info(f"Speech synthesis completed, sent {len(audio_data)} bytes")
            
        except Exception as e:
            logger.error(f"Speech synthesis error: {str(e)}")
            await self.send_to_client({
                "type": "error",
                "message": "Failed to generate speech response"
            })
    
    async def send_to_client(self, message: dict):
        """Send message to WebSocket client"""
        try:
            await self.websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to client: {str(e)}")
    
    async def close(self):
        """Close the session and cleanup"""
        try:
            self.is_active = False
            logger.info(f"Session {self.session_id} closed")
        except Exception as e:
            logger.error(f"Error closing session: {str(e)}")

# Store active sessions
active_sessions: Dict[str, LiveVoiceSession] = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "AI Tutor Live Voice Service (Fixed)",
        "deepgram": "configured" if os.getenv("DEEPGRAM_API_KEY") else "missing",
        "groq": "configured" if os.getenv("GROQ_API_KEY") else "missing",
        "active_sessions": len(active_sessions)
    }

@app.websocket("/live-voice/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for live voice conversation"""
    await websocket.accept()
    logger.info(f"WebSocket connection established for session {session_id}")
    
    # Create new session
    session = LiveVoiceSession(session_id, websocket)
    active_sessions[session_id] = session
    
    try:
        # Start session
        if not await session.start_session():
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Failed to start voice session"
            }))
            return
        
        # Handle WebSocket messages
        while True:
            try:
                # Receive message from client
                message = await websocket.receive()
                
                if message["type"] == "websocket.disconnect":
                    break
                
                # Handle different message types
                if message["type"] == "websocket.receive":
                    if "bytes" in message:
                        # Audio data received
                        audio_data = message["bytes"]
                        await session.process_audio_chunk(audio_data)
                    elif "text" in message:
                        # Text message received
                        data = json.loads(message["text"])
                        await handle_text_message(session, data)
                        
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session {session_id}")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {str(e)}")
                break
    
    finally:
        # Cleanup
        await session.close()
        if session_id in active_sessions:
            del active_sessions[session_id]
        logger.info(f"Session {session_id} cleaned up")

async def handle_text_message(session: LiveVoiceSession, data: dict):
    """Handle text messages from client"""
    try:
        message_type = data.get("type")
        
        if message_type == "start_recording":
            await session.send_to_client({
                "type": "recording_started",
                "message": "Voice recording started"
            })
        elif message_type == "stop_recording":
            await session.send_to_client({
                "type": "recording_stopped", 
                "message": "Voice recording stopped"
            })
        elif message_type == "text_message":
            # Process text message directly
            text = data.get("message", "")
            if text:
                await session.process_user_message(text)
        else:
            logger.warning(f"Unknown message type: {message_type}")
            
    except Exception as e:
        logger.error(f"Error handling text message: {str(e)}")

# Keep original endpoints for backward compatibility
@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Configure transcription options
        options = PrerecordedOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            punctuate=True,
            diarize=False,
        )
        
        # Transcribe audio
        response = deepgram.listen.prerecorded.v("1").transcribe_file(
            {"buffer": audio_data}, options
        )
        
        # Extract transcript
        transcript = ""
        confidence = 0.0
        words = []
        
        if response.results and response.results.channels:
            channel = response.results.channels[0]
            if channel.alternatives:
                alternative = channel.alternatives[0]
                transcript = alternative.transcript or ""
                confidence = alternative.confidence or 0.0
                words = alternative.words or []
        
        return {
            "success": True,
            "transcript": transcript,
            "confidence": confidence,
            "words": words
        }
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/synthesize")
async def synthesize_speech(
    text: str = Form(...),
    voice: str = Form(default="aura-asteria-en")
):
    """Synthesize speech from text"""
    try:
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text is required")
        
        # Configure TTS options
        options = SpeakOptions(
            model=voice,
            encoding="linear16",
            sample_rate=24000,
        )
        
        # Generate speech
        response = deepgram.speak.v("1").save(
            {"text": text}, options
        )
        
        # Get audio data
        audio_data = response["audio"]
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
        
    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/voices")
async def get_available_voices():
    """Get list of available TTS voices"""
    return {
        "voices": [
            {"id": "aura-asteria-en", "name": "Asteria", "language": "English"},
            {"id": "aura-luna-en", "name": "Luna", "language": "English"},
            {"id": "aura-stella-en", "name": "Stella", "language": "English"},
            {"id": "aura-athena-en", "name": "Athena", "language": "English"},
            {"id": "aura-hera-en", "name": "Hera", "language": "English"},
            {"id": "aura-orion-en", "name": "Orion", "language": "English"},
            {"id": "aura-arcas-en", "name": "Arcas", "language": "English"},
            {"id": "aura-perseus-en", "name": "Perseus", "language": "English"},
            {"id": "aura-angus-en", "name": "Angus", "language": "English"},
            {"id": "aura-orpheus-en", "name": "Orpheus", "language": "English"},
            {"id": "aura-helios-en", "name": "Helios", "language": "English"},
            {"id": "aura-zeus-en", "name": "Zeus", "language": "English"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
