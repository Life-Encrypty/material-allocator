export type Role = 'admin' | 'editor'

export type User = { 
  id: string
  name: string
  role: Role 
}

export const USERS: User[] = [
  { id: 'admin', name: 'Admin', role: 'admin' },
  { id: 'u1', name: 'User 1', role: 'editor' },
  { id: 'u2', name: 'User 2', role: 'editor' }
]

const STORAGE_KEY = 'auth.currentUserId'

export function setCurrentUser(id: string): void {
  const user = USERS.find(u => u.id === id)
  if (user) {
    localStorage.setItem(STORAGE_KEY, id)
    // Dispatch custom event to notify components of user change
    window.dispatchEvent(new CustomEvent('userChanged', { detail: user }))
  }
}

export function getCurrentUser(): User {
  const storedId = localStorage.getItem(STORAGE_KEY)
  const user = USERS.find(u => u.id === storedId)
  return user || USERS[0] // Default to admin if not set
}

export function getCurrentUserId(): string {
  return getCurrentUser().id
}