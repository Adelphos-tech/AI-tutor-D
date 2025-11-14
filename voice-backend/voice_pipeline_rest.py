"""
Voice Pipeline with Deepgram REST APIs
Uses REST instead of WebSocket to avoid SSL/connection issues
Deepgram STT + Gemini LLM + Deepgram TTS
"""

import asyncio
import base64
import logging
import ssl
import aiohttp
import google.generativeai as genai
from typing import Optional
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

logger = logging.getLogger(__name__)

class VoicePipelineREST:
    """
    Voice pipeline using Deepgram REST APIs for reliability
    """
    
    def __init__(self, deepgram_api_key: str, gemini_api_key: str, material_id: Optional[str] = None):
        self.deepgram_api_key = deepgram_api_key
        self.gemini_api_key = gemini_api_key
        self.deepgram_base_url = "https://api.deepgram.com/v1"
        self.material_id = material_id
        
        # State
        self.audio_buffer = bytearray()
        self.is_processing = False
        self.output_queue = asyncio.Queue()
        
        # Initialize Gemini
        genai.configure(api_key=self.gemini_api_key)
        self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        logger.info(f"🎙️ Voice pipeline (REST) created for material: {material_id}")
    
    async def initialize(self):
        """
        Initialize Deepgram streaming connection
        """
        # Create Deepgram client
        config = DeepgramClientOptions(options={"keepalive": "true"})
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
    
    async def process_audio_chunk(self, audio_bytes: bytes):
        """
        Send binary PCM audio directly to Deepgram streaming
        """
        try:
            # Send binary PCM data directly to Deepgram
            self.dg_connection.send(audio_bytes)
            logger.debug(f"📤 Sent {len(audio_bytes)} bytes to Deepgram")
            
        except Exception as e:
            logger.error(f"❌ Error sending audio to Deepgram: {e}")
    
    async def finalize_audio(self):
        """
        Process accumulated audio when user stops speaking
        """
        if self.is_processing:
        if self.is_processing or len(self.audio_buffer) == 0:
            return
        
        self.is_processing = True
        
        try:
            logger.info(f"🎙️ Processing {len(self.audio_buffer)} bytes of audio")
            
            # Step 1: Transcribe with Deepgram
            transcript = await self._transcribe_audio(bytes(self.audio_buffer))
            
            if not transcript or len(transcript.strip()) == 0:
                logger.warning("⚠️ No transcript received")
                self.audio_buffer.clear()
                self.is_processing = False
                return
            
            logger.info(f"📝 Transcript: {transcript}")
            
            # Send transcript to client
            await self.output_queue.put({
                "type": "transcript",
                "data": {
                    "text": transcript,
                    "is_final": True
                }
            })
            
            # Step 2: Generate and stream response (Gemini + Deepgram TTS)
            await self.output_queue.put({
                "type": "status",
                "data": "generating"
            })
            
            # This will stream text chunks and audio as they arrive
            await self._generate_and_stream_response(transcript)
            
            # Complete
            await self.output_queue.put({
                "type": "status",
                "data": "complete"
            })
            
        except Exception as e:
            logger.error(f"❌ Error in finalize_audio: {e}", exc_info=True)
            await self.output_queue.put({
                "type": "error",
                "data": str(e)
            })
        finally:
            self.audio_buffer.clear()
            self.is_processing = False
    
    async def _transcribe_audio(self, audio_bytes: bytes) -> str:
        """
        Transcribe audio using Deepgram REST API
        """
        try:
            logger.info(f"🔊 Calling Deepgram STT API with {len(audio_bytes)} bytes...")
            
            # Write to temp file to preserve WebM structure
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            logger.info(f"📁 Wrote audio to temp file: {temp_path}")
            
            url = f"{self.deepgram_base_url}/listen"
            params = {
                "model": "nova-2",
                "language": "en",
                "smart_format": "true"
            }
            headers = {
                "Authorization": f"Token {self.deepgram_api_key}",
                "Accept": "application/json"
            }
            
            # Create SSL context that doesn't verify certificates (for macOS issues)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            timeout = aiohttp.ClientTimeout(total=30)
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            try:
                # Read from temp file and send to Deepgram
                with open(temp_path, 'rb') as f:
                    file_data = f.read()
                
                async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
                    # Use multipart form data for file upload
                    form = aiohttp.FormData()
                    form.add_field('file', file_data, filename='audio.webm', content_type='audio/webm')
                    
                    async with session.post(url, params=params, headers={"Authorization": headers["Authorization"]}, data=form) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            logger.error(f"❌ Deepgram STT error: {response.status} - {error_text}")
                            return ""
                        
                        result = await response.json()
                        logger.info(f"📊 Full Deepgram response: {json.dumps(result, indent=2)}")
                        
                        # Extract transcript
                        transcript = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
                        
                        if not transcript:
                            logger.warning(f"⚠️ No transcript received. Full response: {result}")
                        
                        logger.info(f"✅ Transcription complete: {transcript}")
                        return transcript
            finally:
                # Clean up temp file
                import os
                try:
                    os.unlink(temp_path)
                    logger.debug(f"🗑️ Deleted temp file: {temp_path}")
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"❌ Transcription error: {e}", exc_info=True)
            return ""
    
    async def _search_documents(self, query: str) -> str:
        """
        Search for relevant document content (RAG)
        """
        if not self.material_id:
            return ""
        
        try:
            logger.info(f"🔍 Searching documents for: {query}")
            
            # Call the Next.js API for document search
            search_url = f"http://localhost:3000/api/search-documents"
            
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(search_url, json={
                    "query": query,
                    "materialId": self.material_id,
                    "topK": 3
                }) as response:
                    if response.status == 200:
                        result = await response.json()
                        results = result.get("results", [])
                        
                        # Combine all result contents into context
                        context_parts = []
                        for item in results:
                            content = item.get("content", "")
                            if content:
                                context_parts.append(content)
                        
                        context = "\n\n".join(context_parts)
                        logger.info(f"✅ Found {len(results)} chunks, {len(context)} chars of context")
                        return context
                    else:
                        error_text = await response.text()
                        logger.warning(f"⚠️ Search failed: {response.status} - {error_text}")
                        return ""
                        
        except Exception as e:
            logger.error(f"❌ Search error: {e}")
            return ""
    
    async def _generate_and_stream_response(self, user_text: str):
        """
        Generate response using Gemini with RAG context and STREAM it
        Convert each text chunk to speech immediately for low latency
        """
        try:
            logger.info(f"🧠 Generating streaming response for: {user_text}")
            
            # Search for relevant context if material_id is provided
            context = ""
            if self.material_id:
                context = await self._search_documents(user_text)
            
            if context:
                prompt = f"""You are Alex, a helpful and friendly AI tutor.

Here is relevant information from the study material:
{context}

Based on this information, respond naturally and conversationally to: {user_text}

Keep your response concise (2-3 sentences) and helpful."""
            else:
                prompt = f"""You are Alex, a helpful and friendly AI tutor. 

Respond naturally and conversationally to: {user_text}

Keep your response concise (2-3 sentences) and helpful."""
            
            # Stream response from Gemini
            response = await self.gemini_model.generate_content_async(
                prompt,
                stream=True
            )
            
            full_text = ""
            text_buffer = ""
            
            async for chunk in response:
                if chunk.text:
                    chunk_text = chunk.text
                    full_text += chunk_text
                    text_buffer += chunk_text
                    
                    # Send text chunk to client immediately
                    await self.output_queue.put({
                        "type": "text_chunk",
                        "data": chunk_text
                    })
                    
                    # Convert to speech every 8 words for faster response
                    word_count = len(text_buffer.split())
                    if word_count >= 8 or any(punct in text_buffer for punct in ['.', '!', '?', '\n']):
                        logger.info(f"🔊 Converting chunk to speech: {text_buffer[:50]}...")
                        
                        # Send speaking status before first audio
                        await self.output_queue.put({
                            "type": "status",
                            "data": "speaking"
                        })
                        
                        audio_data = await self._text_to_speech(text_buffer)
                        
                        if audio_data:
                            logger.info(f"📤 Sending {len(audio_data)} bytes of audio in chunks")
                            # Send audio chunks immediately
                            chunk_size = 4096
                            audio_chunks_sent = 0
                            for i in range(0, len(audio_data), chunk_size):
                                audio_chunk = audio_data[i:i+chunk_size]
                                audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                                await self.output_queue.put({
                                    "type": "audio",
                                    "data": audio_b64
                                })
                                audio_chunks_sent += 1
                            logger.info(f"✅ Sent {audio_chunks_sent} audio chunks")
                        
                        text_buffer = ""  # Clear buffer
            
            # Convert any remaining text
            if text_buffer.strip():
                logger.info(f"🔊 Converting final chunk: {text_buffer[:50]}...")
                audio_data = await self._text_to_speech(text_buffer)
                if audio_data:
                    logger.info(f"📤 Sending final {len(audio_data)} bytes of audio")
                    chunk_size = 4096
                    audio_chunks_sent = 0
                    for i in range(0, len(audio_data), chunk_size):
                        audio_chunk = audio_data[i:i+chunk_size]
                        audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                        await self.output_queue.put({
                            "type": "audio",
                            "data": audio_b64
                        })
                        audio_chunks_sent += 1
                    logger.info(f"✅ Sent {audio_chunks_sent} final audio chunks")
            
            logger.info(f"✅ Streaming complete: {len(full_text)} chars total")
            
        except Exception as e:
            logger.error(f"❌ Streaming error: {e}", exc_info=True)
            await self.output_queue.put({
                "type": "error",
                "data": "I'm sorry, I encountered an error. Could you please try again?"
            })
    
    async def _text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech using Deepgram REST API
        """
        try:
            logger.info(f"🔊 Converting to speech: {text[:50]}...")
            
            url = f"{self.deepgram_base_url}/speak"
            params = {
                "model": "aura-asteria-en",
                "encoding": "linear16",
                "sample_rate": "24000"
            }
            headers = {
                "Authorization": f"Token {self.deepgram_api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "text": text
            }
            
            # Create SSL context that doesn't verify certificates (for macOS issues)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(url, params=params, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"❌ Deepgram TTS error: {response.status} - {error_text}")
                        return None
                    
                    audio_data = await response.read()
                    logger.info(f"✅ TTS complete: {len(audio_data)} bytes")
                    
                    return audio_data
                    
        except Exception as e:
            logger.error(f"❌ TTS error: {e}", exc_info=True)
            return None
    
    async def get_output_stream(self):
        """
        Get output messages
        """
        while True:
            message = await self.output_queue.get()
            yield message
    
    async def cleanup(self):
        """Cleanup resources"""
        self.audio_buffer.clear()
        logger.info("✅ Pipeline cleanup complete")
