import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { audioPath } = await req.json()
    if (!audioPath) return NextResponse.json({ error: 'No audio path provided' }, { status: 400 })
    if (!fs.existsSync(audioPath)) return NextResponse.json({ error: 'Audio file not found' }, { status: 400 })

    const fileStream = fs.createReadStream(audioPath)
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    })

    // Cleanup audio file
    try { fs.unlinkSync(audioPath) } catch {}

    return NextResponse.json({ transcript: transcription.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
