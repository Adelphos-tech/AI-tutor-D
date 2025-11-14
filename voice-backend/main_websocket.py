"""
FastAPI Real-Time Voice Pipeline with Deepgram WebSocket
Ultra-low latency: Deepgram WS STT + Gemini Streaming + Deepgram TTS
"""

import asyncio
import os
import json
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions, SpeakOptions
import google.generativeai as genai
import aiohttp
import ssl
from dotenv import load_dotenv
import certifi

load_dotenv()

# Fix SSL certificate issues on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# Monkey-patch SSL for websockets
import websockets.client
original_connect = websockets.client.connect

def patched_connect(*args, **kwargs):
    if 'ssl' not in kwargs:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        kwargs['ssl'] = ssl_context
    return original_connect(*args, **kwargs)

websockets.client.connect = patched_connect

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

class VoicePipeline:
    def __init__(self, websocket: WebSocket, material_id: str = None):
        self.websocket = websocket
        self.material_id = material_id
        
        # Configure Deepgram client with keepalive
        config = DeepgramClientOptions(
            options={"keepalive": "true"}
        )
        self.deepgram_client = DeepgramClient(DEEPGRAM_API_KEY, config)
        self.dg_connection = None
        self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.is_ai_speaking = False
        self.interrupt_flag = False
        self.current_response_task = None
        self.last_processed_transcript = ""
        self.processing_lock = asyncio.Lock()
        
    async def start(self):
        """Initialize Deepgram WebSocket connection"""
        try:
            import sys
            print(f"🎙️ Starting pipeline for material: {self.material_id}", flush=True)
            sys.stdout.flush()
            print(f"🔑 API Key present: {bool(DEEPGRAM_API_KEY)}", flush=True)
            
            # Create Deepgram async live connection
            print("📡 Creating Deepgram connection...")
            self.dg_connection = self.deepgram_client.listen.asynclive.v("1")
            print(f"✅ Connection object created: {type(self.dg_connection)}")
            
            # Setup event handlers
            print("🎧 Setting up event handlers...")
            self.dg_connection.on(LiveTranscriptionEvents.Transcript, self.on_transcript)
            self.dg_connection.on(LiveTranscriptionEvents.Error, self.on_error)
            
            # Configure for raw PCM Int16 from browser
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                encoding="linear16",
                sample_rate=48000,
                channels=1,
                interim_results=True,
                punctuate=True,
                smart_format=True,
                endpointing=500  # ms of silence before finalizing
            )
            print(f"⚙️ Options configured: {options}")
            
            # Start connection (async)
            print("🚀 Starting Deepgram connection...")
            result = await self.dg_connection.start(options)
            print(f"📊 Start result: {result}")
            
            if not result:
                raise Exception("Failed to start Deepgram WebSocket")
            
            print("✅ Deepgram WebSocket connected")
            await self.websocket.send_json({"type": "status", "data": "connected"})
            
        except Exception as e:
            print(f"❌ Error starting pipeline: {e}")
            import traceback
            traceback.print_exc()
            await self.websocket.send_json({"type": "error", "data": str(e)})
            raise
    
    async def on_transcript(self, *args, **kwargs):
        """Handle real-time transcription from Deepgram"""
        result = kwargs.get("result")
        
        if not result:
            return
            
        transcript = result.channel.alternatives[0].transcript
        is_final = result.is_final
        
        if not transcript:
            return
        
        print(f"📝 Transcript ({'final' if is_final else 'interim'}): {transcript}")
        
        # Send transcript to client
        await self.websocket.send_json({
            "type": "transcript",
            "data": {
                "text": transcript,
                "is_final": is_final
            }
        })
        
        # Check for interruption
        if self.is_ai_speaking and len(transcript) > 3:
            print("🛑 User interrupted")
            self.interrupt_flag = True
            if self.current_response_task:
                self.current_response_task.cancel()
            self.is_ai_speaking = False
        
        # Process final transcripts (avoid duplicates)
        if is_final and len(transcript.strip()) > 0:
            # Prevent duplicate processing
            if transcript == self.last_processed_transcript:
                print(f"⏭️ Skipping duplicate transcript: {transcript}")
                return
            
            self.last_processed_transcript = transcript
            print(f"📝 Final transcript: {transcript}")
            self.current_response_task = asyncio.create_task(
                self.process_with_gemini(transcript)
            )
    
    async def on_error(self, *args, **kwargs):
        """Handle Deepgram errors"""
        error = kwargs.get("error")
        if error is None:
            return  # Ignore None errors
        print(f"❌ Deepgram error: {error}")
        # Notify client of error
        await self.websocket.send_json({
            "type": "error",
            "data": f"Speech recognition error: {error}"
        })
    
    async def search_documents(self, query: str) -> str:
        """Search for relevant document content (RAG)"""
        if not self.material_id:
            print(f"⚠️ search_documents called but material_id is None", flush=True)
            return ""
        
        try:
            print(f"🔍 Searching documents for query: '{query}' in material: {self.material_id}", flush=True)
            
            search_url = "http://localhost:3000/api/search-documents"
            print(f"📡 Sending request to: {search_url}", flush=True)
            
            # Use simple session without SSL overhead for localhost
            async with aiohttp.ClientSession() as session:
                async with session.post(search_url, json={
                    "query": query,
                    "materialId": self.material_id,
                    "topK": 3
                }) as response:
                    if response.status == 200:
                        result = await response.json()
                        results = result.get("results", [])
                        
                        context_parts = []
                        for item in results:
                            content = item.get("content", "")
                            if content:
                                context_parts.append(content)
                        
                        context = "\n\n".join(context_parts)
                        print(f"✅ Found {len(results)} chunks")
                        return context
                    else:
                        return ""
                        
        except Exception as e:
            print(f"❌ Search error: {e}")
            return ""
    
    async def process_with_gemini(self, text: str):
        """Process with Gemini and stream response"""
        try:
            self.is_ai_speaking = True
            self.interrupt_flag = False
            
            await self.websocket.send_json({"type": "status", "data": "generating"})
            
            # Send immediate acknowledgment filler
            import random
            fillers = [
                "Let me think about that...",
                "Just a moment...",
                "Let me check that for you...",
                "Hmm, interesting question...",
                "Good question, let me see..."
            ]
            filler = random.choice(fillers)
            
            # Send filler text immediately
            await self.websocket.send_json({
                "type": "text",
                "data": filler
            })
            
            # Generate quick filler TTS in background (non-blocking)
            asyncio.create_task(self._send_quick_filler_audio(filler))
            
            # Search for context in parallel with prompt building (timeout after 5s)
            context = ""
            if self.material_id:
                print(f"🔍 Starting RAG search for material: {self.material_id}", flush=True)
                try:
                    context = await asyncio.wait_for(
                        self.search_documents(text),
                        timeout=5.0  # Max 5 seconds for RAG
                    )
                    print(f"✅ RAG search returned {len(context)} characters", flush=True)
                except asyncio.TimeoutError:
                    print("⚠️ RAG search timed out, proceeding without context", flush=True)
                    context = ""
                except Exception as e:
                    print(f"❌ RAG search error: {e}", flush=True)
                    context = ""
            else:
                print(f"⚠️ No material_id provided, skipping RAG", flush=True)
            
            # Build prompt
            if context:
                prompt = f"""You are Alex, a helpful AI tutor. Respond naturally and conversationally.

Relevant context: {context[:500]}

Student: {text}

Keep response brief (2-3 sentences max)."""
            else:
                prompt = f"""You are Alex, a helpful AI tutor. Respond naturally and conversationally.

Student: {text}

Keep response brief (2-3 sentences max)."""
            
            # Stream response from Gemini
            response = await self.gemini_model.generate_content_async(
                prompt,
                stream=True
            )
            
            text_buffer = ""
            
            async for chunk in response:
                if self.interrupt_flag:
                    print("⚠️ Response interrupted")
                    break
                
                if chunk.text:
                    chunk_text = chunk.text
                    text_buffer += chunk_text
                    
                    # Send text chunk
                    await self.websocket.send_json({
                        "type": "text_chunk",
                        "data": chunk_text
                    })
                    
                    # Convert to speech every 8 words or at sentence end
                    word_count = len(text_buffer.split())
                    if word_count >= 8 or any(p in text_buffer for p in ['.', '!', '?']):
                        if not self.interrupt_flag:
                            await self.text_to_speech(text_buffer.strip())
                        text_buffer = ""
            
            # Convert remaining text
            if text_buffer.strip() and not self.interrupt_flag:
                await self.text_to_speech(text_buffer.strip())
            
            if not self.interrupt_flag:
                await self.websocket.send_json({"type": "status", "data": "complete"})
            
            self.is_ai_speaking = False
            
        except asyncio.CancelledError:
            print("⚠️ Task cancelled")
            self.is_ai_speaking = False
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            await self.websocket.send_json({"type": "error", "data": str(e)})
            self.is_ai_speaking = False
    
    async def _send_quick_filler_audio(self, text: str):
        """Send quick filler audio without waiting for main response"""
        try:
            await self.text_to_speech(text)
        except Exception as e:
            print(f"⚠️ Filler TTS error: {e}")
    
    async def text_to_speech(self, text: str):
        """Convert text to speech using Deepgram"""
        try:
            if self.interrupt_flag:
                return
            
            print(f"🔊 TTS: {text[:50]}...")
            
            await self.websocket.send_json({"type": "status", "data": "speaking"})
            
            options = SpeakOptions(
                model="aura-asteria-en",
                encoding="mp3"  # Use MP3 for browser compatibility
            )
            
            # Get audio from Deepgram using async HTTP (not blocking executor)
            import aiohttp
            tts_url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {"text": text}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(tts_url, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        print(f"❌ TTS API error: {resp.status}")
                        return
                    audio_data = await resp.read()
            
            if audio_data and not self.interrupt_flag:
                # Send in chunks
                chunk_size = 4096
                for i in range(0, len(audio_data), chunk_size):
                    if self.interrupt_flag:
                        break
                    chunk = audio_data[i:i+chunk_size]
                    audio_b64 = base64.b64encode(chunk).decode('utf-8')
                    await self.websocket.send_json({
                        "type": "audio",
                        "data": audio_b64
                    })
            
        except Exception as e:
            print(f"❌ TTS error: {e}")
    
    async def send_audio_to_deepgram(self, audio_data: bytes):
        """Forward audio from client to Deepgram WebSocket"""
        try:
            if self.dg_connection:
                await self.dg_connection.send(audio_data)
        except Exception as e:
            print(f"❌ Error sending audio: {e}")
            # Try to reconnect if connection is lost
            print("🔄 Attempting to reconnect to Deepgram...")
            try:
                await self.start()
            except Exception as reconnect_error:
                print(f"❌ Reconnection failed: {reconnect_error}")
                await self.websocket.send_json({
                    "type": "error",
                    "data": "Speech recognition connection lost. Please refresh and try again."
                })
    
    async def close(self):
        """Clean up connections"""
        try:
            if self.current_response_task:
                self.current_response_task.cancel()
            if self.dg_connection:
                await self.dg_connection.finish()
        except Exception as e:
            print(f"⚠️ Error during cleanup: {e}")
        print("🔌 Pipeline closed")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, material_id: str = None):
    await websocket.accept()
    print(f"🔗 Client connected (material: {material_id})", flush=True)
    import sys
    sys.stdout.flush()
    
    pipeline = VoicePipeline(websocket, material_id)
    print(f"🏗️ Pipeline created for material: {material_id}", flush=True)
    
    try:
        print(f"🚀 Starting pipeline...", flush=True)
        await pipeline.start()
        print(f"✅ Pipeline started successfully", flush=True)
        
        # Main loop - receive audio from client
        while True:
            try:
                data = await websocket.receive()
                
                if "bytes" in data:
                    # Audio data - forward to Deepgram
                    await pipeline.send_audio_to_deepgram(data["bytes"])
                
                elif "text" in data:
                    message = json.loads(data["text"])
                    if message.get("type") == "stop":
                        break
            
            except asyncio.CancelledError:
                print("⚠️ Connection cancelled")
                break
            except Exception as loop_error:
                error_msg = str(loop_error)
                print(f"❌ Error in receive loop: {error_msg}")
                # Break on disconnect errors
                if "disconnect" in error_msg.lower():
                    break
                await asyncio.sleep(0.1)
    
    except WebSocketDisconnect:
        print("🔌 Client disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await pipeline.close()


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
