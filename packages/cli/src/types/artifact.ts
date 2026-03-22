export type ArtifactType = 'mcp' | 'cli' | 'sdk' | 'api' | 'config' | 'skill'

export interface Artifact {
  readonly name: string
  readonly type: ArtifactType
  readonly source: string
  readonly writers: readonly string[]
  readonly version: string
  readonly hashSha256: string
}

export interface ArtifactConfig {
  readonly type: ArtifactType
  readonly version: string
  readonly source: string
  readonly config?: Readonly<Record<string, unknown>>
}

export interface StackJson {
  readonly version: string
  readonly handle?: string
  readonly claudeMd?: string
  readonly cursorRules?: string
  readonly tools: Readonly<Record<string, ArtifactConfig>>
}
