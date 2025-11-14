import StreamingTTSTest from '@/components/StreamingTTSTest'

export default function TestStreamingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Streaming TTS Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the new streaming text-to-speech implementation
        </p>
      </div>
      
      <StreamingTTSTest />
      
      <div className="mt-8 max-w-2xl mx-auto p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <h2 className="font-bold text-lg mb-3">📊 Expected Results</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400">✅</span>
            <div>
              <strong>Time to first chunk: 500-1000ms</strong>
              <p className="text-gray-600 dark:text-gray-400">
                Audio should start playing within 1 second
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400">✅</span>
            <div>
              <strong>Multiple chunks received</strong>
              <p className="text-gray-600 dark:text-gray-400">
                Should receive 3-10 chunks depending on text length
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400">✅</span>
            <div>
              <strong>Progressive playback</strong>
              <p className="text-gray-600 dark:text-gray-400">
                Audio starts before full generation completes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-2xl mx-auto p-6 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <h2 className="font-bold text-lg mb-3">⚠️ Troubleshooting</h2>
        <div className="space-y-2 text-sm">
          <p><strong>If you see errors:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Check that GEMINI_API_KEY is set in .env</li>
            <li>Verify the API key has TTS permissions</li>
            <li>Check browser console for detailed errors</li>
            <li>Ensure you haven't hit the daily quota limit</li>
          </ul>
          <p className="mt-3"><strong>If latency is high (&gt;2s):</strong></p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>Check your internet connection</li>
            <li>Try shorter test phrases</li>
            <li>Consider using Fast Voices instead</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
