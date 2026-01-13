import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Lock, Eye, EyeOff, AlertCircle, HelpCircle, Clock } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { AuthError } from '../lib/authApi'

interface LoginForm {
  email: string
  password: string
}

// Background Pattern Component 
const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear_gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
    <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#fbbf24,transparent)]"></div>
  </div>
)

export const Login: React.FC = () => {
  const { signIn, loading } = useAuthContext()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginForm>()

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            setError(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutSeconds])

  useEffect(() => {
    // Check if user was redirected due to session expiry
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('session_expired') === 'true') {
      setSessionExpired(true)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const formatLockoutTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const onSubmit = async (data: LoginForm) => {
    // Prevent double submission or submission during lockout
    if (isSubmitting || loading || lockoutSeconds > 0) return
    
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setSessionExpired(false)
    
    try {
      const { error: signInError } = await signIn(data.email, data.password)
      
      if (signInError) {
        // Handle AuthError with lockout info
        if (signInError instanceof AuthError && signInError.retryAfter) {
          setLockoutSeconds(signInError.retryAfter)
          setError(signInError.message)
        } else if (signInError.message?.includes('Invalid') || signInError.message?.includes('credentials')) {
          setError(signInError.message || 'Invalid email or password. Please check your credentials and try again.')
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.')
        } else if (signInError.message?.includes('Too many') || signInError.message?.includes('locked')) {
          setLockoutSeconds(300) // Default 5 minute lockout
          setError(signInError.message || 'Too many login attempts. Please wait and try again.')
        } else {
          setError(signInError.message || 'An error occurred during sign in. Please try again.')
        }
        setIsSubmitting(false)
      } else {
        setSuccess('Login successful! Loading your dashboard...')
        // Don't reset isSubmitting here - let the auth state change handle the redirect
        // The loading state from useAuth will handle the transition
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Login error:', err)
      setIsSubmitting(false)
    }
  }

  // Show loading state if auth is processing
  const showLoadingState = loading || isSubmitting
  const isLocked = lockoutSeconds > 0

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden p-4">
      <GridPattern />
      
      <div className="relative w-full max-w-4xl mx-auto rounded-xl shadow-professional-lg overflow-hidden md:flex border-2 border-amber-200">

        {/* --- Form Section --- */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 lg:p-8 bg-white/90 backdrop-blur-sm">
          <header className="text-center mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">Day Section</h1>
            <p className="text-sm sm:text-md text-gray-600 mt-1">Result Management System</p>
          </header>
          
          <div className="text-left mb-4 lg:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome Back!</h2>
            <p className="text-gray-500 mt-2 text-sm">Please enter your details to sign in.</p>
          </div>

          {/* Session Expired Warning */}
          {sessionExpired && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Session Expired</h3>
                  <p className="text-sm text-amber-700 mt-1">Your session has expired. Please sign in again to continue.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email'
                  }
                })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Email Address"
                disabled={showLoadingState}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Password"
                disabled={showLoadingState}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={showLoadingState}
              >
                {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
              </button>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <div className={`text-sm p-3 rounded-lg text-center transition-all border ${
                isLocked 
                  ? 'text-orange-700 bg-orange-50 border-orange-200' 
                  : 'text-red-600 bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {isLocked && <Clock className="h-4 w-4" />}
                  <span>{error}</span>
                </div>
                {isLocked && (
                  <div className="mt-2 font-medium">
                    Try again in: {formatLockoutTime(lockoutSeconds)}
                  </div>
                )}
              </div>
            )}
            
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg text-center transition-all border border-green-200">
                {success}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={showLoadingState || isLocked}
                className="w-full flex justify-center items-center py-3 px-4 border-2 border-transparent rounded-lg shadow-professional text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                {showLoadingState ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {success ? 'Loading Dashboard...' : 'Signing In...'}
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Forgot Password Notice */}
          <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">Forgot Password?</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Please contact your administrator for password reset assistance.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 lg:mt-6 text-center text-sm text-gray-600">
            Secure login powered by{' '}
            <a
              href="https://clustrix.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-600 hover:text-amber-500 hover:underline transition-colors"
            >
              Clustrix.tech
            </a>
          </p>

          
        </div>

        {/* --- Image Section --- */}
        <div className="hidden md:block md:w-1/2 relative">
          <img 
            src="/rms_login.avif"
            alt="School management system illustration"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
        
      </div>
    </div>
  )
}