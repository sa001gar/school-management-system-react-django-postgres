import React, { useState, useEffect } from 'react';
import { 
  teacherAssignmentsApi,
  classTeachersApi,
  sessionsApi, 
  classesApi, 
  sectionsApi,
  subjectsApi
} from '../../lib/coreApi';
import { teacherApi } from '../../lib/authApi';
import type { 
  TeacherAssignment, 
  ClassTeacher,
  Session, 
  Class, 
  Section,
  Subject,
  Teacher
} from '../../lib/types';

const TeacherAssignmentsManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'subject' | 'class'>('subject');

  // Filters
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Form state for new assignment
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    session_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsData, classesData, subjectsData, teachersData] = await Promise.all([
          sessionsApi.getAll(),
          classesApi.getAll(),
          subjectsApi.getAll(),
          teacherApi.getAll(),
        ]);
        setSessions(sessionsData);
        setClasses(classesData);
        setSubjects(subjectsData);
        setTeachers(teachersData);
        
        const activeSession = sessionsData.find((s: Session) => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession.id);
          setFormData(prev => ({ ...prev, session_id: activeSession.id }));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (formData.class_id) {
      sectionsApi.getByClass(formData.class_id).then(setSections);
    }
  }, [formData.class_id]);

  useEffect(() => {
    if (selectedSession) {
      fetchAssignments();
    }
  }, [selectedSession, activeTab]);

  const fetchAssignments = async () => {
    try {
      if (activeTab === 'subject') {
        const data = await teacherAssignmentsApi.getAll({ session_id: selectedSession });
        setAssignments(data);
      } else {
        const data = await classTeachersApi.getAll(selectedSession);
        setClassTeachers(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    }
  };

  const handleCreateAssignment = async () => {
    try {
      // Always use selectedSession for the session_id
      const assignmentData = {
        ...formData,
        session_id: selectedSession,
      };
      
      if (activeTab === 'subject') {
        await teacherAssignmentsApi.create(assignmentData);
      } else {
        await classTeachersApi.create({
          teacher_id: formData.teacher_id,
          class_id: formData.class_id,
          section_id: formData.section_id,
          session_id: selectedSession,
        });
      }
      setShowModal(false);
      setFormData(prev => ({ 
        ...prev, 
        teacher_id: '', 
        class_id: '', 
        section_id: '', 
        subject_id: '' 
      }));
      setSections([]); // Reset sections when closing modal
      fetchAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      if (activeTab === 'subject') {
        await teacherAssignmentsApi.delete(id);
      } else {
        await classTeachersApi.delete(id);
      }
      fetchAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete assignment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Assignments</h1>
          <p className="text-gray-600">Manage teacher-subject and class teacher assignments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Assignment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('subject')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'subject'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Subject Assignments
        </button>
        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'class'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Class Teachers
        </button>
      </div>

      {/* Session Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} {session.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {activeTab === 'subject' ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class & Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{assignment.teacher_name}</td>
                  <td className="px-6 py-4 text-gray-900">{assignment.subject_name}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {assignment.class_name} - {assignment.section_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {assignment.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No subject assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class & Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classTeachers.map((ct) => (
                <tr key={ct.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{ct.teacher_name}</td>
                  <td className="px-6 py-4 text-gray-900">
                    {ct.class_name} - {ct.section_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ct.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ct.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDeleteAssignment(ct.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {classTeachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No class teachers assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {activeTab === 'subject' ? 'Add Subject Assignment' : 'Add Class Teacher'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Session: <span className="font-medium text-amber-600">
                {sessions.find(s => s.id === selectedSession)?.name || 'Unknown'}
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher <span className="text-red-500">*</span></label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_id: e.target.value, section_id: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section <span className="text-red-500">*</span></label>
                <select
                  value={formData.section_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  disabled={!formData.class_id}
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
                {!formData.class_id && (
                  <p className="text-xs text-gray-400 mt-1">Select a class first</p>
                )}
              </div>
              {activeTab === 'subject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSections([]);
                  setFormData(prev => ({ ...prev, teacher_id: '', class_id: '', section_id: '', subject_id: '' }));
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={!formData.teacher_id || !formData.class_id || !formData.section_id || (activeTab === 'subject' && !formData.subject_id)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentsManagement;
