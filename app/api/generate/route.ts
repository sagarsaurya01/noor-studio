import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { saveProject, updateProject } from '@/lib/local-store'
import { randomUUID } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  'Instagram Reels': 'Platform: Instagram Reels. Hook must be ≤15 words — punchy, visual, emotionally immediate. Script length: 30–60 seconds. Prioritise visual storytelling and fast cuts.',
  'YouTube Shorts': 'Platform: YouTube Shorts. Hook should be a compelling question or a shocking stat. Script length: 45–60 seconds. Keep energy high throughout.',
  'TikTok': 'Platform: TikTok. Ultra-casual tone, trend-aware language, native TikTok slang is fine. Script length: ≤30 seconds. Jump straight into the action — no warm-up.',
  'LinkedIn': 'Platform: LinkedIn. Professional, insight-driven tone. Lead with a strong opinion or counterintuitive fact. Script length: 60–90 seconds. End with a thought-provoking question or clear takeaway.',
}

const LANDSCAPE_PLATFORM_INSTRUCTIONS: Record<string, string> = {
  'YouTube (Long-form)': 'Platform: YouTube Long-form. Script length: 3-5 minutes. Structure: Hook (0-15s) + Intro (15-45s) + 3 main sections with subsections + Summary + CTA. Educational, engaging, detailed. Include timestamps suggestions.',
  'LinkedIn Video': 'Platform: LinkedIn Video. Script length: 2-3 minutes. Professional thought leadership tone. Structure: Strong opening statement + 3 key insights + actionable takeaway + CTA to connect/follow.',
  'Facebook Video': 'Platform: Facebook Video. Script length: 2-4 minutes. Conversational, community-focused. Structure: Hook + Story + Value + CTA to share/comment.',
  'Webinar': 'Platform: Webinar/presentation. Script length: 5-10 minutes. Educational deep-dive. Structure: Introduction + Agenda + Main content (3-5 sections) + Q&A prompt + Closing.',
}

async function generateBriefAndScripts(
  input: string,
  inputType: 'topic' | 'transcript',
  platform?: string,
  tone_override?: string,
  angle_hint?: string,
  format_type?: 'vertical' | 'landscape',
) {
  const isLandscape = format_type === 'landscape'
  const platformInstruction = isLandscape
    ? (platform ? (LANDSCAPE_PLATFORM_INSTRUCTIONS[platform] || '') : LANDSCAPE_PLATFORM_INSTRUCTIONS['YouTube (Long-form)'])
    : (platform ? (PLATFORM_INSTRUCTIONS[platform] || '') : PLATFORM_INSTRUCTIONS['Instagram Reels'])

  let userPrompt = inputType === 'topic'
    ? `Create a content brief and 3 script variations for this topic: "${input}"`
    : `Analyse this transcript and create a content brief and 3 NEW script variations (fresh angle, not a copy):\n\n${input}`

  if (tone_override || angle_hint) {
    const extras: string[] = []
    if (tone_override) extras.push(`Use tone: ${tone_override}`)
    if (angle_hint) extras.push(`Angle hint: ${angle_hint}`)
    userPrompt += `\n\n${extras.join('. ')}.`
  }

  const scriptJsonSchema = isLandscape
    ? `[{"variation":1,"intro":"opening paragraph","sections":[{"title":"section title","content":"section content"}],"outro":"closing paragraph","cta":"call to action"},{"variation":2,"intro":"opening paragraph","sections":[{"title":"section title","content":"section content"}],"outro":"closing paragraph","cta":"call to action"},{"variation":3,"intro":"opening paragraph","sections":[{"title":"section title","content":"section content"}],"outro":"closing paragraph","cta":"call to action"}]`
    : `[{"variation":1,"hook":"max 2 sentences","body":"max 3 sentences","cta":"1 sentence"},{"variation":2,"hook":"max 2 sentences","body":"max 3 sentences","cta":"1 sentence"},{"variation":3,"hook":"max 2 sentences","body":"max 3 sentences","cta":"1 sentence"}]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: `You are Noor Studio's AI content engine. You produce ${isLandscape ? 'long-form landscape video' : 'viral short-form social media'} scripts. ${platformInstruction} IMPORTANT: Always respond with valid JSON only. No extra text before or after.`,
    messages: [{
      role: 'user',
      content: `${userPrompt}

Return ONLY this JSON (no markdown, no extra text):
{"title":"short title max 6 words","brief":{"topic":"1 sentence","angle":"1 sentence","tone":"educational","target_audience":"1 sentence","hook_type":"shock stat"},"scripts":${scriptJsonSchema}}`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function generateLandscapeStoryboard(script: { intro: string; sections: Array<{ title: string; content: string }>; outro: string; cta: string }, title: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: 'You are a storyboard generator for long-form landscape videos. Respond with valid JSON only. No extra text. Keep each field under 20 words.',
    messages: [{
      role: 'user',
      content: `Create a 10-12 scene storyboard for this long-form video. Title: "${title}"
Intro: ${script.intro}
Sections: ${script.sections.map(s => `${s.title}: ${s.content}`).join('\n')}
Outro: ${script.outro}
CTA: ${script.cta}

Return ONLY this JSON:
{"scenes":[{"scene":1,"duration":"15s","visual":"short description","on_screen_text":"short text","broll_keyword":"keyword","voiceover":"short line"}]}`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function generateStoryboard(script: { hook: string; body: string; cta: string }, title: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'You are a storyboard generator. Respond with valid JSON only. No extra text. Keep each field under 15 words.',
    messages: [{
      role: 'user',
      content: `Create a 6-scene storyboard for this script. Title: "${title}"
Hook: ${script.hook}
Body: ${script.body}
CTA: ${script.cta}

Return ONLY this JSON:
{"scenes":[{"scene":1,"duration":"3s","visual":"short description","on_screen_text":"short text","broll_keyword":"keyword","voiceover":"short line"}]}`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, topic, transcript, videoUrl, platform, tone_override, angle_hint, project_id, format_type, input_type } = body

    const input = mode === 'topic' ? topic : transcript
    if (!input) return NextResponse.json({ error: 'No input provided' }, { status: 400 })

    const isLandscape = format_type === 'landscape'
    const content = await generateBriefAndScripts(input, mode === 'topic' ? 'topic' : 'transcript', platform, tone_override, angle_hint, format_type)

    const storyboard = isLandscape
      ? await generateLandscapeStoryboard(content.scripts[0], content.title)
      : await generateStoryboard(content.scripts[0], content.title)

    // Pick the best keyword for thumbnail: first broll_keyword, then topic title words
    const thumbKeyword = storyboard.scenes?.[0]?.broll_keyword
      || content.title.split(' ').slice(0, 3).join(' ')
    const thumbnail_url = `https://source.unsplash.com/800x450/?${encodeURIComponent(thumbKeyword)}`

    // If project_id provided, update existing project instead of creating new
    if (project_id) {
      const updated = updateProject(project_id, {
        scripts: content.scripts,
        storyboard: storyboard.scenes,
        brief: content.brief,
        title: content.title,
        thumbnail_url,
        format_type: format_type || 'vertical',
      })
      if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      return NextResponse.json({ projectId: project_id })
    }

    // Resolve effective input_type: new modes pass it explicitly; legacy modes use mode
    const effectiveInputType = input_type || mode

    const defaultPlatform = isLandscape ? 'YouTube (Long-form)' : 'Instagram Reels'

    const project = saveProject({
      id: randomUUID(),
      title: content.title,
      input_type: effectiveInputType,
      format_type: format_type || 'vertical',
      video_url: videoUrl || undefined,
      transcript: transcript || undefined,
      topic: topic || undefined,
      brief: content.brief,
      scripts: content.scripts,
      storyboard: storyboard.scenes,
      selected_script: 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      thumbnail_url,
      platform: platform || defaultPlatform,
    })

    return NextResponse.json({ projectId: project.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
