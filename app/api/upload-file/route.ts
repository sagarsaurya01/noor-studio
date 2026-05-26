import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as pdfParseModule from 'pdf-parse'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? pdfParseModule

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!type) return NextResponse.json({ error: 'No type provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (type === 'pdf') {
      const data = await pdfParse(buffer)
      const extractedText = data.text.replace(/\s{3,}/g, '\n\n').trim()
      return NextResponse.json({ transcript: extractedText, method: 'pdf-parse' })
    }

    if (type === 'video' || type === 'audio') {
      const ext = path.extname(file.name) || (type === 'audio' ? '.mp3' : '.mp4')
      const filePath = path.join(os.tmpdir(), `noor_upload_${Date.now()}${ext}`)
      fs.writeFileSync(filePath, buffer)

      const fileStream = fs.createReadStream(filePath)
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
      })

      try { fs.unlinkSync(filePath) } catch {}

      return NextResponse.json({ transcript: transcription.text, method: 'whisper-openai' })
    }

    return NextResponse.json({ error: 'Invalid type. Must be video, audio, or pdf' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
