export type LoginCredentials = Record<string, { username: string; password: string }>

export type LoginFormValues = {
  separate: boolean
  username: string
  password: string
  credentials: LoginCredentials
}
