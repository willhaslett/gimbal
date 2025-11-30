export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

export interface ProjectsConfig {
  projects: Project[]
}
