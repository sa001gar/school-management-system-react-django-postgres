"use client";

import { useState } from "react";
import { Users, BookOpen } from "lucide-react";
import { TeacherList } from "@/components/admin/teachers/TeacherList";
import { TeacherAssignments } from "@/components/admin/teachers/TeacherAssignments";

export default function TeachersPage() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Teachers & Assignments
          </h1>
          <p className="text-gray-500">
            Manage teacher profiles and their class/subject assignments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "list"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users
              className={`w-4 h-4 ${
                activeTab === "list" ? "text-amber-600" : "text-gray-400"
              }`}
            />
            All Teachers
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "assignments"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BookOpen
              className={`w-4 h-4 ${
                activeTab === "assignments" ? "text-amber-600" : "text-gray-400"
              }`}
            />
            Assignments
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "list" ? <TeacherList /> : <TeacherAssignments />}
      </div>
    </div>
  );
}
