/**
 * Students Management Component
 */
'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  Download,
  Upload,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { studentsApi, sessionsApi, classesApi, sectionsApi } from '@/lib/api';
import type { Student, Session, Class, Section } from '@/types';
import { toast } from 'sonner';

export function StudentsManagement() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [page, setPage] = useState(1);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    roll_no: '',
    class_id: '',
    section_id: '',
    session_id: '',
  });

  // Fetch data
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', selectedClass || formData.class_id],
    queryFn: () => sectionsApi.getByClass(selectedClass || formData.class_id),
    enabled: !!(selectedClass || formData.class_id),
  });

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', { session_id: selectedSession, class_id: selectedClass, section_id: selectedSection, search, page }],
    queryFn: () => studentsApi.getAll({
      session_id: selectedSession || undefined,
      class_id: selectedClass || undefined,
      section_id: selectedSection || undefined,
      search: search || undefined,
      page,
    }),
  });

  // Optimistic updates
  const [optimisticStudents, addOptimisticStudent] = useOptimistic(
    studentsData?.results || [],
    (state: Student[], newStudent: Student) => [...state, newStudent]
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => 
      studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      resetForm();
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete student');
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      name: '',
      roll_no: '',
      class_id: '',
      section_id: '',
      session_id: '',
    });
  };

  const handleCreate = () => {
    startTransition(() => {
      createMutation.mutate(formData);
    });
  };

  const handleUpdate = () => {
    if (!selectedStudent) return;
    startTransition(() => {
      updateMutation.mutate({ id: selectedStudent.id, data: formData });
    });
  };

  const handleDelete = () => {
    if (!selectedStudent) return;
    deleteMutation.mutate(selectedStudent.id);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      roll_no: student.roll_no,
      class_id: student.class_id || '',
      section_id: student.section_id || '',
      session_id: student.session_id || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  // Convert to select options
  const sessionOptions: SelectOption[] = (sessions || []).map(s => ({ value: s.id, label: s.name }));
  const classOptions: SelectOption[] = (classes || []).map(c => ({ value: c.id, label: c.name }));
  const sectionOptions: SelectOption[] = (sections || []).map(s => ({ value: s.id, label: s.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records"
        icon={Users}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add Student
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                options={sessionOptions}
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                placeholder="All Sessions"
                className="w-40"
              />
              <Select
                options={classOptions}
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                placeholder="All Classes"
                className="w-36"
              />
              <Select
                options={sectionOptions}
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                placeholder="All Sections"
                className="w-36"
                disabled={!selectedClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : !studentsData?.results?.length ? (
            <EmptyState
              icon={Users}
              title="No students found"
              description="Add your first student or adjust the filters"
              action={{
                label: 'Add Student',
                onClick: () => setIsCreateModalOpen(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.student_id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.roll_no}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {student.class_info?.name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.section_info?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(student)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDeleteModal(student)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {studentsData && studentsData.count > 20 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, studentsData.count)} of {studentsData.count}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!studentsData.next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Student"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Student ID"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            placeholder="Enter unique student ID"
            required
          />
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter student name"
            required
          />
          <Input
            label="Roll Number"
            value={formData.roll_no}
            onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
            placeholder="Enter roll number"
            required
          />
          <Select
            label="Session"
            options={sessionOptions}
            value={formData.session_id}
            onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
            placeholder="Select session"
          />
          <Select
            label="Class"
            options={classOptions}
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value, section_id: '' })}
            placeholder="Select class"
          />
          <Select
            label="Section"
            options={sectionOptions}
            value={formData.section_id}
            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
            placeholder="Select section"
            disabled={!formData.class_id}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={createMutation.isPending}>
            Create Student
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Student ID"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            disabled
          />
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Roll Number"
            value={formData.roll_no}
            onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
          />
          <Select
            label="Session"
            options={sessionOptions}
            value={formData.session_id}
            onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
          />
          <Select
            label="Class"
            options={classOptions}
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value, section_id: '' })}
          />
          <Select
            label="Section"
            options={sectionOptions}
            value={formData.section_id}
            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
            disabled={!formData.class_id}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} isLoading={updateMutation.isPending}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Student"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{selectedStudent?.name}</strong>? This action cannot be undone.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} isLoading={deleteMutation.isPending}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
