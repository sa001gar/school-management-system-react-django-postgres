/**
 * Students Management Component
 */
"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  Upload,
  Filter,
  Camera,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading";
import { PageHeader } from "@/components/layout/page-header";
import { studentsApi, sessionsApi, classesApi, sectionsApi } from "@/lib/api";

import type { Student, Session, Class, Section } from "@/types";
import { toast } from "sonner";
import { BulkStudentEntry } from "./bulk-student-entry";
import { ImageCropper } from "@/components/ui/image-cropper";

export function StudentsManagement() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [page, setPage] = useState(1);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEntryModalOpen, setIsBulkEntryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null
  );

  // Form data
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    roll_no: "",
    date_of_birth: "",
    father_name: "",
    mother_name: "",
    guardian_name: "",
    guardian_relation: "",
    phone: "",
    alternate_phone: "",
    email: "",
    address: "",
    class_id: "",
    section_id: "",
    session_id: "",
  });

  // Fetch data
  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: sessionsApi.getAll,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", "all"],
    queryFn: () => sectionsApi.getAll(),
  });

  const filteredSections = selectedClass
    ? sections?.filter((s) => s.class_id === selectedClass) || []
    : [];

  const { data: studentsData, isLoading } = useQuery({
    queryKey: [
      "students",
      {
        session_id: selectedSession,
        class_id: selectedClass,
        section_id: selectedSection,
        search,
        page,
      },
    ],
    queryFn: () =>
      studentsApi.getAll({
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
    mutationFn: ({
      data,
      imageFile,
    }: {
      data: Partial<Student>;
      imageFile: File | null;
    }) => studentsApi.createWithImage(data, imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success("Student created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create student");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
      imageFile,
    }: {
      id: string;
      data: Partial<Student>;
      imageFile: File | null;
    }) => studentsApi.updateWithImage(id, data, imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      resetForm();
      toast.success("Student updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update student");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
      toast.success("Student deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete student");
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      name: "",
      roll_no: "",
      date_of_birth: "",
      father_name: "",
      mother_name: "",
      guardian_name: "",
      guardian_relation: "",
      phone: "",
      alternate_phone: "",
      email: "",
      address: "",
      class_id: "",
      section_id: "",
      session_id: "",
    });
    setProfilePicFile(null);
    setProfilePicPreview(null);
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const removeProfilePic = () => {
    setProfilePicFile(null);
    setProfilePicPreview(null);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push("Student name is required");
    if (!formData.roll_no.trim()) errors.push("Roll number is required");
    if (!formData.session_id) errors.push("Session is required");
    if (!formData.class_id) errors.push("Class is required");
    if (!formData.section_id) errors.push("Section is required");
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Invalid email format");
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      errors.push("Phone number should be 10 digits");
    }
    return errors;
  };

  const handleCreate = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }
    startTransition(() => {
      createMutation.mutate({ data: formData, imageFile: profilePicFile });
    });
  };

  const handleUpdate = () => {
    if (!selectedStudent) return;
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    // Check if image was explicitly removed
    const isImageRemoved = !profilePicPreview && selectedStudent.profile_pic;
    const updateData = {
      ...formData,
      ...(isImageRemoved ? { profile_pic: null } : {}),
    };

    startTransition(() => {
      updateMutation.mutate({
        id: selectedStudent.id,
        data: updateData,
        imageFile: profilePicFile,
      });
    });
  };

  const handleDelete = () => {
    if (!selectedStudent) return;
    deleteMutation.mutate(selectedStudent.id);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setProfilePicPreview(student.profile_pic || null);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      roll_no: student.roll_no,
      date_of_birth: student.date_of_birth || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      guardian_name: student.guardian_name || "",
      guardian_relation: student.guardian_relation || "",
      phone: student.phone || "",
      alternate_phone: student.alternate_phone || "",
      email: student.email || "",
      address: student.address || "",
      class_id: student.class_id || "",
      section_id: student.section_id || "",
      session_id: student.session_id || "",
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  // Convert to select options
  const sessionOptions: SelectOption[] = (sessions || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const classOptions: SelectOption[] = (classes || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const sectionOptions: SelectOption[] = (filteredSections || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // Section options for modal forms (based on formData.class_id)
  const formSectionOptions: SelectOption[] = formData.class_id
    ? (sections || [])
        .filter((s) => s.class_id === formData.class_id)
        .map((s) => ({ value: s.id, label: s.name }))
    : [];

  // Lookups
  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || "-";
  };

  const getSectionName = (sectionId: string) => {
    return sections?.find((s) => s.id === sectionId)?.name || "-";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records"
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkEntryModalOpen(true)}
              leftIcon={<Upload className="h-4 w-4" />}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Bulk Entry
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Student
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="border-amber-200 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-amber-500" />}
                className="border-amber-200 focus-visible:ring-amber-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-40">
                <Select
                  options={sessionOptions}
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  placeholder="All Sessions"
                  className="border-amber-200"
                />
              </div>
              <div className="w-36">
                <Select
                  options={classOptions}
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection("");
                  }}
                  placeholder="All Classes"
                  className="border-amber-200"
                />
              </div>
              <div className="w-36">
                <Select
                  options={sectionOptions}
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  placeholder="All Sections"
                  className="border-amber-200"
                  disabled={!selectedClass}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-amber-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : !studentsData?.results?.length ? (
            <EmptyState
              icon={Users}
              title="No students found"
              description="Add your first student or adjust the filters"
              action={{
                label: "Add Student",
                onClick: () => setIsCreateModalOpen(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader className="bg-amber-50">
                <TableRow className="border-amber-200 hover:bg-amber-50">
                  <TableHead className="text-amber-900 font-semibold">
                    Student ID
                  </TableHead>
                  <TableHead className="text-amber-900 font-semibold">
                    Name
                  </TableHead>
                  <TableHead className="text-amber-900 font-semibold">
                    Roll No
                  </TableHead>
                  <TableHead className="text-amber-900 font-semibold">
                    Class
                  </TableHead>
                  <TableHead className="text-amber-900 font-semibold">
                    Section
                  </TableHead>
                  <TableHead className="text-amber-900 font-semibold">
                    Phone
                  </TableHead>
                  <TableHead className="text-right text-amber-900 font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className="border-amber-100 hover:bg-amber-50/50"
                  >
                    <TableCell className="font-medium text-amber-900">
                      {student.student_id}
                    </TableCell>
                    <TableCell className="text-amber-900">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-amber-900">
                      {student.roll_no}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        {student.class_info?.name ||
                          getClassName(student.class_id || "")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-amber-900">
                      {student.section_info?.name ||
                        getSectionName(student.section_id || "")}
                    </TableCell>
                    <TableCell className="text-amber-900">
                      {student.phone || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(student)}
                          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDeleteModal(student)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              Showing {(page - 1) * 20 + 1} to{" "}
              {Math.min(page * 20, studentsData.count)} of {studentsData.count}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
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
        size="full"
      >
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="flex gap-6">
              {/* Profile Picture Upload */}
              <ImageCropper
                currentImage={profilePicPreview}
                onImageChange={(file, preview) => {
                  setProfilePicFile(file);
                  setProfilePicPreview(preview);
                }}
              />
              {/* Form Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
                    Auto-generated on save
                  </div>
                </div>
                <Input
                  label={
                    <>
                      Full Name <span className="text-red-500">*</span>
                    </>
                  }
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter student name"
                  required
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Guardian Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Father's Name"
                value={formData.father_name}
                onChange={(e) =>
                  setFormData({ ...formData, father_name: e.target.value })
                }
                placeholder="Father's name"
              />
              <Input
                label="Mother's Name"
                value={formData.mother_name}
                onChange={(e) =>
                  setFormData({ ...formData, mother_name: e.target.value })
                }
                placeholder="Mother's name"
              />
              <Input
                label="Guardian Name"
                value={formData.guardian_name}
                onChange={(e) =>
                  setFormData({ ...formData, guardian_name: e.target.value })
                }
                placeholder="Guardian name"
              />
              <Input
                label="Guardian Relation"
                value={formData.guardian_relation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    guardian_relation: e.target.value,
                  })
                }
                placeholder="e.g., Uncle, Aunt"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Primary phone"
              />
              <Input
                label="Alternate Phone"
                value={formData.alternate_phone}
                onChange={(e) =>
                  setFormData({ ...formData, alternate_phone: e.target.value })
                }
                placeholder="Alternate phone"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Email address"
              />
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Roll Number *"
                value={formData.roll_no}
                onChange={(e) =>
                  setFormData({ ...formData, roll_no: e.target.value })
                }
                placeholder="Roll number"
                required
              />
              <Select
                label="Session *"
                options={sessionOptions}
                value={formData.session_id}
                onChange={(e) =>
                  setFormData({ ...formData, session_id: e.target.value })
                }
                placeholder="Select session"
              />
              <Select
                label="Class *"
                options={classOptions}
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    class_id: e.target.value,
                    section_id: "",
                  })
                }
                placeholder="Select class"
              />
              <Select
                label="Section *"
                options={formSectionOptions}
                value={formData.section_id}
                onChange={(e) =>
                  setFormData({ ...formData, section_id: e.target.value })
                }
                placeholder="Select section"
                disabled={!formData.class_id}
              />
            </div>
          </div>
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
        size="full"
      >
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="flex gap-6">
              {/* Profile Picture Upload */}
              <ImageCropper
                currentImage={profilePicPreview}
                onImageChange={(file, preview) => {
                  setProfilePicFile(file);
                  setProfilePicPreview(preview);
                }}
              />
              {/* Form Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Student ID"
                  value={formData.student_id}
                  disabled
                  className="bg-gray-100"
                />
                <Input
                  label={
                    <>
                      Full Name <span className="text-red-500">*</span>
                    </>
                  }
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter student name"
                  required
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Guardian Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Father's Name"
                value={formData.father_name}
                onChange={(e) =>
                  setFormData({ ...formData, father_name: e.target.value })
                }
                placeholder="Father's name"
              />
              <Input
                label="Mother's Name"
                value={formData.mother_name}
                onChange={(e) =>
                  setFormData({ ...formData, mother_name: e.target.value })
                }
                placeholder="Mother's name"
              />
              <Input
                label="Guardian Name"
                value={formData.guardian_name}
                onChange={(e) =>
                  setFormData({ ...formData, guardian_name: e.target.value })
                }
                placeholder="Guardian name"
              />
              <Input
                label="Guardian Relation"
                value={formData.guardian_relation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    guardian_relation: e.target.value,
                  })
                }
                placeholder="e.g., Uncle, Aunt"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Primary phone"
              />
              <Input
                label="Alternate Phone"
                value={formData.alternate_phone}
                onChange={(e) =>
                  setFormData({ ...formData, alternate_phone: e.target.value })
                }
                placeholder="Alternate phone"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Email address"
              />
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wide">
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Roll Number *"
                value={formData.roll_no}
                onChange={(e) =>
                  setFormData({ ...formData, roll_no: e.target.value })
                }
                placeholder="Roll number"
                required
              />
              <Select
                label="Session *"
                options={sessionOptions}
                value={formData.session_id}
                onChange={(e) =>
                  setFormData({ ...formData, session_id: e.target.value })
                }
                placeholder="Select session"
              />
              <Select
                label="Class *"
                options={classOptions}
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    class_id: e.target.value,
                    section_id: "",
                  })
                }
                placeholder="Select class"
              />
              <Select
                label="Section *"
                options={formSectionOptions}
                value={formData.section_id}
                onChange={(e) =>
                  setFormData({ ...formData, section_id: e.target.value })
                }
                placeholder="Select section"
                disabled={!formData.class_id}
              />
            </div>
          </div>
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
          Are you sure you want to delete{" "}
          <strong>{selectedStudent?.name}</strong>? This action cannot be
          undone.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Entry Modal */}
      <BulkStudentEntry
        isOpen={isBulkEntryModalOpen}
        onClose={() => setIsBulkEntryModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          toast.success("Bulk students added successfully");
        }}
      />
    </div>
  );
}
