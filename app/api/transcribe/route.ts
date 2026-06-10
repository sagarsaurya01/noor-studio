import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })
  try {
    const { audioPath } = await req.json()
    if (!audioPath) return NextResponse.json({ error: 'No audio path provided' }, { status: 400 })
    if (!fs.existsSync(audioPath)) return NextResponse.json({ error: 'Audio file not found' }, { status: 400 })

    const fileStream = fs.createReadStream(audioPath)
    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
    })

    // Cleanup audio file
    try { fs.unlinkSync(audioPath) } catch {}

    return NextResponse.json({ transcript: transcription.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
