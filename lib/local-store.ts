import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json')

export type Project = {
  id: string
  title: string
  input_type: 'topic' | 'video' | 'video-file' | 'image' | 'pdf'
  format_type?: 'vertical' | 'landscape'
  topic?: string
  video_url?: string
  transcript?: string
  brief: Record<string, string>
  scripts: Array<{ variation: number; hook: string; body: string; cta: string; intro?: string; sections?: Array<{ title: string; content: string }>; outro?: string }>
  storyboard: Array<{ scene: number; duration: string; visual: string; on_screen_text: string; broll_keyword: string; voiceover: string }>
  selected_script: number
  status: 'draft' | 'completed'
  created_at: string
  thumbnail_url?: string
  platform?: string
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]')
}

export function getAllProjects(): Project[] {
  ensureDataDir()
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

export function getProject(id: string): Project | null {
  return getAllProjects().find(p => p.id === id) ?? null
}

export function saveProject(project: Project): Project {
  ensureDataDir()
  const projects = getAllProjects()
  projects.unshift(project)
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2))
  return project
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  ensureDataDir()
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index === -1) return null
  projects[index] = { ...projects[index], ...updates }
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2))
  return projects[index]
}

export function deleteProject(id: string): boolean {
  ensureDataDir()
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index === -1) return false
  projects.splice(index, 1)
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2))
  return true
}
