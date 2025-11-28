"""
Real-time Voice Pipeline with Deepgram + Groq
Deepgram STT (streaming) + Groq LLM (ultra-fast) + Deepgram TTS
"""

import asyncio
import logging
import ssl
import os

# Disable SSL verification for macOS issues - MUST BE BEFORE IMPORTS
os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['SSL_CERT_FILE'] = ''

# Monkey patch ssl to always use unverified context
_original_create_default_context = ssl.create_default_context
def _create_unverified_context(*args, **kwargs):
    context = _original_create_default_context(*args, **kwargs)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context

ssl.create_default_context = _create_unverified_context
ssl._create_default_https_context = ssl._create_unverified_context

from groq import AsyncGroq
from typing import Optional
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

logger = logging.getLogger(__name__)

class VoicePipelineGroq:
    """
    Real-time voice pipeline using Deepgram streaming + Groq for ultra-fast LLM
    """
    
    def __init__(self, deepgram_api_key: str, groq_api_key: str, material_id: Optional[str] = None, model: str = "llama-3.3-70b-versatile"):
        self.deepgram_api_key = deepgram_api_key
        self.groq_api_key = groq_api_key
        self.material_id = material_id
        self.model = model
        
        self.deepgram_client = None
        self.dg_connection = None
        self.output_queue = asyncio.Queue()
        self.current_transcript = ""
        self.loop = None  # Store event loop for callbacks
        
        # Initialize Groq client
        self.groq_client = AsyncGroq(api_key=self.groq_api_key)
        
        logger.info(f"🎙️ Voice pipeline (GROQ) created for material: {material_id}, model: {model}")
    
    async def initialize(self):
        """
        Initialize Deepgram streaming connection
        """
        try:
            # Store event loop for callbacks
            self.loop = asyncio.get_running_loop()
            
            # Create Deepgram client
            config = DeepgramClientOptions(
                options={
                    "keepalive": "true",
                    "termination_exception_connect": "true",
                    "termination_exception_exit": "true",
                }
            )
            self.deepgram_client = DeepgramClient(self.deepgram_api_key, config)
            
            # Create live transcription connection
            self.dg_connection = self.deepgram_client.listen.live.v("1")
            
            # Set up event handlers
            self.dg_connection.on(LiveTranscriptionEvents.Transcript, self._on_transcript)
            self.dg_connection.on(LiveTranscriptionEvents.Error, self._on_error)
            
            # Start connection
            options = LiveOptions(
                model="nova-2",
                language="en",
                smart_format=True,
                encoding="linear16",
                sample_rate=48000,
                channels=1,
            )
            
            if self.dg_connection.start(options) is False:
                raise Exception("Failed to start Deepgram connection")
            
            logger.info("✅ Deepgram streaming connection established")
            logger.info(f"✅ Groq client initialized with model: {self.model}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize: {e}", exc_info=True)
            raise
    
    def _on_transcript(self, *args, **kwargs):
        """
        Handle incoming transcripts from Deepgram
        """
        try:
            result = kwargs.get("result")
            if not result:
                return
            
            sentence = result.channel.alternatives[0].transcript
            
            if len(sentence) == 0:
                return
            
            is_final = result.is_final
            
            logger.info(f"📝 Transcript ({'final' if is_final else 'interim'}): {sentence}")
            
            # Send transcript to client using run_coroutine_threadsafe
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.output_queue.put({
                        "type": "transcript",
                        "data": {
                            "text": sentence,
                            "is_final": is_final
                        }
                    }),
                    self.loop
                )
            
            # If final transcript, generate AI response
            if is_final:
                self.current_transcript = sentence
                if self.loop:
                    asyncio.run_coroutine_threadsafe(
                        self._generate_and_stream_response(sentence),
                        self.loop
                    )
                
        except Exception as e:
            logger.error(f"❌ Error in _on_transcript: {e}", exc_info=True)
    
    def _on_error(self, *args, **kwargs):
        """
        Handle Deepgram errors
        """
        error = kwargs.get("error")
        logger.error(f"❌ Deepgram error: {error}")
    
    async def process_audio_chunk(self, audio_bytes: bytes):
        """
        Send binary PCM audio directly to Deepgram streaming
        """
        try:
            if self.dg_connection:
                self.dg_connection.send(audio_bytes)
                logger.debug(f"📤 Sent {len(audio_bytes)} bytes to Deepgram")
            
        except Exception as e:
            logger.error(f"❌ Error sending audio to Deepgram: {e}")
    
    async def finalize_audio(self):
        """
        Called when user stops speaking
        """
        logger.info("🎤 Audio finalize called (streaming mode - no-op)")
        pass
    
    async def _generate_and_stream_response(self, transcript: str):
        """
        Generate AI response using Groq and stream it back as text + audio
        """
        try:
            logger.info(f"💬 Generating response for: {transcript}")
            
            await self.output_queue.put({
                "type": "status",
                "data": "generating"
            })
            
            # Build prompt with RAG context
            context = await self._search_documents(transcript)
            
            prompt = f"""You are an AI tutor helping students learn. 

Context from learning materials:
{context}

Student said: {transcript}

Provide a helpful, clear, and concise response. Be encouraging and educational. Keep it brief and conversational."""
            
            # Generate response with Groq (streaming)
            full_text = ""
            
            # Use Groq streaming API for ultra-fast response
            stream = await self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI tutor. Be helpful, encouraging, and educational. Keep responses brief and conversational."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                temperature=0.7,
                max_tokens=500,
                stream=True
            )
            
            # Stream text chunks as they arrive
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    text_chunk = chunk.choices[0].delta.content
                    full_text += text_chunk
                    
                    # Send each chunk immediately
                    await self.output_queue.put({
                        "type": "text_chunk",
                        "data": text_chunk
                    })
            
            logger.info(f"💬 Full response: {full_text}")
            
            # Send complete text
            await self.output_queue.put({
                "type": "text",
                "data": full_text
            })
            
            # Generate TTS in background (non-blocking)
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self._generate_tts_background(full_text),
                    self.loop
                )
            
            await self.output_queue.put({
                "type": "status",
                "data": "complete"
            })
            
        except Exception as e:
            logger.error(f"❌ Error generating response: {e}", exc_info=True)
            await self.output_queue.put({
                "type": "error",
                "data": str(e)
            })
    
    async def _generate_tts_background(self, text: str):
        """
        Generate TTS in background and send when ready
        """
        try:
            audio_data = await self._text_to_speech(text)
            
            if audio_data:
                await self.output_queue.put({
                    "type": "audio",
                    "data": audio_data
                })
        except Exception as e:
            logger.error(f"❌ Background TTS error: {e}")
    
    async def _text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using Deepgram TTS
        Returns base64-encoded audio
        """
        try:
            import aiohttp
            import base64
            
            url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
            
            headers = {
                "Authorization": f"Token {self.deepgram_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "text": text
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        audio_bytes = await response.read()
                        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                        logger.info(f"🔊 Generated TTS audio: {len(audio_bytes)} bytes")
                        return audio_base64
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ TTS failed: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"❌ TTS error: {e}", exc_info=True)
            return None
    
    async def _search_documents(self, query: str) -> str:
        """
        Search learning materials using RAG
        TODO: Implement Pinecone vector search
        """
        if not self.material_id:
            return "No specific learning material context available."
        
        # Placeholder - implement Pinecone search
        return f"Learning material ID: {self.material_id} (RAG search not yet implemented)"
    
    async def get_output_stream(self):
        """
        Generator that yields output messages
        """
        while True:
            message = await self.output_queue.get()
            yield message
            
            # Stop if we get a complete or error status
            if message.get("type") == "status" and message.get("data") in ["complete", "error"]:
                break
    
    async def cleanup(self):
        """
        Clean up resources
        """
        try:
            if self.dg_connection:
                self.dg_connection.finish()
                logger.info("🧹 Deepgram connection closed")
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}")
