import os
import asyncio
import json
import logging
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import aiofiles
from deepgram import DeepgramClient, PrerecordedOptions, SpeakOptions
from groq import Groq
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Tutor Voice Service", version="1.0.0")

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

class VoiceAIService:
    def __init__(self):
        self.deepgram = deepgram
        self.groq = groq_client
        
    async def transcribe_audio(self, audio_data: bytes) -> dict:
        """Transcribe audio using Deepgram"""
        try:
            logger.info(f"Transcribing audio of size: {len(audio_data)} bytes")
            
            # Configure transcription options
            options = PrerecordedOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                punctuate=True,
                diarize=False,
            )
            
            # Transcribe audio
            response = self.deepgram.listen.prerecorded.v("1").transcribe_file(
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
            
            logger.info(f"Transcription result: '{transcript}' (confidence: {confidence})")
            
            return {
                "transcript": transcript,
                "confidence": confidence,
                "words": words
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    async def synthesize_speech(self, text: str, voice: str = "aura-asteria-en") -> bytes:
        """Synthesize speech using Deepgram"""
        try:
            logger.info(f"Synthesizing speech for text: '{text[:50]}...'")
            
            # Configure TTS options
            options = SpeakOptions(
                model=voice,
                encoding="linear16",
                sample_rate=24000,
            )
            
            # Generate speech
            response = self.deepgram.speak.v("1").save(
                {"text": text}, options
            )
            
            # Get audio data
            audio_data = response["audio"]
            
            logger.info(f"Generated audio of size: {len(audio_data)} bytes")
            return audio_data
            
        except Exception as e:
            logger.error(f"Speech synthesis error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")
    
    async def generate_ai_response(self, user_message: str, context: str = "") -> str:
        """Generate AI response using Groq"""
        try:
            logger.info(f"Generating AI response for: '{user_message[:50]}...'")
            
            # Create system prompt for PhD-level tutor
            system_prompt = """You are an expert AI academic tutor with PhD-level knowledge. 
            You provide clear, detailed explanations tailored to the student's level.
            Focus on the provided context and help students understand complex concepts.
            Be encouraging and provide examples when helpful."""
            
            # Add context if provided (truncated to manage token limits)
            if context:
                truncated_context = context[:1500] + "..." if len(context) > 1500 else context
                system_prompt += f"\n\nContext from document: {truncated_context}"
            
            # Generate response
            response = self.groq.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=512,  # Reduced to manage token limits
                temperature=0.7,
            )
            
            ai_response = response.choices[0].message.content
            logger.info(f"Generated AI response: '{ai_response[:50]}...'")
            
            return ai_response
            
        except Exception as e:
            logger.error(f"AI response generation error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI response generation failed: {str(e)}")

# Initialize service
voice_service = VoiceAIService()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "AI Tutor Voice Service",
        "deepgram": "configured" if os.getenv("DEEPGRAM_API_KEY") else "missing",
        "groq": "configured" if os.getenv("GROQ_API_KEY") else "missing",
    }

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Transcribe
        result = await voice_service.transcribe_audio(audio_data)
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        logger.error(f"Transcription endpoint error: {str(e)}")
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
        
        # Generate speech
        audio_data = await voice_service.synthesize_speech(text, voice)
        
        # Return audio as streaming response
        return StreamingResponse(
            iter([audio_data]),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
        
    except Exception as e:
        logger.error(f"Synthesis endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice-chat")
async def voice_chat(
    audio: UploadFile = File(...),
    session_id: int = Form(...),
    context: str = Form(default="")
):
    """Complete voice chat pipeline: transcribe -> AI response -> synthesize"""
    try:
        # Step 1: Transcribe audio
        audio_data = await audio.read()
        transcription = await voice_service.transcribe_audio(audio_data)
        
        user_message = transcription["transcript"]
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="No speech detected")
        
        # Step 2: Generate AI response
        ai_response = await voice_service.generate_ai_response(user_message, context)
        
        # Step 3: Synthesize AI response
        response_audio = await voice_service.synthesize_speech(ai_response)
        
        return {
            "success": True,
            "user_message": user_message,
            "ai_response": ai_response,
            "confidence": transcription["confidence"],
            "audio_size": len(response_audio)
        }
        
    except Exception as e:
        logger.error(f"Voice chat endpoint error: {str(e)}")
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
