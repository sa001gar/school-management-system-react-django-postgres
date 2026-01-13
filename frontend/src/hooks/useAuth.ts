import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../lib/authApi'
import { getAccessToken, clearTokens, setTokens } from '../lib/api'
import type { User, Teacher, Admin } from '../lib/types'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (!token) {
        setUser(null)
        setTeacher(null)
        setAdmin(null)
        setLoading(false)
        return
      }

      const response = await authApi.getCurrentUser()
      setUser(response.user)
      setTeacher(response.teacher)
      setAdmin(response.admin)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Clear tokens on auth error
      clearTokens()
      setUser(null)
      setTeacher(null)
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check for existing token and fetch user profile
    fetchUserProfile()

    // Set up periodic token validation (every 5 minutes)
    const validateSession = async () => {
      const token = getAccessToken()
      const refreshToken = localStorage.getItem('refresh_token')
      if (!token || !refreshToken) {
        setUser(null)
        setTeacher(null)
        setAdmin(null)
        return
      }

      try {
        // Try to refresh the token
        const newTokens = await authApi.refreshToken(refreshToken)
        setTokens(newTokens.access, newTokens.refresh || refreshToken)
      } catch (error) {
        console.error('Token refresh failed:', error)
        clearTokens()
        setUser(null)
        setTeacher(null)
        setAdmin(null)
      }
    }

    // Validate session every 5 minutes
    const sessionInterval = setInterval(validateSession, 5 * 60 * 1000)

    return () => {
      clearInterval(sessionInterval)
    }
  }, [fetchUserProfile])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)
      
      // Set tokens
      setTokens(response.access, response.refresh)
      
      // Set user state
      setUser(response.user)
      setTeacher(response.teacher)
      setAdmin(response.admin)
      
      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null)
      setTeacher(null)
      setAdmin(null)
      
      // Call logout API
      await authApi.logout()
      
      // Clear tokens
      clearTokens()
      
      return { error: null }
    } catch (error) {
      // Still clear tokens even if API call fails
      clearTokens()
      return { error }
    }
  }

  return {
    user,
    teacher,
    admin,
    loading,
    signIn,
    signOut,
    refetch: fetchUserProfile,
  }
}