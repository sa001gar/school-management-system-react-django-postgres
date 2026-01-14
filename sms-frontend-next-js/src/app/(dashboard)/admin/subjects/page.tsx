"use client";

import { useState } from "react";
import { BookOpen, Layers, Trophy, CheckSquare } from "lucide-react";
import { CoreSubjects } from "@/components/admin/subjects/CoreSubjects";
import { OptionalSubjects } from "@/components/admin/subjects/OptionalSubjects";
import { CocurricularSubjects } from "@/components/admin/subjects/CocurricularSubjects";
import ClassAssignments from "@/components/admin/subjects/ClassAssignments";

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState("core");

  const tabs = [
    {
      id: "core",
      label: "Core Subjects",
      icon: BookOpen,
      count: null,
    },
    {
      id: "optional",
      label: "Optional Subjects",
      icon: Layers,
      count: null,
    },
    {
      id: "cocurricular",
      label: "Co-curricular",
      icon: Trophy,
      count: null,
    },
    {
      id: "class-assignments",
      label: "Class Assignments",
      icon: CheckSquare,
      count: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Subjects & Curriculum
          </h1>
          <p className="text-gray-500">
            Manage course catalog, optional subjects, and class assignments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-amber-600 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-amber-600" : "text-gray-400"
                  }`}
                />
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`ml-1 py-0.5 px-2 rounded-full text-xs ${
                      isActive
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "core" && <CoreSubjects />}
        {activeTab === "optional" && <OptionalSubjects />}
        {activeTab === "cocurricular" && <CocurricularSubjects />}
        {activeTab === "class-assignments" && <ClassAssignments />}
      </div>
    </div>
  );
}
