/**
 * Unified Classes & Sections Management Component
 * Rock solid UI for managing classes and their sections together
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import { classesApi, sectionsApi, teacherAssignmentsApi } from "@/lib/api";
import type { Class, Section } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassWithSections extends Class {
  sections?: Section[];
}

export function ClassesManagement() {
  const queryClient = useQueryClient();

  // UI State
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set()
  );
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isDeleteSectionModalOpen, setIsDeleteSectionModalOpen] =
    useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedClassForSection, setSelectedClassForSection] =
    useState<Class | null>(null);
  const [selectedSectionToDelete, setSelectedSectionToDelete] =
    useState<Section | null>(null);

  // Form state
  const [classForm, setClassForm] = useState({ name: "", level: 1 });
  const [sectionForm, setSectionForm] = useState({ name: "" });

  // Queries
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
    staleTime: 0, // Always refetch on invalidation
  });

  const { data: allSections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: () => sectionsApi.getAll(),
    staleTime: 0, // Always refetch on invalidation
  });

  // Group sections by class
  const classesWithSections: ClassWithSections[] = (classes || [])
    .map((cls) => ({
      ...cls,
      sections: (allSections || []).filter((s) => s.class_id === cls.id),
    }))
    .sort((a, b) => a.level - b.level);

  // Fetch Teacher Assignments to show details
  const { data: assignments } = useQuery({
    queryKey: ["teacher-assignments"],
    queryFn: () => teacherAssignmentsApi.getAll(),
  });

  // Class Mutations
  const createClassMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsClassModalOpen(false);
      setClassForm({ name: "", level: 1 });
      toast.success("Class created successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create class"),
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Class> }) =>
      classesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsClassModalOpen(false);
      setEditingClass(null);
      setClassForm({ name: "", level: 1 });
      toast.success("Class updated successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update class"),
  });

  const deleteClassMutation = useMutation({
    mutationFn: classesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setIsDeleteClassModalOpen(false);
      setEditingClass(null);
      toast.success("Class deleted successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete class"),
  });

  // Section Mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: { name: string; class_id: string }) =>
      sectionsApi.create(data),
    onSuccess: () => {
      // Force immediate refetch instead of just invalidating
      queryClient.refetchQueries({ queryKey: ["sections"] });
      setIsSectionModalOpen(false);
      setSectionForm({ name: "" });
      setSelectedClassForSection(null);
      toast.success("Section created successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create section"),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Section> }) =>
      sectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["sections"] });
      setIsSectionModalOpen(false);
      setEditingSection(null);
      setSectionForm({ name: "" });
      toast.success("Section updated successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update section"),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: sectionsApi.delete,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["sections"] });
      setIsDeleteSectionModalOpen(false);
      setSelectedSectionToDelete(null);
      toast.success("Section deleted successfully");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete section"),
  });

  // Handlers
  const toggleExpand = (classId: string) => {
    const next = new Set(expandedClasses);
    if (next.has(classId)) {
      next.delete(classId);
    } else {
      next.add(classId);
    }
    setExpandedClasses(next);
  };

  const expandAll = () => {
    setExpandedClasses(new Set(classes?.map((c) => c.id) || []));
  };

  const collapseAll = () => {
    setExpandedClasses(new Set());
  };

  const openAddClass = () => {
    setEditingClass(null);
    setClassForm({ name: "", level: (classes?.length || 0) + 1 });
    setIsClassModalOpen(true);
  };

  const openEditClass = (cls: Class) => {
    setEditingClass(cls);
    setClassForm({ name: cls.name, level: cls.level });
    setIsClassModalOpen(true);
  };

  const openDeleteClass = (cls: Class) => {
    setEditingClass(cls);
    setIsDeleteClassModalOpen(true);
  };

  const openAddSection = (cls: Class) => {
    setEditingSection(null);
    setSelectedClassForSection(cls);
    setSectionForm({ name: "" });
    setIsSectionModalOpen(true);
  };

  const openEditSection = (section: Section, cls: Class) => {
    setEditingSection(section);
    setSelectedClassForSection(cls);
    setSectionForm({ name: section.name });
    setIsSectionModalOpen(true);
  };

  const openDeleteSection = (section: Section) => {
    setSelectedSectionToDelete(section);
    setIsDeleteSectionModalOpen(true);
  };

  const handleSaveClass = () => {
    if (!classForm.name.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, data: classForm });
    } else {
      createClassMutation.mutate(classForm);
    }
  };

  const handleSaveSection = () => {
    if (!sectionForm.name.trim()) {
      toast.error("Section name is required");
      return;
    }
    if (editingSection) {
      updateSectionMutation.mutate({
        id: editingSection.id,
        data: sectionForm,
      });
    } else if (selectedClassForSection) {
      createSectionMutation.mutate({
        name: sectionForm.name,
        class_id: selectedClassForSection.id,
      });
    }
  };

  const isLoading = classesLoading || sectionsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Sections"
        description="Manage school classes and their sections in one place"
        icon={GraduationCap}
        actions={
          <div className="flex gap-2">
            {classesWithSections.length > 0 && (
              <div className="hidden sm:flex gap-1 mr-2">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            )}
            <Button
              onClick={openAddClass}
              leftIcon={<Plus className="h-4 w-4" />}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Add Class
            </Button>
          </div>
        }
      />

      {/* Stats Bar */}
      {!isLoading && classesWithSections.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border-amber-200 bg-linear-to-br from-amber-50 to-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <LayoutGrid className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-800">
                  {classesWithSections.length}
                </p>
                <p className="text-xs text-amber-600">Total Classes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-linear-to-br from-orange-50 to-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Layers className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-800">
                  {classesWithSections.reduce(
                    (acc, c) => acc + (c.sections?.length || 0),
                    0
                  )}
                </p>
                <p className="text-xs text-orange-600">Total Sections</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-linear-to-br from-green-50 to-emerald-50 hidden sm:block">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <GraduationCap className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-800">
                  {Math.round(
                    (classesWithSections.reduce(
                      (acc, c) => acc + (c.sections?.length || 0),
                      0
                    ) /
                      (classesWithSections.length || 1)) *
                      10
                  ) / 10}
                </p>
                <p className="text-xs text-green-600">Avg Sections/Class</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !classesWithSections.length ? (
        <Card className="border-dashed border-2 border-amber-300">
          <CardContent className="py-12">
            <EmptyState
              icon={GraduationCap}
              title="No classes found"
              description="Create your first class to get started. Sections can be added after creating a class."
              action={{
                label: "Add Your First Class",
                onClick: openAddClass,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classesWithSections.map((cls) => {
            const isExpanded = expandedClasses.has(cls.id);
            const sectionCount = cls.sections?.length || 0;

            return (
              <Card
                key={cls.id}
                className={cn(
                  "border-l-4 transition-all duration-200",
                  isExpanded
                    ? "border-l-amber-500 shadow-lg bg-white"
                    : "border-l-gray-200 hover:border-l-amber-300 hover:shadow-md"
                )}
              >
                <CardContent className="p-0">
                  {/* Class Header */}
                  <div
                    className={cn(
                      "flex items-center gap-4 p-4 cursor-pointer",
                      isExpanded &&
                        "bg-linear-to-r from-amber-50 to-orange-50 border-b"
                    )}
                    onClick={() => toggleExpand(cls.id)}
                  >
                    {/* Expand Icon */}
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>

                    {/* Class Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {cls.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 shrink-0"
                        >
                          Level {cls.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {sectionCount === 0
                          ? "No sections"
                          : `${sectionCount} section${
                              sectionCount > 1 ? "s" : ""
                            }`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAddSection(cls)}
                        className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Section</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditClass(cls)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDeleteClass(cls)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sections List */}
                  {isExpanded && (
                    <div className="p-4 pt-0">
                      {sectionCount === 0 ? (
                        <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-lg mt-4">
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            No sections for this class.{" "}
                            <button
                              onClick={() => openAddSection(cls)}
                              className="text-amber-600 hover:text-amber-700 font-medium"
                            >
                              Add one now
                            </button>
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                          {cls.sections?.map((section) => {
                            const sectionAssignments =
                              assignments?.filter(
                                (a: any) =>
                                  (a.class_id === cls.id ||
                                    a.class_name === cls.name) &&
                                  (a.section_id === section.id ||
                                    a.section_name === section.name)
                              ) || [];

                            return (
                              <div
                                key={section.id}
                                className="flex items-start justify-between p-3 bg-linear-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 group hover:border-amber-300 hover:from-amber-50/50 hover:to-orange-50/50 transition-all"
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium text-sm shrink-0">
                                      {section.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-800">
                                      Section {section.name}
                                    </span>
                                  </div>

                                  <div className="pl-10">
                                    {sectionAssignments.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {sectionAssignments.map((a: any) => (
                                          <Badge
                                            key={a.id}
                                            variant="outline"
                                            className="text-[10px] py-0 h-5 px-1.5 bg-white border-amber-200 text-amber-800 font-normal shadow-sm"
                                          >
                                            <span className="font-semibold mr-1">
                                              {a.subject_name}:
                                            </span>{" "}
                                            {a.teacher_name}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-gray-400 italic">
                                        No teachers assigned yet
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      openEditSection(section, cls)
                                    }
                                    className="h-7 w-7"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openDeleteSection(section)}
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Class Modal (Create/Edit) */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClass ? "Edit Class" : "Add New Class"}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <Input
            label={
              <>
                Class Name <span className="text-red-500">*</span>
              </>
            }
            value={classForm.name}
            onChange={(e) =>
              setClassForm({ ...classForm, name: e.target.value })
            }
            placeholder="e.g., Class 1, Grade 5, Nursery"
            required
          />
          <Input
            label="Level (for sorting)"
            type="number"
            value={classForm.level}
            onChange={(e) =>
              setClassForm({
                ...classForm,
                level: parseInt(e.target.value) || 1,
              })
            }
            min={1}
            max={20}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsClassModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveClass}
            isLoading={
              createClassMutation.isPending || updateClassMutation.isPending
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {editingClass ? "Save Changes" : "Create Class"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Section Modal (Create/Edit) */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={
          editingSection
            ? `Edit Section - ${selectedClassForSection?.name}`
            : `Add Section to ${selectedClassForSection?.name}`
        }
        size="sm"
      >
        <div className="p-6 space-y-4">
          <Input
            label={
              <>
                Section Name <span className="text-red-500">*</span>
              </>
            }
            value={sectionForm.name}
            onChange={(e) => setSectionForm({ name: e.target.value })}
            placeholder="e.g., A, B, C or Red, Blue"
            required
          />
          <p className="text-xs text-gray-500">
            Common naming: A, B, C... or thematic names like Red, Blue, etc.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsSectionModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveSection}
            isLoading={
              createSectionMutation.isPending || updateSectionMutation.isPending
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {editingSection ? "Save Changes" : "Add Section"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Class Modal */}
      <Modal
        isOpen={isDeleteClassModalOpen}
        onClose={() => setIsDeleteClassModalOpen(false)}
        title="Delete Class"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-gray-700">
                Are you sure you want to delete{" "}
                <strong>{editingClass?.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This will also delete all sections and configurations associated
                with this class. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteClassModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              editingClass && deleteClassMutation.mutate(editingClass.id)
            }
            isLoading={deleteClassMutation.isPending}
          >
            Delete Class
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Section Modal */}
      <Modal
        isOpen={isDeleteSectionModalOpen}
        onClose={() => setIsDeleteSectionModalOpen(false)}
        title="Delete Section"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-gray-700">
                Are you sure you want to delete{" "}
                <strong>Section {selectedSectionToDelete?.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This may affect student and teacher assignments. This action
                cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteSectionModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              selectedSectionToDelete &&
              deleteSectionMutation.mutate(selectedSectionToDelete.id)
            }
            isLoading={deleteSectionMutation.isPending}
          >
            Delete Section
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
