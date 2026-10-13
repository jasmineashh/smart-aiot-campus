
export interface CampusUser {
  id: string
  fullName: string
  universityId: string
  email: string | null
  department: string | null
  roles: string[]
}

interface LoginResponse {
  message: string
  user: CampusUser
}

interface CsrfResponse {
  requestToken: string
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      'Could not initialize secure authentication.'
    )
  }

  const data: CsrfResponse = await response.json()

  return data.requestToken
}

export async function login(
  universityIdOrEmail: string,
  password: string
): Promise<CampusUser> {
  const csrfToken = await getCsrfToken()

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',

    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
    },

    body: JSON.stringify({
      universityIdOrEmail,
      password,
    }),
  })

  if (response.status === 401) {
    throw new Error(
      'Invalid credentials or account unavailable.'
    )
  }

  if (response.status === 400) {
    throw new Error(
      'The login request could not be validated.'
    )
  }

  if (!response.ok) {
    throw new Error(
      'Login failed. Please try again.'
    )
  }

  const data: LoginResponse = await response.json()

  return data.user
}

export async function getCurrentUser():
  Promise<CampusUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      'Could not retrieve your university account.'
    )
  }

  return response.json() as Promise<CampusUser>
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken()

  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',

    headers: {
      'X-CSRF-TOKEN': csrfToken,
    },
  })

  if (!response.ok) {
    throw new Error('Logout failed. Please try again.')
  }
}
