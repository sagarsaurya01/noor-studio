import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) return NextResponse.json({ error: 'No audio provided' }, { status: 400 })

    const arrayBuffer = await audio.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const audioPath = path.join(os.tmpdir(), `noor_voice_${Date.now()}.webm`)
    fs.writeFileSync(audioPath, buffer)

    const fileStream = fs.createReadStream(audioPath)
    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
    })

    try { fs.unlinkSync(audioPath) } catch {}

    return NextResponse.json({ transcript: transcription.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Voice transcription failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
