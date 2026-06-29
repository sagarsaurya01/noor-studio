import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

  try {
    const { base64, mediaType, analysis, intent, userBrief } = await req.json() as {
      base64: string
      mediaType: string
      analysis: Record<string, unknown>
      intent: 'same-poster' | 'custom-brief'
      userBrief?: string
    }

    // Step 1: Claude writes the image generation prompt
    const briefText = intent === 'same-poster'
      ? `Recreate this poster with the exact same layout, colors, and design. Keep the person's face, eyes, nose, lips exactly as-is. Only enhance quality.`
      : `Recreate this poster with these changes: ${userBrief}. Keep the person's face, eyes, nose, lips exactly as-is — do not alter the person's appearance at all.`

    const promptMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a graphic design prompt writer for AI image generation.

Poster analysis:
- Layout: ${analysis.layout}
- Colors: ${analysis.colors}
- Text: ${analysis.textContent}
- Style: ${analysis.style}
- Mood: ${analysis.mood}

Task: ${briefText}

Write a single detailed image generation prompt (2-3 sentences) that will recreate this poster.
IMPORTANT: Always include "preserve the person's facial features exactly, photorealistic face unchanged" in the prompt.
Return only the prompt text, nothing else.`,
      }],
    })

    const imagePrompt = promptMsg.content[0].type === 'text' ? promptMsg.content[0].text.trim() : ''

    // Step 2: GPT Image generates the poster (generate, not edit — gpt-image-1 edit is unsupported)
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size: '1024x1024',
    })

    const imageData = response.data?.[0]
    if (!imageData) throw new Error('No image returned')

    const imageUrl = imageData.url ?? (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null)
    if (!imageUrl) throw new Error('No image URL returned')

    return NextResponse.json({ imageUrl, prompt: imagePrompt })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Poster recreation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
