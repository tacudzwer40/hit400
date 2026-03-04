"use client"

import useSWR from "swr"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

interface User {
  id: number
  email: string
  full_name: string
  role: "admin" | "citizen"
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Not authenticated")
    return res.json()
  })

export function useAuth() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR<{ user: User }>(
    "/api/auth/session",
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Login failed")
      await mutate({ user: json.user }, false)
      if (json.user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
      return json.user
    },
    [mutate, router]
  )

  const register = useCallback(
    async (data: {
      email: string
      password: string
      full_name: string
      national_id?: string
    }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Registration failed")
      await mutate({ user: json.user }, false)
      router.push("/dashboard")
      return json.user
    },
    [mutate, router]
  )

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    await mutate(undefined, false)
    router.push("/login")
  }, [mutate, router])

  return {
    user: data?.user ?? null,
    isLoading,
    isError: !!error,
    login,
    register,
    logout,
    mutate,
  }
}
