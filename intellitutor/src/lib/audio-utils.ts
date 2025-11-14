/**
 * Shared audio utility functions for TTS processing
 */

/**
 * Parse audio parameters from MIME type string
 * Example: "audio/L16;rate=24000" -> { bitsPerSample: 16, rate: 24000 }
 */
export function parseAudioMimeType(mimeType: string): { bitsPerSample: number; rate: number } {
  let bitsPerSample = 16
  let rate = 24000

  const parts = mimeType.split(';')
  
  for (const param of parts) {
    const trimmed = param.trim()
    
    // Extract rate
    if (trimmed.toLowerCase().startsWith('rate=')) {
      const rateStr = trimmed.split('=')[1]
      const parsedRate = parseInt(rateStr, 10)
      if (!isNaN(parsedRate)) {
        rate = parsedRate
      }
    }
    
    // Extract bits per sample from format like "audio/L16"
    if (trimmed.startsWith('audio/L')) {
      const bitsStr = trimmed.split('L')[1]
      const parsedBits = parseInt(bitsStr, 10)
      if (!isNaN(parsedBits)) {
        bitsPerSample = parsedBits
      }
    }
  }

  return { bitsPerSample, rate }
}

/**
 * Convert PCM audio data to WAV format with proper headers
 */
export function convertPCMtoWAV(
  pcmData: Uint8Array,
  mimeType: string
): Uint8Array {
  const params = parseAudioMimeType(mimeType)
  const sampleRate = params.rate
  const bitsPerSample = params.bitsPerSample
  const numChannels = 1

  const dataSize = pcmData.length
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const chunkSize = 36 + dataSize

  // Create WAV header
  const header = new Uint8Array(44)
  const view = new DataView(header.buffer)

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, chunkSize, true)
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data sub-chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, dataSize, true)

  // Combine header and PCM data
  const wavData = new Uint8Array(44 + dataSize)
  wavData.set(header, 0)
  wavData.set(pcmData, 44)

  return wavData
}

/**
 * Create WAV file from PCM data with custom parameters
 * (Simplified version for when MIME type is not available)
 */
export function createWavFile(
  pcmData: Uint8Array,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): Uint8Array {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const dataSize = pcmData.length
  const headerSize = 44
  const fileSize = headerSize + dataSize - 8

  const wav = new Uint8Array(headerSize + dataSize)
  const view = new DataView(wav.buffer)

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, fileSize, true)
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data sub-chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, dataSize, true)

  // Copy PCM data
  wav.set(pcmData, headerSize)

  return wav
}
