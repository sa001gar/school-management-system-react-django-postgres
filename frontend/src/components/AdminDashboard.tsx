import React, { useState } from 'react'
import { 
  Settings, 
  LogOut, 
  Users, 
  BookOpen, 
  GraduationCap,
  Calendar,
  FileText,
  UserPlus,
  Plus,
  Menu,
  X,
  Cog,
  Lock,
  Clipboard,
  ArrowUpDown
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import { StudentsManagement } from './admin/StudentsManagement'
import { ClassesManagement } from './admin/ClassesManagement'
import { SectionsManagement } from './admin/SectionsManagement'
import { SubjectsManagement } from './admin/SubjectsManagement'
import { SessionsManagement } from './admin/SessionsManagement'
import { TeachersManagement } from './admin/TeachersManagement'
import { ResultsManagement } from './admin/ResultsManagement'
import { SchoolConfigManagement } from './admin/SchoolConfigManagement'
import { OptionalSubjectsManagement } from './admin/OptionalSubjectsManagement'
import StudentLifecycleManagement from './admin/StudentLifecycleManagement'
import TeacherAssignmentsManagement from './admin/TeacherAssignmentsManagement'
import SessionManagement from './admin/SessionManagement'

type ActiveTab = 'students' | 'classes' | 'sections' | 'subjects' | 'sessions' | 'teachers' | 'results' | 'config' | 'optionalSubjects' | 'enrollments' | 'teacherAssignments' | 'sessionLocking'

export const AdminDashboard: React.FC = () => {
  const { admin, signOut } = useAuthContext()
  const [activeTab, setActiveTab] = useState<ActiveTab>('students')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const tabs = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'enrollments', label: 'Enrollments', icon: ArrowUpDown },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'sections', label: 'Sections', icon: BookOpen },
    { id: 'subjects', label: 'Subjects', icon: FileText },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'sessionLocking', label: 'Session Lock', icon: Lock },
    { id: 'teachers', label: 'Teachers', icon: UserPlus },
    { id: 'teacherAssignments', label: 'Assignments', icon: Clipboard },
    { id: 'results', label: 'Results', icon: Settings },
    { id: 'config', label: 'School Config', icon: Cog },
    { id: 'optionalSubjects', label: 'Optional Subjects', icon: Plus }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-professional border-b-2 border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg border-2 border-amber-300">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-amber-900">Day Section</h1>
                <p className="text-sm text-amber-600">Result Management System</p>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop user info */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-900">{admin?.name}</p>
                  <p className="text-xs text-amber-600">{admin?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-amber-200 py-4">
              <div className="space-y-3">
                <div className="px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-900">{admin?.name}</p>
                  <p className="text-xs text-amber-600">{admin?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b-2 border-amber-200 transparent-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as ActiveTab)}
                className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-amber-500 hover:text-amber-700 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 thin-scrollbar">
        {activeTab === 'students' && <StudentsManagement />}
        {activeTab === 'enrollments' && <StudentLifecycleManagement />}
        {activeTab === 'classes' && <ClassesManagement />}
        {activeTab === 'sections' && <SectionsManagement />}
        {activeTab === 'subjects' && <SubjectsManagement />}
        {activeTab === 'sessions' && <SessionsManagement />}
        {activeTab === 'sessionLocking' && <SessionManagement />}
        {activeTab === 'teachers' && <TeachersManagement />}
        {activeTab === 'teacherAssignments' && <TeacherAssignmentsManagement />}
        {activeTab === 'results' && <ResultsManagement />}
        {activeTab === 'config' && <SchoolConfigManagement />}
        {activeTab === 'optionalSubjects' && <OptionalSubjectsManagement />}
      </main>
    </div>
  )
}