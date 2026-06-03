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
      system: 'You are a content analyst. Analyze this image and describe what you see in detail — products, people, text, colors, context, mood. Write a detailed description that can be used to create a social media video script about this image.',
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
              text: 'Describe this image in detail for content creation purposes.',
            },
          ],
        },
      ],
    })

    const description = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ description, method: 'claude-vision' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Image analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
