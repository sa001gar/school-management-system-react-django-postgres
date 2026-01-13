"""
URL configuration for Core Services API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, CurrentUserView,
    SessionViewSet, ClassViewSet, SectionViewSet,
    SubjectViewSet, CocurricularSubjectViewSet, OptionalSubjectViewSet,
    ClassSubjectAssignmentViewSet, ClassOptionalConfigViewSet,
    ClassOptionalAssignmentViewSet, ClassCocurricularConfigViewSet,
    ClassMarksDistributionViewSet, SchoolConfigViewSet,
    StudentViewSet, TeacherViewSet, AdminViewSet,
    # New views for modular apps
    StudentLoginView, StudentPortalView, StudentFeesView,
    TeacherAssignmentViewSet, MyAssignmentsView, MyPendingTasksView,
    AdminDashboardStatsView
)

router = DefaultRouter()
router.register(r'sessions', SessionViewSet)
router.register(r'classes', ClassViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'cocurricular-subjects', CocurricularSubjectViewSet)
router.register(r'optional-subjects', OptionalSubjectViewSet)
router.register(r'class-subject-assignments', ClassSubjectAssignmentViewSet)
router.register(r'class-optional-config', ClassOptionalConfigViewSet)
router.register(r'class-optional-assignments', ClassOptionalAssignmentViewSet)
router.register(r'class-cocurricular-config', ClassCocurricularConfigViewSet)
router.register(r'class-marks-distribution', ClassMarksDistributionViewSet)
router.register(r'school-config', SchoolConfigViewSet)
router.register(r'students', StudentViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'admins', AdminViewSet)
router.register(r'teacher-assignments', TeacherAssignmentViewSet)

urlpatterns = [
    # Staff authentication
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    
    # Student authentication (for payments portal)
    path('auth/student-login/', StudentLoginView.as_view(), name='student-login'),
    
    # Student portal endpoints
    path('student/me/', StudentPortalView.as_view(), name='student-portal'),
    path('student/fees/', StudentFeesView.as_view(), name='student-fees'),
    
    # Teacher RMS endpoints
    path('teacher/my-assignments/', MyAssignmentsView.as_view(), name='my-assignments'),
    path('teacher/pending-tasks/', MyPendingTasksView.as_view(), name='pending-tasks'),
    
    # Admin dashboard endpoints
    path('admin/dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    
    # Router URLs
    path('', include(router.urls)),
]
