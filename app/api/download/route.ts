import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID. Please paste a valid YouTube URL.' }, { status: 400 })
    }

    // Use Supadata API — handles bot detection on their end, works for Shorts too
    const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true&lang=en`, {
      headers: {
        'x-api-key': process.env.SUPADATA_API_KEY ?? '',
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string }
      return NextResponse.json({
        error: err.message ?? 'Could not fetch transcript. Please upload the audio file using the Voice Note option instead.',
      }, { status: 422 })
    }

    const data = await res.json() as { content?: string; transcript?: string }
    const transcript = data.content ?? data.transcript ?? ''

    if (transcript.length > 50) {
      return NextResponse.json({ transcript, method: 'captions' })
    }

    return NextResponse.json({
      error: 'This video has no captions. Please upload the audio file using the "Voice Note" upload option instead.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
