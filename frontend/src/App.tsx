import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { AdminDashboard } from './components/AdminDashboard'
import StudentPaymentPortal from './components/StudentPaymentPortal'

const AppContent: React.FC = () => {
  const { user, teacher, admin, loading } = useAuthContext()
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Student Payment Portal route - accessible without admin/teacher auth
  if (currentPath === '/payments' || currentPath === '/student-portal') {
    return <StudentPaymentPortal />
  }

  const roleKnown = admin !== null || teacher !== null

  // Show loading spinner while auth or role info is loading
  if (loading || (user && !roleKnown)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-800">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is not logged in, show login page
  if (!user) {
    return <Login />
  }

  // Show appropriate dashboard based on role
  if (admin) {
    return <AdminDashboard />
  }

  if (teacher) {
    return <Dashboard />
  }

  // If user is logged in but has no valid role
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
      <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this system. Please contact your administrator.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
