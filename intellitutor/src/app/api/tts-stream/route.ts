import { NextRequest } from 'next/server'
import { generateStreamingSpeech } from '@/lib/gemini-streaming'

export const runtime = 'nodejs'

/**
 * Streaming TTS API endpoint
 * Returns audio chunks as they're generated for lower latency
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'PUCK' } = await request.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a ReadableStream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await generateStreamingSpeech({
            text,
            voice,
            onChunk: (audioChunk) => {
              // Send each chunk as it arrives
              // Encode as base64 for JSON transport
              const base64Chunk = Buffer.from(audioChunk).toString('base64')
              const data = JSON.stringify({ chunk: base64Chunk }) + '\n'
              controller.enqueue(new TextEncoder().encode(data))
            },
            onComplete: () => {
              // Send completion signal
              const data = JSON.stringify({ done: true }) + '\n'
              controller.enqueue(new TextEncoder().encode(data))
              controller.close()
            },
            onError: (error) => {
              const data = JSON.stringify({ error: error.message }) + '\n'
              controller.enqueue(new TextEncoder().encode(data))
              controller.close()
            }
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          const data = JSON.stringify({ error: message }) + '\n'
          controller.enqueue(new TextEncoder().encode(data))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('Streaming TTS API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
