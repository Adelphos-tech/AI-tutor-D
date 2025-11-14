"""
Real-time Voice Pipeline with Deepgram Streaming WebSocket
Deepgram STT (streaming) + Gemini LLM + Deepgram TTS
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

import google.generativeai as genai
from typing import Optional
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

logger = logging.getLogger(__name__)

class VoicePipelineStreaming:
    """
    Real-time voice pipeline using Deepgram streaming WebSocket
    """
    
    def __init__(self, deepgram_api_key: str, gemini_api_key: str, material_id: Optional[str] = None):
        self.deepgram_api_key = deepgram_api_key
        self.gemini_api_key = gemini_api_key
        self.material_id = material_id
        
        self.deepgram_client = None
        self.dg_connection = None
        self.output_queue = asyncio.Queue()
        self.current_transcript = ""
        self.loop = None  # Store event loop for callbacks
        
        # Initialize Gemini
        genai.configure(api_key=self.gemini_api_key)
        self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        logger.info(f"🎙️ Voice pipeline (STREAMING) created for material: {material_id}")
    
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
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Deepgram: {e}", exc_info=True)
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
        Called when user stops speaking (not needed for streaming, but kept for compatibility)
        """
        logger.info("🎤 Audio finalize called (streaming mode - no-op)")
        pass
    
    async def _generate_and_stream_response(self, transcript: str):
        """
        Generate AI response using Gemini and stream it back as text + audio
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
            
            # Generate full response
            response = await self.gemini_model.generate_content_async(prompt)
            full_text = response.text
            
            logger.info(f"💬 Full response: {full_text}")
            
            # Send text IMMEDIATELY (don't wait for TTS)
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
            
            logger.info(f"🔊 Converting to speech: {text[:50]}...")
            
            url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
            headers = {
                "Authorization": f"Token {self.deepgram_api_key}",
                "Content-Type": "application/json"
            }
            payload = {"text": text}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"❌ Deepgram TTS error: {response.status} - {error_text}")
                        return ""
                    
                    audio_bytes = await response.read()
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    logger.info(f"✅ TTS audio generated: {len(audio_bytes)} bytes")
                    return audio_base64
                    
        except Exception as e:
            logger.error(f"❌ TTS error: {e}", exc_info=True)
            return ""
    
    async def _search_documents(self, query: str) -> str:
        """
        Search for relevant document content (RAG)
        """
        if not self.material_id:
            return ""
        
        try:
            import aiohttp
            
            logger.info(f"🔍 Searching documents for: {query}")
            
            # Fetch material content from your API
            api_url = f"http://localhost:3000/api/materials/{self.material_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url) as response:
                    if response.status != 200:
                        logger.warning(f"⚠️ Material fetch failed: {response.status}")
                        return ""
                    
                    data = await response.json()
                    content = data.get('content', '')
                    
                    if content:
                        # Return first 2000 chars as context
                        context = content[:2000]
                        logger.info(f"✅ Retrieved {len(context)} chars of material content")
                        return context
                    else:
                        logger.warning("⚠️ Material content is empty")
                        return ""
            
        except Exception as e:
            logger.error(f"❌ Document search error: {e}")
            return ""
    
    async def get_output_stream(self):
        """
        Async generator for output messages
        """
        while True:
            message = await self.output_queue.get()
            yield message
    
    async def cleanup(self):
        """
        Clean up resources
        """
        try:
            if self.dg_connection:
                self.dg_connection.finish()
                logger.info("✅ Deepgram connection closed")
            
            logger.info("✅ Pipeline cleanup complete")
            
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}", exc_info=True)
