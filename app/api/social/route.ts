import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { title, brief, scripts, platform } = await req.json()

    const selectedScript = scripts?.[0] ?? {}
    const platformName = platform || 'Instagram Reels'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a social media expert. Return only valid JSON. No markdown, no extra text.',
      messages: [{
        role: 'user',
        content: `Generate social media copy for this content piece on ${platformName}.

Title: ${title}
Topic: ${brief?.topic || ''}
Angle: ${brief?.angle || ''}
Hook: ${selectedScript.hook || ''}
Body: ${selectedScript.body || ''}

Return ONLY this JSON:
{"hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10","#tag11","#tag12","#tag13","#tag14","#tag15"],"caption":"Engaging post caption that draws people in and matches the hook/body. 2-4 sentences. Include 1-2 emojis naturally.","first_comment":"First comment with additional hashtags and a call to engagement. Include 10 more niche-specific hashtags."}`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Social copy generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
