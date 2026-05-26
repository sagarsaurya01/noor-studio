import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    has_key: !!process.env.ANTHROPIC_API_KEY,
    key_prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15) ?? 'NOT SET',
    cwd: process.cwd(),
  })
}
