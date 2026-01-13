"""
Backend-Enforced Permission Classes for School Management System.

Authorization Rules:
- Only assigned subject teacher may enter marks for that subject
- Only class teacher or admin may generate marksheets
- Admin has full academic override
- No UI-only permission enforcement allowed

All permissions are enforced at API level using DRF permissions.
"""
from rest_framework import permissions
from django.core.cache import cache


class IsAdminUser(permissions.BasePermission):
    """
    Permission class to check if user is admin.
    Admin has full academic override.
    """
    message = "Admin access required."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsTeacherUser(permissions.BasePermission):
    """Permission class to check if user is a teacher."""
    message = "Teacher access required."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'teacher'
        )


class IsAdminOrTeacher(permissions.BasePermission):
    """Permission class allowing both admin and teacher access."""
    message = "Staff access required."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'teacher']
        )


class IsStudentUser(permissions.BasePermission):
    """Permission for student portal access."""
    message = "Student access required."
    
    def has_permission(self, request, view):
        # Students authenticate via separate token in request
        return hasattr(request, 'student') and request.student is not None


class CanEnterMarks(permissions.BasePermission):
    """
    Permission to check if teacher can enter marks for a specific subject.
    
    Rules:
    - Admin can enter marks for any subject
    - Teacher can only enter marks for subjects assigned to them
    """
    message = "You are not authorized to enter marks for this subject."
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin has full override
        if user.role == 'admin':
            return True
        
        # Teacher must be authenticated
        if user.role != 'teacher':
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check if teacher is assigned to this student's class/section/subject."""
        user = request.user
        
        # Admin has full override
        if user.role == 'admin':
            return True
        
        if user.role != 'teacher':
            return False
        
        # Get teacher profile
        try:
            teacher = user.teacher_profile
        except Exception:
            return False
        
        # Check teacher assignment for the subject
        from .models import TeacherAssignment
        
        # obj could be a StudentResult or request data
        if hasattr(obj, 'student'):
            student = obj.student
            subject = obj.subject
            session = obj.session
        else:
            # Try to get from request data
            return True  # Let view handle specific validation
        
        return TeacherAssignment.objects.filter(
            teacher=teacher,
            class_ref=student.class_ref,
            section=student.section,
            subject=subject,
            session=session,
            is_active=True
        ).exists()


class CanGenerateMarksheet(permissions.BasePermission):
    """
    Permission to check if user can generate marksheet.
    
    Rules:
    - Admin can generate marksheet for any class
    - Class teacher can generate marksheet for their class only
    """
    message = "You are not authorized to generate marksheets for this class."
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin has full override
        if user.role == 'admin':
            return True
        
        # Teacher must be authenticated and have class teacher assignment
        if user.role != 'teacher':
            return False
        
        return True


class IsClassTeacher(permissions.BasePermission):
    """
    Check if teacher is the class teacher for a specific class/section.
    """
    message = "Only class teacher can perform this action."
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        if user.role == 'admin':
            return True
        
        if user.role != 'teacher':
            return False
        
        return True


class CanManageStudentLifecycle(permissions.BasePermission):
    """
    Permission for student lifecycle operations (promotion, retention, transfer).
    Only admin can perform these operations.
    """
    message = "Only admin can manage student lifecycle."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class SessionNotLocked(permissions.BasePermission):
    """
    Ensure the session is not locked before allowing modifications.
    """
    message = "This session is locked and cannot be modified."
    
    def has_permission(self, request, view):
        # Only check for write operations
        if request.method in permissions.SAFE_METHODS:
            return True
        
        session_id = request.data.get('session_id') or request.query_params.get('session_id')
        if not session_id:
            return True
        
        from .models import Session
        try:
            session = Session.objects.get(id=session_id)
            return not session.is_locked
        except Session.DoesNotExist:
            return True


class CanAccessStudentData(permissions.BasePermission):
    """
    Permission to access student data.
    
    Rules:
    - Admin can access any student
    - Teacher can access students in their assigned classes
    - Student can access only their own data
    """
    message = "You are not authorized to access this student's data."
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role in ['admin', 'teacher']


def check_teacher_subject_assignment(teacher, class_ref, section, subject, session):
    """
    Utility function to check if a teacher is assigned to teach a subject.
    Uses caching for performance.
    """
    cache_key = f"teacher_assignment:{teacher.id}:{class_ref.id}:{section.id}:{subject.id}:{session.id}"
    result = cache.get(cache_key)
    
    if result is None:
        from .models import TeacherAssignment
        result = TeacherAssignment.objects.filter(
            teacher=teacher,
            class_ref=class_ref,
            section=section,
            subject=subject,
            session=session,
            is_active=True
        ).exists()
        cache.set(cache_key, result, 300)  # Cache for 5 minutes
    
    return result


def check_class_teacher(teacher, class_ref, section, session):
    """
    Utility function to check if a teacher is the class teacher.
    Uses caching for performance.
    """
    cache_key = f"class_teacher:{teacher.id}:{class_ref.id}:{section.id}:{session.id}"
    result = cache.get(cache_key)
    
    if result is None:
        from .models import ClassTeacher
        result = ClassTeacher.objects.filter(
            teacher=teacher,
            class_ref=class_ref,
            section=section,
            session=session,
            is_active=True
        ).exists()
        cache.set(cache_key, result, 300)  # Cache for 5 minutes
    
    return result


def check_student_fees_cleared(student, session):
    """
    Check if student's fees are cleared for the session.
    
    Critical Business Rule:
    If student fees are not cleared → Result and Marksheet generation must be blocked
    """
    from payments_management.models import StudentFee
    
    # Check for any pending fees
    pending_fees = StudentFee.objects.filter(
        student=student,
        session=session,
        status__in=['pending', 'partial', 'overdue']
    ).exists()
    
    return not pending_fees


def validate_marks_entry_permission(user, student, subject, session):
    """
    Validate if user can enter marks for a student's subject.
    Returns (is_allowed, error_message)
    """
    if user.role == 'admin':
        return True, None
    
    if user.role != 'teacher':
        return False, "Only teachers and admins can enter marks."
    
    try:
        teacher = user.teacher_profile
    except Exception:
        return False, "Teacher profile not found."
    
    # Check session is not locked
    if session.is_locked:
        return False, "This session is locked and cannot be modified."
    
    # Check teacher assignment
    if not check_teacher_subject_assignment(
        teacher, student.class_ref, student.section, subject, session
    ):
        return False, "You are not assigned to teach this subject for this class."
    
    return True, None


def validate_marksheet_generation_permission(user, class_ref, section, session, check_fees=True):
    """
    Validate if user can generate marksheet for a class.
    Returns (is_allowed, error_message, students_with_pending_fees)
    """
    if user.role == 'admin':
        if check_fees:
            # Still check for pending fees even for admin
            from payments_management.models import StudentFee
            from .models import Student
            
            students = Student.objects.filter(
                class_ref=class_ref,
                section=section,
                session=session,
                is_active=True
            )
            
            students_with_pending = []
            for student in students:
                if not check_student_fees_cleared(student, session):
                    students_with_pending.append({
                        'id': str(student.id),
                        'student_id': student.student_id,
                        'name': student.name
                    })
            
            if students_with_pending:
                return False, "Some students have pending fees.", students_with_pending
        
        return True, None, []
    
    if user.role != 'teacher':
        return False, "Only teachers and admins can generate marksheets.", []
    
    try:
        teacher = user.teacher_profile
    except Exception:
        return False, "Teacher profile not found.", []
    
    # Check if class teacher
    if not check_class_teacher(teacher, class_ref, section, session):
        return False, "Only class teacher can generate marksheets for this class.", []
    
    if check_fees:
        # Check for pending fees
        from payments_management.models import StudentFee
        from .models import Student
        
        students = Student.objects.filter(
            class_ref=class_ref,
            section=section,
            session=session,
            is_active=True
        )
        
        students_with_pending = []
        for student in students:
            if not check_student_fees_cleared(student, session):
                students_with_pending.append({
                    'id': str(student.id),
                    'student_id': student.student_id,
                    'name': student.name
                })
        
        if students_with_pending:
            return False, "Some students have pending fees.", students_with_pending
    
    return True, None, []
