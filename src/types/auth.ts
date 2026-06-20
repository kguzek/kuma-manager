export type LoginCredentials = Record<string, { username: string; password: string }>

export type LoginFormValues = {
  single: boolean
  username: string
  password: string
  credentials: LoginCredentials
}
