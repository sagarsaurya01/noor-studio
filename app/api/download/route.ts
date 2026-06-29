import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function fetchSupadata(videoId: string, lang?: string): Promise<string | null> {
  const url = `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true${lang ? `&lang=${lang}` : ''}`
  const res = await fetch(url, { headers: { 'x-api-key': process.env.SUPADATA_API_KEY ?? '' } })
  if (!res.ok) return null
  const raw = await res.text()
  let data: { content?: string }
  try { data = JSON.parse(raw) } catch { return null }
  const text = data.content ?? ''
  return text.length > 50 ? text : null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID. Please paste a valid YouTube URL.' }, { status: 400 })
    }

    // Try English first
    let transcript = await fetchSupadata(videoId, 'en')

    // Fall back to any language, then translate with Claude
    if (!transcript) {
      const anyLang = await fetchSupadata(videoId)
      if (anyLang) {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Translate this transcript to English. Return only the translated text, nothing else:\n\n${anyLang.slice(0, 3000)}`,
          }],
        })
        const translated = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
        if (translated.length > 50) transcript = translated
      }
    }

    if (transcript) {
      return NextResponse.json({ transcript, method: 'captions' })
    }

    return NextResponse.json({
      error: 'This video has no captions available. Try: (1) Use a different YouTube video that has captions, or (2) Download the video and upload it using the "Video File" option.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
