import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects } from '@/lib/local-store'

export const dynamic = 'force-dynamic'


export async function GET() {
  const projects = getAllProjects()
  return NextResponse.json(projects)
}
