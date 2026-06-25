import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'



export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // Determine media type from file
    const mimeType = file.type || 'image/jpeg'
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const mediaType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: 'You are a poster/graphic design analyst. Analyze the image and return a JSON object describing it for recreation purposes.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Analyze this image/poster and return ONLY this JSON (no markdown):
{
  "hasPerson": true/false,
  "layout": "describe the layout — where is the person, text, background",
  "colors": "main colors used",
  "textContent": "all text visible in the image",
  "style": "design style — modern, minimal, bold, etc.",
  "mood": "mood/vibe of the poster",
  "summary": "2-3 sentence plain English description of what this poster is"
}`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let analysis: Record<string, unknown> = {}
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      analysis = match ? JSON.parse(match[0]) : {}
    } catch { analysis = {} }

    return NextResponse.json({ description: raw, analysis, method: 'claude-vision', base64, mediaType })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Image analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
