import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { hashPassword, createToken, getUserByEmail } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password, full_name, national_id } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    const password_hash = await hashPassword(password)
    const sql = getDb()

    const rows = await sql`
      INSERT INTO users (email, password_hash, full_name, role, national_id)
      VALUES (${email}, ${password_hash}, ${full_name}, 'citizen', ${national_id || null})
      RETURNING id, email, full_name, role
    `

    const user = rows[0]

    const token = await createToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })

    const cookieStore = await cookies()
    cookieStore.set("deedguard-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
