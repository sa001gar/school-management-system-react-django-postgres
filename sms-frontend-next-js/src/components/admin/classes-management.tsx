/**
 * Classes Management Component
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { classesApi, sectionsApi } from '@/lib/api';
import type { Class, Section } from '@/types';
import { toast } from 'sonner';

export function ClassesManagement() {
  const queryClient = useQueryClient();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
  });

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', expandedClass],
    queryFn: () => sectionsApi.getByClass(expandedClass!),
    enabled: !!expandedClass,
  });

  const createMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Class created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create class');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Class> }) =>
      classesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsEditModalOpen(false);
      setSelectedClass(null);
      resetForm();
      toast.success('Class updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update class');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsDeleteModalOpen(false);
      setSelectedClass(null);
      toast.success('Class deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete class');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', level: 1 });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('Class name is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedClass) return;
    updateMutation.mutate({ id: selectedClass.id, data: formData });
  };

  const handleDelete = () => {
    if (!selectedClass) return;
    deleteMutation.mutate(selectedClass.id);
  };

  const openEditModal = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({ name: cls.name, level: cls.level });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (cls: Class) => {
    setSelectedClass(cls);
    setIsDeleteModalOpen(true);
  };

  const toggleExpand = (classId: string) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  const sortedClasses = [...(classes || [])].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage school classes and their configurations"
        icon={GraduationCap}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add Class
          </Button>
        }
      />

      {/* Classes Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </Card>
          ))}
        </div>
      ) : !sortedClasses.length ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={GraduationCap}
              title="No classes found"
              description="Create your first class to get started"
              action={{
                label: 'Add Class',
                onClick: () => setIsCreateModalOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClasses.map((cls) => (
            <Card
              key={cls.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => toggleExpand(cls.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">Level {cls.level}</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditModal(cls)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDeleteModal(cls)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {expandedClass === cls.id && sections && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Sections</p>
                    {sections.length ? (
                      <div className="flex flex-wrap gap-2">
                        {sections.map(section => (
                          <Badge key={section.id} variant="secondary">
                            {section.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No sections</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Class"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Class 1, Grade 5"
            required
          />
          <Input
            label="Level"
            type="number"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
            min={1}
            max={12}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={createMutation.isPending}>
            Create Class
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Class"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Level"
            type="number"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
            min={1}
            max={12}
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

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Class"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{selectedClass?.name}</strong>? This will also delete all associated sections and configurations.
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
