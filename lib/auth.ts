import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { getDb } from "./db"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "deedguard-secret-key-change-in-production"
)

export interface UserPayload {
  id: number
  email: string
  full_name: string
  role: "admin" | "citizen"
}

export async function createToken(user: UserPayload): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("deedguard-token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<UserPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireAdmin(): Promise<UserPayload> {
  const session = await requireAuth()
  if (session.role !== "admin") {
    throw new Error("Forbidden: Admin access required")
  }
  return session
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs")
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs")
  return bcrypt.compare(password, hash)
}

export async function getUserByEmail(email: string) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`
  return rows[0] || null
}
