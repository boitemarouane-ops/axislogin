// ============================================================
// AXIS SHIPPING LINE — User Management (localStorage)
// ============================================================

export type UserRole = 'Administrateur' | 'Manager' | 'Utilisateur'

export interface User {
  id: string
  email: string
  password: string // In production, this would be hashed
  firstName: string
  lastName: string
  role: UserRole
  phone: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  createdAt: string
  avatar?: string // base64 image
}

const KEY = 'axis_users'
const SESSION_KEY = 'axis_session'

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// Default admin user
export const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  email: 'm.errafii@axis-shipping.com',
  password: 'Lamaad2022', // In production, use proper hashing
  firstName: 'Mohammed',
  lastName: 'ERRAFII',
  role: 'Administrateur',
  phone: '+212 661-711416',
  address1: '29, Rue Med El Baamrani Res Sara 2',
  address2: 'Etg 2, N° 206',
  city: 'Casablanca',
  postalCode: '20250',
  country: 'Maroc',
  createdAt: new Date().toISOString(),
}

export function getUsers(): User[] {
  if (typeof window === 'undefined') return [DEFAULT_ADMIN]
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // Initialize with default admin
      const users = [DEFAULT_ADMIN]
      localStorage.setItem(KEY, JSON.stringify(users))
      return users
    }
    return JSON.parse(raw)
  } catch {
    return [DEFAULT_ADMIN]
  }
}

export function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(users))
  } catch { /* quota */ }
}

export function getUserById(id: string): User | null {
  return getUsers().find(u => u.id === id) || null
}

export function getUserByEmail(email: string): User | null {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export function updateUser(id: string, updates: Partial<User>): boolean {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return false
  users[idx] = { ...users[idx], ...updates }
  saveUsers(users)
  // If updating current user, update session
  const session = getCurrentSession()
  if (session && session.id === id) {
    setCurrentSession(users[idx])
  }
  return true
}

export function createUser(data: Omit<User, 'id' | 'createdAt'>): User {
  const user: User = {
    ...data,
    id: safeUUID(),
    createdAt: new Date().toISOString(),
  }
  const users = getUsers()
  users.push(user)
  saveUsers(users)
  return user
}

export function deleteUser(id: string): boolean {
  const users = getUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) return false
  saveUsers(filtered)
  return true
}

// Session management
export function getCurrentSession(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCurrentSession(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  } catch { /* quota */ }
}

export function login(email: string, password: string): User | null {
  const user = getUserByEmail(email)
  if (!user) return null
  // In production, use proper password hashing comparison
  if (user.password !== password) return null
  setCurrentSession(user)
  return user
}

export function logout(): void {
  setCurrentSession(null)
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
  const user = getUserById(userId)
  if (!user) return false
  // In production, use proper password hashing comparison
  if (user.password !== currentPassword) return false
  return updateUser(userId, { password: newPassword })
}

// Initialize default user if no users exist
if (typeof window !== 'undefined') {
  const users = getUsers()
  if (users.length === 0) {
    saveUsers([DEFAULT_ADMIN])
  }
}
