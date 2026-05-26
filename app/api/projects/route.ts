import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects } from '@/lib/local-store'

export async function GET() {
  const projects = getAllProjects()
  return NextResponse.json(projects)
}
