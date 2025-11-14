from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from deepgram import DeepgramClient, DeepgramClientOptions, LiveOptions
import google.generativeai as genai
import asyncio
import json
import os
import base64
from dotenv import load_dotenv
import aiohttp
from typing import Optional

load_dotenv()

# API Keys
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy"}


class VoiceSession:
    """Production-ready voice session with robust error handling"""
    
    def __init__(self, websocket: WebSocket, material_id: Optional[str] = None):
        self.websocket = websocket
        self.material_id = material_id
        self.is_active = True
        
        # Deepgram STT
        config = DeepgramClientOptions(options={"keepalive": "true"})
        self.dg_client = DeepgramClient(DEEPGRAM_API_KEY, config)
        self.dg_connection = None
        
        # Gemini LLM
        self.llm = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # State
        self.is_processing = False
        self.last_transcript = ""
        
    async def start(self):
        """Initialize Deepgram STT connection"""
        try:
            self.dg_connection = self.dg_client.listen.asynclive.v("1")
            
            # Event handlers with proper async callbacks
            @self.dg_connection.on("open")
            async def on_open(*args, **kwargs):
                print("🎙️ Deepgram STT connected")
            
            @self.dg_connection.on("transcript")
            async def on_transcript(*args, **kwargs):
                await self._on_transcript(*args, **kwargs)
            
            @self.dg_connection.on("error")
            async def on_error(*args, **kwargs):
                error = kwargs.get("error") or (args[1] if len(args) > 1 else None)
                if error and str(error) != "None":
                    print(f"⚠️ Deepgram error: {error}")
            
            @self.dg_connection.on("close")
            async def on_close(*args, **kwargs):
                print("🔌 Deepgram STT closed")
            
            # Start connection
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                encoding="linear16",
                sample_rate=48000,
                channels=1,
                interim_results=True,
                punctuate=True,
                smart_format=True,
                endpointing=500
            )
            
            result = await self.dg_connection.start(options)
            if not result:
                raise Exception("Failed to start Deepgram connection")
                
            print(f"✅ Session started (material: {self.material_id})")
            return True
            
        except Exception as e:
            print(f"❌ Session start error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def _on_transcript(self, *args, **kwargs):
        """Handle incoming transcripts"""
        try:
            result = kwargs.get("result") or (args[1] if len(args) > 1 else None)
            if not result:
                return
                
            transcript = result.channel.alternatives[0].transcript.strip()
            is_final = result.is_final
            
            if not transcript:
                return
            
            # Send interim transcripts to client
            if not is_final:
                await self.websocket.send_json({
                    "type": "transcript",
                    "data": transcript,
                    "is_final": False
                })
                return
            
            # Process final transcripts
            if transcript == self.last_transcript:
                return  # Skip duplicates
                
            self.last_transcript = transcript
            
            await self.websocket.send_json({
                "type": "transcript",
                "data": transcript,
                "is_final": True
            })
            
            # Process with LLM (non-blocking)
            if not self.is_processing:
                asyncio.create_task(self._process_with_llm(transcript))
                
        except Exception as e:
            print(f"❌ Transcript error: {e}")
    
    async def _process_with_llm(self, text: str):
        """Process transcript with RAG + LLM"""
        if self.is_processing:
            return
            
        self.is_processing = True
        
        try:
            # Send status
            await self.websocket.send_json({"type": "status", "data": "generating"})
            
            # Quick filler
            filler = "Let me check that for you..."
            await self.websocket.send_json({"type": "text", "data": filler})
            asyncio.create_task(self._stream_tts(filler))
            
            # RAG search
            context = ""
            if self.material_id:
                try:
                    context = await asyncio.wait_for(
                        self._search_rag(text),
                        timeout=5.0
                    )
                    if context:
                        print(f"✅ RAG: {len(context)} chars")
                except Exception as e:
                    print(f"⚠️ RAG failed: {e}")
            
            # Generate LLM response
            prompt = self._build_prompt(text, context)
            
            response = await asyncio.to_thread(
                self.llm.generate_content,
                prompt
            )
            
            answer = response.text.strip()
            
            # Stream TTS response
            await self.websocket.send_json({"type": "text", "data": answer})
            await self._stream_tts(answer)
            
        except Exception as e:
            print(f"❌ LLM error: {e}")
            error_msg = "I'm having trouble processing that. Can you try again?"
            await self.websocket.send_json({"type": "text", "data": error_msg})
            await self._stream_tts(error_msg)
        finally:
            self.is_processing = False
            await self.websocket.send_json({"type": "status", "data": "listening"})
    
    def _build_prompt(self, query: str, context: str) -> str:
        """Build RAG-enhanced prompt"""
        if context:
            return f"""You are Alex, an AI tutor helping students understand their study materials.

Context from the student's material:
{context}

Student's question: {query}

Provide a clear, concise answer based on the context. Keep it conversational and under 3 sentences."""
        else:
            return f"""You are Alex, an AI tutor. The student asked: "{query}"

Provide a brief, helpful response. Keep it under 2 sentences."""
    
    async def _search_rag(self, query: str) -> str:
        """Search documents using RAG"""
        if not self.material_id:
            return ""
        
        try:
            url = "http://localhost:3000/api/search-documents"
            payload = {
                "query": query,
                "materialId": self.material_id,
                "topK": 3
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        chunks = data.get("results", [])
                        return "\n\n".join([c["content"] for c in chunks])
            return ""
        except Exception as e:
            print(f"❌ RAG search error: {e}")
            return ""
    
    async def _stream_tts(self, text: str):
        """Stream TTS audio to client"""
        try:
            await self.websocket.send_json({"type": "status", "data": "speaking"})
            
            url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3"
            headers = {
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json={"text": text}) as resp:
                    if resp.status == 200:
                        audio_data = await resp.read()
                        
                        # Send in chunks
                        chunk_size = 4096
                        for i in range(0, len(audio_data), chunk_size):
                            chunk = audio_data[i:i+chunk_size]
                            encoded = base64.b64encode(chunk).decode('utf-8')
                            await self.websocket.send_json({
                                "type": "audio",
                                "data": encoded
                            })
                        
                        # Signal completion
                        await self.websocket.send_json({"type": "status", "data": "complete"})
                        
        except Exception as e:
            print(f"❌ TTS error: {e}")
    
    async def send_audio(self, audio_bytes: bytes):
        """Forward audio to Deepgram STT"""
        if self.dg_connection and self.is_active:
            try:
                await self.dg_connection.send(audio_bytes)
            except Exception as e:
                print(f"❌ Audio send error: {e}")
    
    async def close(self):
        """Clean shutdown"""
        self.is_active = False
        if self.dg_connection:
            try:
                await self.dg_connection.finish()
            except:
                pass
        print("✅ Session closed")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, material_id: Optional[str] = None):
    """Main WebSocket endpoint with robust error handling"""
    await websocket.accept()
    session = VoiceSession(websocket, material_id)
    
    try:
        # Start session
        if not await session.start():
            await websocket.close(code=1011, reason="Failed to initialize")
            return
        
        # Main loop: receive audio from client
        while session.is_active:
            try:
                message = await websocket.receive()
                
                if "bytes" in message:
                    # Audio data
                    await session.send_audio(message["bytes"])
                    
                elif "text" in message:
                    # Control messages
                    data = json.loads(message["text"])
                    if data.get("type") == "stop":
                        break
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"❌ Receive error: {e}")
                break
    
    finally:
        await session.close()
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
