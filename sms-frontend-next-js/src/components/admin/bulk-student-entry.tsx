"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  Edit3,
} from "lucide-react";
import { studentsApi, classesApi, sectionsApi, sessionsApi } from "@/lib/api";
import type { Student, Class, Section, Session } from "@/types";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Modal, ModalFooter } from "@/components/ui/modal";

interface BulkStudentData {
  roll_no: string;
  name: string;
  class_name?: string;
  section_name?: string;
  session_name?: string;
  errors?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkStudentEntry({ isOpen, onClose, onSuccess }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [bulkData, setBulkData] = useState<BulkStudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      initializeManualEntry();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClass) {
      fetchSections();
    } else {
      setSections([]);
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      const [sessionsData, classesData] = await Promise.all([
        sessionsApi.getAll(),
        classesApi.getAll(),
      ]);

      setSessions(sessionsData);
      setClasses(classesData);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await sectionsApi.getByClass(selectedClass);
      setSections(data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  // Initialize with empty rows for manual entry
  const initializeManualEntry = () => {
    setBulkData(
      Array.from({ length: 5 }, () => ({
        roll_no: "",
        name: "",
      }))
    );
    setValidationErrors([]);
    setSuccessMessage("");
  };

  useEffect(() => {
    if (activeTab === "manual" && bulkData.length === 0) {
      initializeManualEntry();
    }
  }, [activeTab]);

  // Add new row for manual entry
  const addNewRow = () => {
    setBulkData((prev) => [...prev, { roll_no: "", name: "" }]);
  };

  // Remove row
  const removeRow = (index: number) => {
    setBulkData((prev) => prev.filter((_, i) => i !== index));
  };

  // Update row data
  const updateRow = (
    index: number,
    field: keyof BulkStudentData,
    value: string
  ) => {
    setBulkData((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
    // Clear errors when editing
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  // Download Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        roll_no: "001",
        name: "John Doe",
        class_name: "10th",
        section_name: "A",
        session_name: "2023-24",
      },
      {
        roll_no: "002",
        name: "Jane Smith",
        class_name: "10th",
        section_name: "A",
        session_name: "2023-24",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    // Set column widths
    worksheet["!cols"] = [
      { width: 15 }, // roll_no
      { width: 25 }, // name
      { width: 15 }, // class_name
      { width: 15 }, // section_name
      { width: 15 }, // session_name
    ];

    XLSX.writeFile(workbook, "student_template.xlsx");
  };

  // Export current students
  const exportStudents = async () => {
    if (!selectedSession || !selectedClass || !selectedSection) {
      alert("Please select session, class, and section first");
      return;
    }

    try {
      setLoading(true);
      const students = await studentsApi.getByFilters(
        selectedSession,
        selectedClass,
        selectedSection
      );

      const exportData =
        students?.map((student) => ({
          roll_no: student.roll_no,
          name: student.name,
          class_name:
            student.class_info?.name ||
            classes.find((c) => c.id === student.class_id)?.name,
          section_name:
            student.section_info?.name ||
            sections.find((s) => s.id === student.section_id)?.name,
          session_name:
            student.session_info?.name ||
            sessions.find((s) => s.id === student.session_id)?.name,
        })) || [];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      worksheet["!cols"] = [
        { width: 15 },
        { width: 25 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];

      const className = classes.find((c) => c.id === selectedClass)?.name;
      const sectionName = sections.find((s) => s.id === selectedSection)?.name;
      const sessionName = sessions.find((s) => s.id === selectedSession)?.name;

      XLSX.writeFile(
        workbook,
        `students_${className}_${sectionName}_${sessionName}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting students:", error);
      alert("Error exporting students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(
          worksheet
        ) as BulkStudentData[];

        // Validate and process data
        const processedData = jsonData.map((row) => ({
          roll_no: String(row.roll_no || "").trim(),
          name: String(row.name || "").trim(),
          class_name: String(row.class_name || "").trim(),
          section_name: String(row.section_name || "").trim(),
          session_name: String(row.session_name || "").trim(),
        }));

        setBulkData(processedData);
        setActiveTab("import");
        setSuccessMessage(
          `Successfully imported ${processedData.length} rows from Excel file`
        );
      } catch (error) {
        console.error("Error reading file:", error);
        setValidationErrors([
          "Error reading Excel file. Please check the file format.",
        ]);
      } finally {
        setImporting(false);
        // Reset file input
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Validate data before saving
  const validateData = async (): Promise<boolean> => {
    const errors: string[] = [];

    // Filter out empty rows
    const validRows = bulkData.filter(
      (row) => row.roll_no.trim() || row.name.trim()
    );

    if (validRows.length === 0) {
      errors.push("No valid student data found");
      setValidationErrors(errors);
      return false;
    }

    const studentGroups = new Map<string, BulkStudentData[]>();

    validRows.forEach((row, index) => {
      const rowErrors: string[] = [];

      if (!row.roll_no.trim()) rowErrors.push("Roll number is required");
      if (!row.name.trim()) rowErrors.push("Student name is required");

      // For import mode, validate class/section/session names
      if (activeTab === "import") {
        if (!row.class_name?.trim()) rowErrors.push("Class name is required");
        else if (!classes.find((c) => c.name === row.class_name?.trim())) {
          rowErrors.push(`Class "${row.class_name}" does not exist`);
        }

        if (!row.section_name?.trim())
          rowErrors.push("Section name is required");

        if (!row.session_name?.trim())
          rowErrors.push("Session name is required");
        else if (!sessions.find((s) => s.name === row.session_name?.trim())) {
          rowErrors.push(`Session "${row.session_name}" does not exist`);
        }
      }

      // Group key logic
      let groupKey = "";
      if (activeTab === "manual") {
        const className =
          classes.find((c) => c.id === selectedClass)?.name || "";
        const sectionName =
          sections.find((s) => s.id === selectedSection)?.name || "";
        const sessionName =
          sessions.find((s) => s.id === selectedSession)?.name || "";
        groupKey = `${className}-${sectionName}-${sessionName}`;
      } else {
        groupKey = `${row.class_name}-${row.section_name}-${row.session_name}`;
      }

      if (!studentGroups.has(groupKey)) {
        studentGroups.set(groupKey, []);
      }
      studentGroups.get(groupKey)!.push({ ...row, errors: rowErrors });

      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 1}: ${rowErrors.join(", ")}`);
      }
    });

    // Check for duplicate roll numbers within current batch
    studentGroups.forEach((students, groupKey) => {
      const rollNumbers = new Map<string, number[]>();
      students.forEach((student, index) => {
        if (student.roll_no.trim()) {
          const rollNo = student.roll_no.trim();
          if (!rollNumbers.has(rollNo)) rollNumbers.set(rollNo, []);
          rollNumbers.get(rollNo)!.push(index);
        }
      });

      rollNumbers.forEach((indices, rollNo) => {
        if (indices.length > 1) {
          const [className, sectionName, sessionName] = groupKey.split("-");
          errors.push(
            `Duplicate roll number "${rollNo}" found in ${className} - ${sectionName} (${sessionName})`
          );
        }
      });
    });

    // Check against existing students in database for each group
    for (const [groupKey, students] of studentGroups) {
      const [className, sectionName, sessionName] = groupKey.split("-");

      try {
        // Find IDs
        const session = sessions.find((s) => s.name === sessionName);
        const cls = classes.find((c) => c.name === className);

        if (!session || !cls) continue;

        // Get sections for this class
        const classSections = await sectionsApi.getByClass(cls.id);
        const section = classSections?.find((s) => s.name === sectionName);

        if (!section) {
          errors.push(
            `Section "${sectionName}" does not exist for class "${className}"`
          );
          continue;
        }

        // Check existing students
        const existingStudents = await studentsApi.getByFilters(
          session.id,
          cls.id,
          section.id
        );

        if (existingStudents) {
          const existingRollNumbers = new Set(
            existingStudents.map((s) => s.roll_no)
          );

          students.forEach((student) => {
            if (
              student.roll_no.trim() &&
              existingRollNumbers.has(student.roll_no.trim())
            ) {
              errors.push(
                `Roll number "${student.roll_no}" already exists in ${className} - ${sectionName} (${sessionName})`
              );
            }
          });
        }
      } catch (error) {
        console.error("Error checking existing students:", error);
        errors.push(
          `Error validating against existing students for ${groupKey}`
        );
      }
    }

    if (activeTab === "manual") {
      if (!selectedSession) errors.push("Please select a session");
      if (!selectedClass) errors.push("Please select a class");
      if (!selectedSection) errors.push("Please select a section");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const saveStudents = async () => {
    const isValid = await validateData();
    if (!isValid) return;

    setSaving(true);
    setSuccessMessage("");
    setValidationErrors([]);

    try {
      const validRows = bulkData.filter(
        (row) => row.roll_no.trim() && row.name.trim()
      );

      const studentsToInsert = [];
      const lookupCache = new Map<
        string,
        { sessionId: string; classId: string; sectionId: string }
      >();

      if (activeTab === "import") {
        // Build lookups for import mode
        const sessionMap = new Map(sessions.map((s) => [s.name, s.id]));
        const classMap = new Map(classes.map((c) => [c.name, c.id]));

        // Gather all unique classes first
        const uniqueClassNames = Array.from(
          new Set(validRows.map((r) => r.class_name))
        );
        const classIdsToFetch = uniqueClassNames
          .map((name) => classMap.get(name!))
          .filter(Boolean) as string[];

        // Fetch sections for all involved classes
        const sectionsByClass = new Map<string, Section[]>();
        await Promise.all(
          classIdsToFetch.map(async (classId) => {
            const sections = await sectionsApi.getByClass(classId);
            sectionsByClass.set(classId, sections);
          })
        );

        for (const row of validRows) {
          const cacheKey = `${row.class_name}-${row.section_name}-${row.session_name}`;
          if (!lookupCache.has(cacheKey)) {
            const sessionId = sessionMap.get(row.session_name!);
            const classId = classMap.get(row.class_name!);

            let sectionId = undefined;
            if (classId) {
              const sections = sectionsByClass.get(classId);
              sectionId = sections?.find(
                (s) => s.name === row.section_name!
              )?.id;
            }

            if (sessionId && classId && sectionId) {
              lookupCache.set(cacheKey, { sessionId, classId, sectionId });
            } else {
              continue;
            }
          }
          const lookup = lookupCache.get(cacheKey)!;
          studentsToInsert.push({
            roll_no: row.roll_no.trim(),
            name: row.name.trim(),
            class_id: lookup.classId,
            section_id: lookup.sectionId,
            session_id: lookup.sessionId,
          });
        }
      } else {
        // Manual
        for (const row of validRows) {
          studentsToInsert.push({
            roll_no: row.roll_no.trim(),
            name: row.name.trim(),
            class_id: selectedClass,
            section_id: selectedSection,
            session_id: selectedSession,
          });
        }
      }

      if (studentsToInsert.length === 0) {
        throw new Error("No students prepared for insertion");
      }

      await studentsApi.bulkCreate(studentsToInsert);

      setSuccessMessage(
        `Successfully added ${studentsToInsert.length} students!`
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Error saving students:", error);
      setValidationErrors([error.message || "Failed to save students"]);
    } finally {
      setSaving(false);
    }
  };

  const sessionOptions: SelectOption[] = sessions.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const classOptions: SelectOption[] = classes.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const sectionOptions: SelectOption[] = sections.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Student Entry"
      size="full"
    >
      <div className="p-6 space-y-5">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "manual"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "import"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Import
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Validation Errors</span>
            </div>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
          {activeTab === "manual" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">Select Target Class</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  options={sessionOptions}
                  placeholder="Session"
                  className="bg-white"
                />
                <Select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection("");
                  }}
                  options={classOptions}
                  placeholder="Class"
                  className="bg-white"
                />
                <Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  options={sectionOptions}
                  placeholder="Section"
                  disabled={!selectedClass}
                  className="bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={exportStudents}
                    disabled={
                      loading ||
                      !selectedSession ||
                      !selectedClass ||
                      !selectedSection
                    }
                    className="flex-1 bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    onClick={addNewRow}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-medium text-sm">
                  Import students from Excel file
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <div className="relative">
                  <Button
                    isLoading={importing}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileImport}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={importing}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Roll No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student Name
                  </th>
                  {activeTab === "import" && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Section
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Session
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bulkData.map((row, index) => (
                  <tr
                    key={index}
                    className={`group transition-colors ${
                      row.errors?.length
                        ? "bg-red-50 hover:bg-red-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-2 text-gray-400 text-xs font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.roll_no}
                        onChange={(e) =>
                          updateRow(index, "roll_no", e.target.value)
                        }
                        placeholder="Roll No"
                        className="h-9 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          updateRow(index, "name", e.target.value)
                        }
                        placeholder="Student Name"
                        className="h-9 text-sm"
                      />
                    </td>
                    {activeTab === "import" && (
                      <>
                        <td className="px-4 py-2 text-gray-700">
                          {row.class_name || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {row.section_name || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {row.session_name || "-"}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(index)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {bulkData.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeTab === "import" ? 7 : 4}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users className="w-8 h-8" />
                        <span>No students added yet</span>
                        <span className="text-xs">
                          {activeTab === "manual"
                            ? "Click the + button to add rows"
                            : "Import an Excel file to get started"}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-amber-700">
              {bulkData.filter((r) => r.roll_no && r.name).length}
            </span>{" "}
            students ready to save
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={saveStudents}
              isLoading={saving}
              disabled={
                saving ||
                bulkData.filter((r) => r.roll_no && r.name).length === 0
              }
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save {bulkData.filter((r) => r.roll_no && r.name).length} Students
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
