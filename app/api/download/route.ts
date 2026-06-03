import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'


const execAsync = promisify(exec)

function parseCaptions(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8')
  const blocks = content.split(/\n\s*\n/)
  const lines: string[] = []

  for (const block of blocks) {
    const blockLines = block.trim().split('\n')

    // Skip header/meta blocks
    if (
      blockLines[0].startsWith('WEBVTT') ||
      blockLines[0].startsWith('Kind:') ||
      blockLines[0].startsWith('Language:') ||
      blockLines[0].startsWith('NOTE') ||
      blockLines[0].startsWith('X-TIMESTAMP')
    ) continue

    // Skip blocks without a timestamp
    if (!blockLines.some(l => /-->/.test(l))) continue

    for (const line of blockLines) {
      if (/-->/.test(line)) continue           // skip timestamp lines
      if (/^\s*\d+\s*$/.test(line)) continue  // skip sequence numbers
      if (!line.trim()) continue               // skip empty lines

      const cleaned = line
        .replace(/<[^>]+>/g, '')              // remove <c>, <b> etc
        .replace(/\[.*?\]/gi, '')             // remove [music], [applause]
        .replace(/\(.*?\)/gi, '')             // remove (music)
        .trim()

      if (cleaned.length > 1) lines.push(cleaned)
    }
  }

  // Remove consecutive duplicate lines (YouTube overlapping windows)
  const deduped: string[] = []
  for (const line of lines) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
      deduped.push(line)
    }
  }

  // Join into full text
  const joined = deduped.join(' ').replace(/\s{2,}/g, ' ').trim()

  // Remove repeated word sequences (YouTube triples lines in auto-captions)
  // Split into sentences and deduplicate
  const sentences = joined.split(/(?<=[.!?])\s+/)
  const dedupedSentences: string[] = []
  for (const s of sentences) {
    if (dedupedSentences.length === 0 || dedupedSentences[dedupedSentences.length - 1] !== s) {
      dedupedSentences.push(s)
    }
  }

  // Final pass: remove duplicate word chunks of 5+ words
  const words = dedupedSentences.join(' ').split(' ')
  const result: string[] = []
  let i = 0
  while (i < words.length) {
    const chunkSize = 5
    if (i + chunkSize * 2 <= words.length) {
      const chunk1 = words.slice(i, i + chunkSize).join(' ').toLowerCase()
      const chunk2 = words.slice(i + chunkSize, i + chunkSize * 2).join(' ').toLowerCase()
      if (chunk1 === chunk2) {
        result.push(...words.slice(i, i + chunkSize))
        i += chunkSize * 2
        continue
      }
    }
    result.push(words[i])
    i++
  }

  return result.join(' ').replace(/\s{2,}/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const outputDir = os.tmpdir()
    const outputBase = path.join(outputDir, `noor_caps_${Date.now()}`)

    // --- Step 1: Try auto-captions first (fast, zero memory) ---
    try {
      await execAsync(
        `yt-dlp --write-auto-sub --skip-download --sub-lang en --convert-subs vtt -o "${outputBase}" "${url}"`,
        { timeout: 30000 }
      )

      const capFiles = fs.readdirSync(outputDir).filter(f =>
        f.startsWith('noor_caps_') && (f.endsWith('.vtt') || f.endsWith('.srt'))
      )

      if (capFiles.length > 0) {
        const capPath = path.join(outputDir, capFiles[capFiles.length - 1])
        const transcript = parseCaptions(capPath)
        try { fs.unlinkSync(capPath) } catch {}

        const wordCount = transcript.split(' ').filter(Boolean).length
        if (wordCount >= 150) {
          return NextResponse.json({ transcript, method: 'captions' })
        }
        // Too short — captions are incomplete, fall through to Whisper
      }
    } catch {
      // captions not available — fall through to Whisper
    }

    // --- Step 2: Fall back to audio download + Whisper ---
    const audioTemplate = path.join(outputDir, `noor_audio_${Date.now()}.%(ext)s`)

    await execAsync(
      `yt-dlp -x --audio-format mp3 --audio-quality 5 -o "${audioTemplate}" "${url}"`,
      { timeout: 120000 }
    )

    const mp3Files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('noor_audio_') && f.endsWith('.mp3'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(outputDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (mp3Files.length === 0) {
      return NextResponse.json({ error: 'Could not download video audio' }, { status: 500 })
    }

    const audioPath = path.join(outputDir, mp3Files[0].name)
    return NextResponse.json({ audioPath, method: 'whisper' })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
