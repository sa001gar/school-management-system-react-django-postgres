import React, { useState, useEffect } from 'react';
import { 
  studentEnrollmentsApi, 
  sessionsApi, 
  classesApi, 
  sectionsApi 
} from '../../lib/coreApi';
import type { 
  StudentEnrollment, 
  Session, 
  Class, 
  Section,
  EnrollmentStatus 
} from '../../lib/types';

const StudentLifecycleManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus | ''>('');
  
  // Promotion Modal
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [promotionData, setPromotionData] = useState({
    new_session_id: '',
    new_class_id: '',
    new_section_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsData, classesData] = await Promise.all([
          sessionsApi.getAll(),
          classesApi.getAll(),
        ]);
        setSessions(sessionsData);
        setClasses(classesData);
        
        // Set active session as default
        const activeSession = sessionsData.find(s => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession.id);
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
    if (selectedClass) {
      sectionsApi.getByClass(selectedClass).then(setSections);
    } else {
      setSections([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSession) {
      fetchEnrollments();
    }
  }, [selectedSession, selectedClass, selectedSection, selectedStatus]);

  const fetchEnrollments = async () => {
    try {
      const params: any = { session_id: selectedSession };
      if (selectedClass) params.class_id = selectedClass;
      if (selectedSection) params.section_id = selectedSection;
      if (selectedStatus) params.status = selectedStatus;
      
      const data = await studentEnrollmentsApi.getAll(params);
      setEnrollments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load enrollments');
    }
  };

  const handleSelectAll = () => {
    if (selectedEnrollments.length === enrollments.filter(e => e.status === 'active').length) {
      setSelectedEnrollments([]);
    } else {
      setSelectedEnrollments(enrollments.filter(e => e.status === 'active').map(e => e.id));
    }
  };

  const handleSelectEnrollment = (id: string) => {
    setSelectedEnrollments(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleBulkPromote = async () => {
    if (!promotionData.new_session_id || !promotionData.new_class_id || !promotionData.new_section_id) {
      setError('Please select session, class, and section for promotion');
      return;
    }

    try {
      const promotions = selectedEnrollments.map((enrollmentId, index) => ({
        enrollment_id: enrollmentId,
        new_session_id: promotionData.new_session_id,
        new_class_id: promotionData.new_class_id,
        new_section_id: promotionData.new_section_id,
        new_roll_no: String(index + 1).padStart(2, '0'),
      }));

      await studentEnrollmentsApi.bulkPromote({ promotions });
      setShowPromotionModal(false);
      setSelectedEnrollments([]);
      fetchEnrollments();
    } catch (err: any) {
      setError(err.message || 'Failed to promote students');
    }
  };

  const handleTransfer = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to mark this student as transferred out?')) return;
    
    try {
      await studentEnrollmentsApi.transfer({ enrollment_id: enrollmentId });
      fetchEnrollments();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer student');
    }
  };

  const getStatusBadge = (status: EnrollmentStatus) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-700',
      promoted: 'bg-blue-100 text-blue-700',
      retained: 'bg-yellow-100 text-yellow-700',
      transferred: 'bg-red-100 text-red-700',
      graduated: 'bg-purple-100 text-purple-700',
      dropped: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Student Lifecycle Management</h1>
          <p className="text-gray-600">Manage student enrollments, promotions, and transfers</p>
        </div>
        {selectedEnrollments.length > 0 && (
          <button
            onClick={() => setShowPromotionModal(true)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Promote Selected ({selectedEnrollments.length})
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select Session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} {session.is_active ? '(Active)' : ''} {session.is_locked ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as EnrollmentStatus | '')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="promoted">Promoted</option>
              <option value="retained">Retained</option>
              <option value="transferred">Transferred</option>
              <option value="graduated">Graduated</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedEnrollments.length === enrollments.filter(e => e.status === 'active').length && enrollments.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roll No
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
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedEnrollments.includes(enrollment.id)}
                    onChange={() => handleSelectEnrollment(enrollment.id)}
                    disabled={enrollment.status !== 'active'}
                    className="rounded border-gray-300 disabled:opacity-50"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{enrollment.student_name}</div>
                  <div className="text-sm text-gray-500">{enrollment.student_permanent_id}</div>
                </td>
                <td className="px-6 py-4 text-gray-900">{enrollment.roll_no}</td>
                <td className="px-6 py-4 text-gray-900">
                  {enrollment.class_name} - {enrollment.section_name}
                </td>
                <td className="px-6 py-4">{getStatusBadge(enrollment.status)}</td>
                <td className="px-6 py-4">
                  {enrollment.status === 'active' && (
                    <button
                      onClick={() => handleTransfer(enrollment.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Transfer Out
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No enrollments found for the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Promotion Modal */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Promote {selectedEnrollments.length} Students
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Session</label>
                <select
                  value={promotionData.new_session_id}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, new_session_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Session</option>
                  {sessions.filter(s => !s.is_locked).map((session) => (
                    <option key={session.id} value={session.id}>{session.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Class</label>
                <select
                  value={promotionData.new_class_id}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, new_class_id: e.target.value, new_section_id: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Section</label>
                <select
                  value={promotionData.new_section_id}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, new_section_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  disabled={!promotionData.new_class_id}
                >
                  <option value="">Select Section</option>
                  {sections
                    .filter(s => s.class_id === promotionData.new_class_id)
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPromotionModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPromote}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Promote Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLifecycleManagement;
