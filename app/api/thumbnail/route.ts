import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { title, topic, angle, tone, platform, format_type } = await req.json() as {
    title: string
    topic: string
    angle: string
    tone: string
    platform?: string
    format_type?: 'vertical' | 'landscape'
  }

  const isVertical = format_type === 'vertical' || platform === 'instagram' || platform === 'youtube-shorts'
  const aspectLabel = isVertical ? '9:16 vertical (YouTube Shorts / Instagram Reel)' : '16:9 landscape (YouTube thumbnail)'

  // Step 1: Claude writes a punchy, high-CTR thumbnail prompt
  const promptRequest = `You are a top YouTube thumbnail designer who creates viral, scroll-stopping visuals.

Video Title: "${title}"
Topic: "${topic}"
Angle: "${angle}"
Tone: "${tone}"
Format: ${aspectLabel}

Rules:
- Think MrBeast, Ali Abdaal, MKBHD level thumbnails — bold, dramatic, impossible to ignore
- Use a strong VISUAL METAPHOR or unexpected concept — no boring stock photo scenes
- Cinematic lighting: one dramatic light source, deep shadows, vivid color contrast
- Single strong focal point — face with extreme emotion, a striking object, or a bold graphic element
- Colors must POP — oversaturated, high contrast, vibrant
- NO text, NO words, NO logos in the image
- Tone must match: ${tone}

Write a single punchy prompt of max 3 sentences. Return ONLY the prompt.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 250,
    system: 'You are a viral YouTube thumbnail art director. Write short, bold, visually explosive image prompts. Never generic. Return only the prompt.',
    messages: [{ role: 'user', content: promptRequest }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 })
  }

  const imagePrompt = content.text.trim()

  // Step 2: gpt-image-1 generates the thumbnail
  try {
    const size = isVertical ? '1024x1536' : '1536x1024'
    const image = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size,
    })

    const imageData = image.data[0]
    const image_url = imageData.url ?? `data:image/png;base64,${imageData.b64_json}`
    return NextResponse.json({ image_url, prompt: imagePrompt })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Thumbnail generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
