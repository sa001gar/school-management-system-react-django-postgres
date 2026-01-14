"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Save,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  classesApi,
  subjectsApi,
  classSubjectAssignmentsApi,
} from "@/lib/api/core";
import type { Class, Subject, ClassSubjectAssignment } from "@/types";
import { Modal, ModalFooter } from "@/components/ui/modal";

export default function ClassAssignments() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Local state for batch editing
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(
    new Set()
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments();
    } else {
      setAssignments([]);
      setSelectedSubjectIds(new Set());
      setHasChanges(false);
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      const [classesData, subjectsData] = await Promise.all([
        classesApi.getAll(),
        subjectsApi.getAll(),
      ]);

      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load classes or subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedClass) return;

    setAssignmentsLoading(true);
    try {
      const data = await classSubjectAssignmentsApi.getByClass(selectedClass);
      setAssignments(data);

      // Initialize local selection state
      const currentIds = new Set(
        data
          .map((a) => a.subject?.id || a.subject_id)
          .filter((id): id is string => !!id)
      );
      setSelectedSubjectIds(currentIds);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load existing assignments");
      setAssignments([]);
      setSelectedSubjectIds(new Set());
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const toggleSubjectAssignment = (subjectId: string) => {
    if (!selectedClass) {
      toast.warning("Please select a class first");
      return;
    }

    const newSelected = new Set(selectedSubjectIds);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }

    setSelectedSubjectIds(newSelected);

    // Check if changed from original
    const originalIds = new Set(
      assignments.map((a) => a.subject?.id || a.subject_id)
    );

    // Check if sets are equal (size check + every element check)
    let isChanged = newSelected.size !== originalIds.size;
    if (!isChanged) {
      for (let id of newSelected) {
        if (!originalIds.has(id)) {
          isChanged = true;
          break;
        }
      }
    }

    setHasChanges(isChanged);
  };

  const handleCancel = () => {
    // Revert to original assignments
    const currentIds = new Set(
      assignments
        .map((a) => a.subject?.id || a.subject_id)
        .filter((id): id is string => !!id)
    );
    setSelectedSubjectIds(currentIds);
    setHasChanges(false);
    toast.info("Changes reverted");
  };

  const handleSaveClick = () => {
    if (!selectedClass) return;
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (!selectedClass) return;

    setSaving(true);
    setShowConfirmModal(false); // Close modal immediately or wait? Better to wait if we want to show loading in modal, but typical pattern is close then show global loading

    try {
      await classSubjectAssignmentsApi.bulkUpdate({
        class_id: selectedClass,
        subject_ids: Array.from(selectedSubjectIds),
      });

      toast.success("Assignments saved successfully");
      await fetchAssignments(); // Refresh data and reset state
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error("Failed to save assignments");
      setSaving(false);
    }
  };

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header / Selection Area */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Class Selector */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            >
              <option value="">-- Choose a Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Search */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Subjects
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedClass}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {selectedClass && (
            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={!hasChanges || saving}
                className={`
                  px-4 py-2.5 rounded-lg font-medium transition-all
                  ${
                    hasChanges && !saving
                      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      : "text-gray-300 cursor-not-allowed"
                  }
                `}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveClick}
                disabled={!hasChanges || saving}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm
                  ${
                    hasChanges && !saving
                      ? "bg-amber-600 text-white hover:bg-amber-700 hover:shadow-md active:scale-95"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Assignment Changes"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-600 text-sm">
            You are about to update the subject assignments for{" "}
            <strong>{selectedClassName}</strong>. This action will overwrite
            existing assignments.
          </p>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase font-medium tracking-wide mb-1">
                Previous
              </div>
              <div className="text-xl font-semibold text-gray-700">
                {assignments.length}
              </div>
            </div>

            <div className="text-gray-300">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>

            <div className="text-center flex-1">
              <div className="text-xs text-amber-600 uppercase font-medium tracking-wide mb-1">
                New
              </div>
              <div className="text-xl font-bold text-amber-600">
                {selectedSubjectIds.size}
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => setShowConfirmModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 border border-transparent rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={confirmSave}
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-sm active:scale-95 transition-all"
          >
            Confirm Update
          </button>
        </ModalFooter>
      </Modal>

      {/* Main Content Area */}
      {!selectedClass ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">
            No Class Selected
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1">
            Please select a class from the dropdown above to manage its subject
            assignments.
          </p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-600" />
              Subjects for {selectedClassName}
            </h3>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 py-1">
                {selectedSubjectIds.size} selected
              </span>
              {hasChanges && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          {assignmentsLoading ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-100">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((subject) => {
                const isSelected = selectedSubjectIds.has(subject.id);

                return (
                  <div
                    key={subject.id}
                    onClick={() => toggleSubjectAssignment(subject.id)}
                    className={`
                      relative group cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                      ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/50 shadow-sm transform scale-[1.01]"
                          : "border-gray-100 bg-white hover:border-amber-200 hover:shadow-md"
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4
                          className={`font-semibold ${
                            isSelected ? "text-amber-900" : "text-gray-900"
                          }`}
                        >
                          {subject.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {subject.code}
                          </span>
                          <span className="text-xs text-gray-500">
                            Marks: {subject.full_marks || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`
                        w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                        ${
                          isSelected
                            ? "bg-amber-600 text-white rotate-0"
                            : "bg-gray-100 text-gray-300 group-hover:bg-amber-100 group-hover:text-amber-600 rotate-90"
                        }
                      `}
                      >
                        {isSelected ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-amber-500 rounded-xl pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
                    )}
                  </div>
                );
              })}

              {filteredSubjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No subjects found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
