"use client";

import React, { useState, useEffect } from "react";
import {
  teacherAssignmentsApi,
  classTeachersApi,
  sessionsApi,
  classesApi,
  sectionsApi,
  subjectsApi,
} from "@/lib/api/core";
import { teacherApi } from "@/lib/api/auth";
import { Loader2, Trash2, Plus, Users, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type {
  TeacherAssignment,
  ClassTeacher,
  Session,
  Class,
  Section,
  Subject,
  Teacher,
} from "@/types";

export function TeacherAssignments() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"subject" | "class">("subject");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  // Selection states for form
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // SECTION 1: Data Fetching

  // Fetch Sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: sessionsApi.getAll,
  });

  // Set default session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      const active = sessions.find((s) => s.is_active);
      if (active) setSelectedSession(active.id);
      else setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  // Fetch Assignments based on active tab & session
  const {
    data: subjectAssignments = [],
    isLoading: isLoadingSubjectAssignments,
  } = useQuery({
    queryKey: ["teacherAssignments", selectedSession],
    queryFn: () =>
      teacherAssignmentsApi.getAll({ session_id: selectedSession }),
    enabled: !!selectedSession && activeTab === "subject",
  });

  const {
    data: classTeacherAssignments = [],
    isLoading: isLoadingClassTeachers,
  } = useQuery({
    queryKey: ["classTeachers", selectedSession],
    queryFn: () => classTeachersApi.getAll({ session_id: selectedSession }),
    enabled: !!selectedSession && activeTab === "class",
  });

  // Fetch Form Data
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: teacherApi.getAll,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: subjectsApi.getAll,
    enabled: activeTab === "subject",
  });

  // Fetch sections when class is selected
  const { data: sections = [] } = useQuery({
    queryKey: ["sections", selectedClass],
    queryFn: () => sectionsApi.getByClass(selectedClass),
    enabled: !!selectedClass,
  });

  // SECTION 2: Mutations

  const createSubjectAssignmentMutation = useMutation({
    mutationFn: teacherAssignmentsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacherAssignments"] });
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ["teacherAssignments"] });
      toast.success("Subject assignment created");
      closeModal();
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to assign teacher"),
  });

  const createClassTeacherMutation = useMutation({
    mutationFn: classTeachersApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classTeachers"] });
      await queryClient.refetchQueries({ queryKey: ["classTeachers"] });
      toast.success("Class teacher assigned");
      closeModal();
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to assign class teacher"),
  });

  const deleteSubjectAssignmentMutation = useMutation({
    mutationFn: teacherAssignmentsApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacherAssignments"] });
      await queryClient.refetchQueries({ queryKey: ["teacherAssignments"] });
      toast.success("Assignment removed");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to delete assignment"),
  });

  const deleteClassTeacherMutation = useMutation({
    mutationFn: classTeachersApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classTeachers"] });
      await queryClient.refetchQueries({ queryKey: ["classTeachers"] });
      toast.success("Class teacher removed");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to delete assignment"),
  });

  // SECTION 3: Handlers

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    // Validate form
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }
    if (!selectedSection) {
      toast.error("Please select a section");
      return;
    }
    if (activeTab === "subject" && !selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (activeTab === "subject") {
      createSubjectAssignmentMutation.mutate({
        teacher_id: selectedTeacher,
        class_id: selectedClass,
        section_id: selectedSection,
        subject_id: selectedSubject,
        session_id: selectedSession,
      });
    } else {
      createClassTeacherMutation.mutate({
        teacher_id: selectedTeacher,
        class_id: selectedClass,
        section_id: selectedSection,
        session_id: selectedSession,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this assignment?")) {
      if (activeTab === "subject") {
        deleteSubjectAssignmentMutation.mutate(id);
      } else {
        deleteClassTeacherMutation.mutate(id);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTeacher("");
    setSelectedClass("");
    setSelectedSection("");
    setSelectedSubject("");
  };

  const isLoading =
    activeTab === "subject"
      ? isLoadingSubjectAssignments
      : isLoadingClassTeachers;

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle Tabs */}
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setActiveTab("subject")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "subject"
                ? "bg-white text-amber-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Subject Assignments
          </button>
          <button
            onClick={() => setActiveTab("class")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "class"
                ? "bg-white text-amber-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Class Teachers
          </button>
        </div>

        {/* Session Filter */}
        <div className="flex items-center gap-2 w-64">
          <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
          <SearchableSelect
            value={selectedSession}
            onChange={setSelectedSession}
            options={sessions.map((s) => ({
              value: s.id,
              label: `${s.name} ${s.is_active ? "(Active)" : ""}`,
            }))}
            placeholder="Select Session"
            className="w-full"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign {activeTab === "subject" ? "Subject" : "Class Teacher"}
        </button>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Teacher
                  </th>
                  {activeTab === "subject" && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Subject
                    </th>
                  )}
                  {activeTab !== "subject" && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Class & Section
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeTab === "subject"
                  ? // Grouped Subject Assignments
                    Object.entries(
                      subjectAssignments.reduce((acc: any, item: any) => {
                        const key = `${item.class_name} - ${item.section_name}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(item);
                        return acc;
                      }, {})
                    ).map(([groupName, items]: [string, any]) => (
                      <React.Fragment key={groupName}>
                        {/* Group Header */}
                        <tr className="bg-amber-50">
                          <td
                            colSpan={3}
                            className="px-6 py-2 text-sm font-semibold text-amber-800"
                          >
                            {groupName}
                          </td>
                        </tr>
                        {/* Items */}
                        {items.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                                  {item.teacher_name?.charAt(0) || "T"}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {item.teacher_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                <BookOpen className="w-3 h-3 mr-1" />
                                {item.subject_name}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  : // Active Tab is 'class' -> Render normally (or group if we wanted)
                    classTeacherAssignments.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                              {item.teacher_name?.charAt(0) || "T"}
                            </div>
                            <span className="font-medium text-gray-900">
                              {item.teacher_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {item.class_name} - {item.section_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                {(activeTab === "subject"
                  ? subjectAssignments
                  : classTeacherAssignments
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No assignments found for this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === "subject"
                  ? "Assign Subject Teacher"
                  : "Assign Class Teacher"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Teacher Select */}
              <div className="space-y-1">
                <SearchableSelect
                  label={
                    <>
                      Teacher <span className="text-red-500">*</span>
                    </>
                  }
                  value={selectedTeacher}
                  onChange={setSelectedTeacher}
                  options={teachers.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  placeholder="Select Teacher"
                />
              </div>

              {/* Class Select */}
              <div className="space-y-1">
                <SearchableSelect
                  label={
                    <>
                      Class <span className="text-red-500">*</span>
                    </>
                  }
                  value={selectedClass}
                  onChange={(val) => {
                    setSelectedClass(val);
                    setSelectedSection("");
                  }}
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select Class"
                />
              </div>

              {/* Section Select */}
              <div className="space-y-1">
                <SearchableSelect
                  label={
                    <>
                      Section <span className="text-red-500">*</span>
                    </>
                  }
                  value={selectedSection}
                  onChange={setSelectedSection}
                  options={sections.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  placeholder="Select Section"
                  disabled={!selectedClass}
                />
              </div>

              {/* Subject Select (Only for Subject Tab) */}
              {activeTab === "subject" && (
                <div>
                  <SearchableSelect
                    label={
                      <>
                        Subject <span className="text-red-500">*</span>
                      </>
                    }
                    value={selectedSubject}
                    onChange={setSelectedSubject}
                    options={subjects.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="Select Subject"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createSubjectAssignmentMutation.isPending ||
                    createClassTeacherMutation.isPending
                  }
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
