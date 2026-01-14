"""
Views for Core Services API.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.core.cache import cache
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import hashlib

from .models import (
    CustomUser, Admin, Teacher, Session, Class, Section,
    Subject, CocurricularSubject, OptionalSubject, ClassSubjectAssignment,
    ClassOptionalConfig, ClassOptionalAssignment, ClassCocurricularConfig,
    ClassMarksDistribution, SchoolConfig, Student, TeacherAssignment
)
from .serializers import (
    UserSerializer, AdminSerializer, TeacherSerializer, TeacherCreateSerializer,
    LoginSerializer, SessionSerializer, ClassSerializer, SectionSerializer,
    SectionCreateSerializer, SubjectSerializer, CocurricularSubjectSerializer,
    OptionalSubjectSerializer, ClassSubjectAssignmentSerializer,
    ClassOptionalConfigSerializer, ClassOptionalAssignmentSerializer,
    ClassCocurricularConfigSerializer, ClassMarksDistributionSerializer,
    SchoolConfigSerializer, StudentSerializer, StudentCreateSerializer,
    StudentDetailSerializer, BulkStudentCreateSerializer,
    StudentLoginSerializer, TeacherAssignmentSerializer, TeacherAssignmentCreateSerializer
)
from .cache_utils import CacheMixin, CACHE_TTL_LONG, CACHE_TTL_MEDIUM, invalidate_model_cache


# ============================================================================
# HEALTH CHECK
# ============================================================================

class HealthCheckView(APIView):
    """
    Public health check endpoint.
    Returns basic API status without requiring authentication.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = []  # No throttling for health checks
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'version': '1.0',
        }, status=status.HTTP_200_OK)


# ============================================================================
# SECURITY: Custom Throttles
# ============================================================================

class LoginRateThrottle(AnonRateThrottle):
    """
    Strict rate limiting for login attempts.
    5 attempts per minute per IP to prevent brute force attacks.
    """
    rate = '5/minute'
    
    def get_cache_key(self, request, view):
        # Use IP + email hash for rate limiting
        ident = self.get_ident(request)
        email = request.data.get('email', '')
        if email:
            email_hash = hashlib.md5(email.lower().encode()).hexdigest()[:8]
            ident = f"{ident}:{email_hash}"
        return self.cache_format % {'scope': 'login', 'ident': ident}


class IsAdminUser(permissions.BasePermission):
    """Permission class to check if user is admin."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


# ============================================================================
# SECURITY: Failed Login Tracking
# ============================================================================

MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_TIME = 300  # 5 minutes in seconds


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_login_attempt_key(ip, email):
    """Generate cache key for login attempt tracking."""
    email_hash = hashlib.md5(email.lower().encode()).hexdigest()[:16]
    return f"login_attempt:{ip}:{email_hash}"


def check_login_blocked(ip, email):
    """Check if login is blocked due to too many failed attempts."""
    key = get_login_attempt_key(ip, email)
    attempts = cache.get(key, {'count': 0, 'blocked_until': None})
    
    if attempts.get('blocked_until'):
        import time
        if time.time() < attempts['blocked_until']:
            return True, int(attempts['blocked_until'] - time.time())
    return False, 0


def record_failed_login(ip, email):
    """Record a failed login attempt."""
    import time
    key = get_login_attempt_key(ip, email)
    attempts = cache.get(key, {'count': 0, 'blocked_until': None})
    
    attempts['count'] = attempts.get('count', 0) + 1
    
    if attempts['count'] >= MAX_LOGIN_ATTEMPTS:
        attempts['blocked_until'] = time.time() + LOGIN_LOCKOUT_TIME
    
    cache.set(key, attempts, LOGIN_LOCKOUT_TIME * 2)
    return attempts['count']


def clear_failed_logins(ip, email):
    """Clear failed login attempts after successful login."""
    key = get_login_attempt_key(ip, email)
    cache.delete(key)


class LoginView(APIView):
    """
    View for user login with security features:
    - Rate limiting (5 attempts per minute per IP+email)
    - Account lockout after 5 failed attempts (5 minute lockout)
    - Clear failed attempts on successful login
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request):
        ip = get_client_ip(request)
        email = request.data.get('email', '')
        
        # Check if blocked
        is_blocked, remaining_seconds = check_login_blocked(ip, email)
        if is_blocked:
            return Response({
                'error': 'Too many failed login attempts.',
                'message': f'Account temporarily locked. Try again in {remaining_seconds // 60} minutes.',
                'retry_after': remaining_seconds
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            # Record failed attempt
            attempts = record_failed_login(ip, email)
            remaining = MAX_LOGIN_ATTEMPTS - attempts
            
            error_response = {
                'error': 'Invalid credentials',
                'detail': serializer.errors,
            }
            
            if remaining > 0:
                error_response['message'] = f'{remaining} attempts remaining before lockout.'
            else:
                error_response['message'] = 'Account temporarily locked due to too many failed attempts.'
            
            return Response(error_response, status=status.HTTP_401_UNAUTHORIZED)
        
        user = serializer.validated_data['user']
        
        # Clear failed attempts on successful login
        clear_failed_logins(ip, email)
        
        refresh = RefreshToken.for_user(user)
        
        # Get user profile
        teacher = None
        admin = None
        
        if hasattr(user, 'teacher_profile'):
            teacher = TeacherSerializer(user.teacher_profile).data
        if hasattr(user, 'admin_profile'):
            admin = AdminSerializer(user.admin_profile).data
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'teacher': teacher,
            'admin': admin
        })


class LogoutView(APIView):
    """View for user logout."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """View to get current user profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        teacher = None
        admin = None
        
        if hasattr(user, 'teacher_profile'):
            teacher = TeacherSerializer(user.teacher_profile).data
        if hasattr(user, 'admin_profile'):
            admin = AdminSerializer(user.admin_profile).data
        
        return Response({
            'user': UserSerializer(user).data,
            'teacher': teacher,
            'admin': admin
        })


class SessionViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for sessions."""
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    cache_key_prefix = 'sessions'
    cache_timeout = CACHE_TTL_LONG
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('session')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('session')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('session')


class ClassViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for classes."""
    queryset = Class.objects.prefetch_related('sections')
    serializer_class = ClassSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['level', 'name']
    ordering = ['level']
    cache_key_prefix = 'classes'
    cache_timeout = CACHE_TTL_LONG
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('class')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('class')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('class')
    
    @action(detail=True, methods=['get'], url_path='config')
    def get_config(self, request, pk=None):
        """Get all configurations for a class in a single request."""
        class_obj = self.get_object()
        
        # Get all configs in parallel using select_related where applicable
        sections = list(class_obj.sections.all())
        subject_assignments = list(ClassSubjectAssignment.objects.filter(
            class_ref=class_obj
        ).select_related('subject'))
        optional_config = ClassOptionalConfig.objects.filter(class_ref=class_obj).first()
        optional_assignments = list(ClassOptionalAssignment.objects.filter(
            class_ref=class_obj
        ).select_related('optional_subject'))
        cocurricular_config = ClassCocurricularConfig.objects.filter(class_ref=class_obj).first()
        marks_distribution = ClassMarksDistribution.objects.filter(class_ref=class_obj).first()
        
        return Response({
            'class': ClassSerializer(class_obj).data,
            'sections': SectionSerializer(sections, many=True).data,
            'subject_assignments': ClassSubjectAssignmentSerializer(subject_assignments, many=True).data,
            'optional_config': ClassOptionalConfigSerializer(optional_config).data if optional_config else None,
            'optional_assignments': ClassOptionalAssignmentSerializer(optional_assignments, many=True).data,
            'cocurricular_config': ClassCocurricularConfigSerializer(cocurricular_config).data if cocurricular_config else None,
            'marks_distribution': ClassMarksDistributionSerializer(marks_distribution).data if marks_distribution else None,
        })


class SectionViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for sections."""
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['class_ref']
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']
    cache_key_prefix = 'sections'
    cache_timeout = CACHE_TTL_LONG
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return SectionCreateSerializer
        return SectionSerializer
    
    def get_queryset(self):
        queryset = Section.objects.select_related('class_ref')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('section')
        invalidate_model_cache('class')  # Also invalidate class cache as sections are nested
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('section')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('section')
        invalidate_model_cache('class')


class SubjectViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for subjects."""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']
    cache_key_prefix = 'subjects'
    cache_timeout = CACHE_TTL_LONG
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('subject')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('subject')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('subject')


class CocurricularSubjectViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for co-curricular subjects."""
    queryset = CocurricularSubject.objects.all()
    serializer_class = CocurricularSubjectSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    ordering = ['name']
    cache_key_prefix = 'cocurricular_subjects'
    cache_timeout = CACHE_TTL_LONG
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('cocurricularsubject')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('cocurricularsubject')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('cocurricularsubject')


class OptionalSubjectViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for optional subjects."""
    queryset = OptionalSubject.objects.all()
    serializer_class = OptionalSubjectSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    ordering = ['name']
    cache_key_prefix = 'optional_subjects'
    cache_timeout = CACHE_TTL_LONG
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('optionalsubject')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('optionalsubject')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('optionalsubject')


class ClassSubjectAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for class-subject assignments."""
    queryset = ClassSubjectAssignment.objects.all()
    serializer_class = ClassSubjectAssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref', 'subject', 'is_required']
    
    def get_queryset(self):
        queryset = ClassSubjectAssignment.objects.select_related('subject', 'class_ref')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['class_id'] = self.request.data.get('class_id')
        return context

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """
        Bulk update subject assignments for a class.
        """
        class_id = request.data.get('class_id')
        subject_ids = request.data.get('subject_ids', [])
        
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get current assignments
        current_assignments = ClassSubjectAssignment.objects.filter(class_ref_id=class_id)
        current_subject_ids = set(str(a.subject_id) for a in current_assignments)
        new_subject_ids = set(str(sid) for sid in subject_ids)
        
        # Determine diffs
        to_create = new_subject_ids - current_subject_ids
        to_delete = current_subject_ids - new_subject_ids
        
        # Delete removed assignments
        if to_delete:
            ClassSubjectAssignment.objects.filter(
                class_ref_id=class_id,
                subject_id__in=to_delete
            ).delete()
            
        # Create new assignments
        new_assignments = []
        for subject_id in to_create:
            new_assignments.append(ClassSubjectAssignment(
                class_ref_id=class_id,
                subject_id=subject_id,
                is_required=True
            ))
            
        if new_assignments:
            ClassSubjectAssignment.objects.bulk_create(new_assignments)
            
        return Response({'status': 'success', 'message': 'Assignments updated successfully'})


class ClassOptionalConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for class optional configuration."""
    queryset = ClassOptionalConfig.objects.all()
    serializer_class = ClassOptionalConfigSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref', 'has_optional']
    
    def get_queryset(self):
        queryset = ClassOptionalConfig.objects.select_related('class_ref')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'], url_path='by-classes')
    def by_classes(self, request):
        """Get optional configs for multiple classes in one request."""
        class_ids = request.data.get('class_ids', [])
        if not class_ids:
            return Response([])
        
        configs = ClassOptionalConfig.objects.filter(
            class_ref_id__in=class_ids
        ).select_related('class_ref')
        
        return Response(ClassOptionalConfigSerializer(configs, many=True).data)


class ClassOptionalAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for class optional subject assignments."""
    queryset = ClassOptionalAssignment.objects.all()
    serializer_class = ClassOptionalAssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref', 'optional_subject']
    
    def get_queryset(self):
        queryset = ClassOptionalAssignment.objects.select_related('class_ref', 'optional_subject')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'], url_path='by-classes')
    def by_classes(self, request):
        """Get optional assignments for multiple classes in one request."""
        class_ids = request.data.get('class_ids', [])
        if not class_ids:
            return Response([])
        
        assignments = ClassOptionalAssignment.objects.filter(
            class_ref_id__in=class_ids
        ).select_related('class_ref', 'optional_subject')
        
        return Response(ClassOptionalAssignmentSerializer(assignments, many=True).data)


class ClassCocurricularConfigViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for class co-curricular configuration."""
    queryset = ClassCocurricularConfig.objects.all()
    serializer_class = ClassCocurricularConfigSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref', 'has_cocurricular']
    cache_key_prefix = 'cocurricular_config'
    cache_timeout = CACHE_TTL_LONG
    
    def get_queryset(self):
        queryset = ClassCocurricularConfig.objects.select_related('class_ref')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class ClassMarksDistributionViewSet(viewsets.ModelViewSet):
    """ViewSet for class marks distribution."""
    queryset = ClassMarksDistribution.objects.all()
    serializer_class = ClassMarksDistributionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref']
    ordering = ['created_at']
    
    def get_queryset(self):
        queryset = ClassMarksDistribution.objects.select_related('class_ref').order_by('created_at')
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'], url_path='by-classes')
    def by_classes(self, request):
        """Get marks distributions for multiple classes in one request."""
        class_ids = request.data.get('class_ids', [])
        if not class_ids:
            return Response([])
        
        distributions = ClassMarksDistribution.objects.filter(
            class_ref_id__in=class_ids
        ).select_related('class_ref').order_by('created_at')
        
        return Response(ClassMarksDistributionSerializer(distributions, many=True).data)


class SchoolConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for school configuration."""
    queryset = SchoolConfig.objects.all()
    serializer_class = SchoolConfigSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['class_ref', 'session']
    ordering = ['created_at']
    
    def get_queryset(self):
        queryset = SchoolConfig.objects.select_related('class_ref', 'session').order_by('created_at')
        class_id = self.request.query_params.get('class_id')
        session_id = self.request.query_params.get('session_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'], url_path='by-classes')
    def by_classes(self, request):
        """Get school configs for multiple classes in one request."""
        class_ids = request.data.get('class_ids', [])
        session_id = request.data.get('session_id')
        
        if not class_ids:
            return Response([])
        
        queryset = SchoolConfig.objects.filter(
            class_ref_id__in=class_ids
        ).select_related('class_ref', 'session').order_by('created_at')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return Response(SchoolConfigSerializer(queryset, many=True).data)


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for students."""
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['class_ref', 'section', 'session']
    search_fields = ['name', 'roll_no']
    ordering_fields = ['roll_no', 'name', 'created_at']
    ordering = ['roll_no']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudentDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return StudentCreateSerializer
        return StudentSerializer
    
    def get_queryset(self):
        queryset = Student.objects.select_related('class_ref', 'section', 'session')
        class_id = self.request.query_params.get('class_id')
        section_id = self.request.query_params.get('section_id')
        session_id = self.request.query_params.get('session_id')
        
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'bulk_create']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_create(self, request):
        """Bulk create students."""
        serializer = BulkStudentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        students = serializer.save()
        return Response(
            StudentSerializer(students, many=True).data,
            status=status.HTTP_201_CREATED
        )


class TeacherViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for teachers."""
    queryset = Teacher.objects.select_related('user')
    serializer_class = TeacherSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'user__email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    permission_classes = [IsAdminUser]
    cache_key_prefix = 'teachers'
    cache_timeout = CACHE_TTL_MEDIUM
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TeacherCreateSerializer
        return TeacherSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Delete teacher and associated user."""
        teacher = self.get_object()
        user = teacher.user
        teacher.delete()
        user.delete()
        invalidate_model_cache('teacher')
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('teacher')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('teacher')
    
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Send password reset email (placeholder for actual implementation)."""
        teacher = self.get_object()
        # In production, implement actual password reset email
        return Response({
            'message': f'Password reset instructions sent to {teacher.email}'
        })


class AdminViewSet(viewsets.ModelViewSet):
    """ViewSet for admins (read-only for safety)."""
    queryset = Admin.objects.select_related('user')
    serializer_class = AdminSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'head', 'options']


# ============================================================================
# STUDENT PORTAL API
# ============================================================================

class StudentLoginView(APIView):
    """
    View for student login.
    Students login with their student_id and password (default: DOB as DDMMYYYY).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request):
        ip = get_client_ip(request)
        student_id = request.data.get('student_id', '')
        
        # Check if blocked
        is_blocked, remaining_seconds = check_login_blocked(ip, f"student:{student_id}")
        if is_blocked:
            return Response({
                'error': 'Too many failed login attempts.',
                'message': f'Account temporarily locked. Try again in {remaining_seconds // 60} minutes.',
                'retry_after': remaining_seconds
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        serializer = StudentLoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            # Record failed attempt
            attempts = record_failed_login(ip, f"student:{student_id}")
            remaining = MAX_LOGIN_ATTEMPTS - attempts
            
            error_response = {
                'error': 'Invalid credentials',
                'detail': serializer.errors,
            }
            
            if remaining > 0:
                error_response['message'] = f'{remaining} attempts remaining before lockout.'
            else:
                error_response['message'] = 'Account temporarily locked due to too many failed attempts.'
            
            return Response(error_response, status=status.HTTP_401_UNAUTHORIZED)
        
        student = serializer.validated_data['student']
        
        # Clear failed attempts on successful login
        clear_failed_logins(ip, f"student:{student_id}")
        
        # Generate tokens for student (using a custom claim)
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Create a custom token for students
        refresh = RefreshToken()
        refresh['student_id'] = str(student.id)
        refresh['token_type'] = 'student'
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'student': StudentSerializer(student).data
        })


class StudentPortalView(APIView):
    """
    View for student portal - get current student's info.
    """
    permission_classes = [permissions.AllowAny]  # Custom token verification
    
    def get_student_from_token(self, request):
        """Extract student from custom JWT token."""
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        
        auth = JWTAuthentication()
        try:
            raw_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            validated_token = auth.get_validated_token(raw_token)
            
            if validated_token.get('token_type') != 'student':
                return None
            
            student_id = validated_token.get('student_id')
            if not student_id:
                return None
            
            return Student.objects.select_related(
                'class_ref', 'section', 'session'
            ).get(id=student_id)
        except (InvalidToken, TokenError, Student.DoesNotExist):
            return None
    
    def get(self, request):
        student = self.get_student_from_token(request)
        if not student:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response({
            'student': StudentSerializer(student).data
        })


class StudentFeesView(APIView):
    """
    View to get student's fees and payment information.
    """
    permission_classes = [permissions.AllowAny]
    
    def get_student_from_token(self, request):
        """Extract student from custom JWT token."""
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        
        auth = JWTAuthentication()
        try:
            raw_token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            validated_token = auth.get_validated_token(raw_token)
            
            if validated_token.get('token_type') != 'student':
                return None
            
            student_id = validated_token.get('student_id')
            if not student_id:
                return None
            
            return Student.objects.select_related(
                'class_ref', 'section', 'session'
            ).get(id=student_id)
        except (InvalidToken, TokenError, Student.DoesNotExist):
            return None
    
    def get(self, request):
        student = self.get_student_from_token(request)
        if not student:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Import payment models
        from payments_management.models import StudentFee, Payment
        from payments_management.serializers import StudentFeeSerializer, PaymentSerializer
        
        # Get student fees
        fees = StudentFee.objects.filter(student=student).select_related(
            'fee_structure', 'discount', 'session'
        ).order_by('-created_at')
        
        # Get student payments
        payments = Payment.objects.filter(student=student).order_by('-payment_date')[:10]
        
        # Calculate summary
        from django.db.models import Sum
        from decimal import Decimal
        
        fee_summary = fees.aggregate(
            total_gross=Sum('gross_amount'),
            total_discount=Sum('discount_amount'),
            total_net=Sum('net_amount'),
            total_paid=Sum('paid_amount')
        )
        
        total_net = fee_summary['total_net'] or Decimal('0.00')
        total_paid = fee_summary['total_paid'] or Decimal('0.00')
        
        return Response({
            'student': StudentSerializer(student).data,
            'fees': StudentFeeSerializer(fees, many=True).data,
            'payments': PaymentSerializer(payments, many=True).data,
            'summary': {
                'total_gross': str(fee_summary['total_gross'] or Decimal('0.00')),
                'total_discount': str(fee_summary['total_discount'] or Decimal('0.00')),
                'total_net': str(total_net),
                'total_paid': str(total_paid),
                'balance': str(total_net - total_paid)
            }
        })


# ============================================================================
# TEACHER ASSIGNMENTS API
# ============================================================================

class TeacherAssignmentViewSet(CacheMixin, viewsets.ModelViewSet):
    """ViewSet for teacher assignments."""
    queryset = TeacherAssignment.objects.select_related(
        'teacher', 'class_ref', 'section', 'subject', 'session'
    )
    serializer_class = TeacherAssignmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['teacher', 'class_ref', 'section', 'subject', 'session', 'is_active']
    search_fields = ['teacher__name', 'class_ref__name', 'subject__name']
    ordering_fields = ['created_at', 'teacher__name']
    ordering = ['-created_at']
    permission_classes = [IsAdminUser]
    cache_key_prefix = 'teacher_assignments'
    cache_timeout = CACHE_TTL_MEDIUM
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TeacherAssignmentCreateSerializer
        return TeacherAssignmentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by teacher_id for teacher's own assignments
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        
        # Support session_id query param (frontend uses session_id, not session)
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        # Support class_id and section_id query params
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        
        section_id = self.request.query_params.get('section_id')
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        
        return queryset
    
    def perform_create(self, serializer):
        super().perform_create(serializer)
        invalidate_model_cache('teacherassignment')
    
    def perform_update(self, serializer):
        super().perform_update(serializer)
        invalidate_model_cache('teacherassignment')
    
    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        invalidate_model_cache('teacherassignment')


class MyAssignmentsView(APIView):
    """
    View for teachers to get their own assignments.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if not hasattr(user, 'teacher_profile'):
            return Response({'error': 'User is not a teacher'}, status=status.HTTP_403_FORBIDDEN)
        
        teacher = user.teacher_profile
        
        # Get active session
        active_session = Session.objects.filter(is_active=True).first()
        
        # Get teacher's assignments
        assignments = TeacherAssignment.objects.filter(
            teacher=teacher,
            is_active=True
        )
        
        if active_session:
            assignments = assignments.filter(session=active_session)
        
        assignments = assignments.select_related(
            'class_ref', 'section', 'subject', 'session'
        ).order_by('class_ref__level', 'section__name', 'subject__name')
        
        return Response({
            'teacher': TeacherSerializer(teacher).data,
            'assignments': TeacherAssignmentSerializer(assignments, many=True).data,
            'session': SessionSerializer(active_session).data if active_session else None
        })


class MyPendingTasksView(APIView):
    """
    View for teachers to get their pending marks entry tasks.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if not hasattr(user, 'teacher_profile'):
            return Response({'error': 'User is not a teacher'}, status=status.HTTP_403_FORBIDDEN)
        
        teacher = user.teacher_profile
        
        # Get active session
        active_session = Session.objects.filter(is_active=True).first()
        if not active_session:
            return Response({
                'teacher': TeacherSerializer(teacher).data,
                'pending_tasks': [],
                'session': None
            })
        
        # Get teacher's assignments
        assignments = TeacherAssignment.objects.filter(
            teacher=teacher,
            session=active_session,
            is_active=True
        ).select_related('class_ref', 'section', 'subject')
        
        # Import result models
        from result_management.models import StudentResult
        
        pending_tasks = []
        
        for assignment in assignments:
            # Get students in this class-section
            students = Student.objects.filter(
                class_ref=assignment.class_ref,
                section=assignment.section,
                session=active_session,
                is_active=True
            )
            
            total_students = students.count()
            
            # Count students with results for this subject
            students_with_results = StudentResult.objects.filter(
                student__in=students,
                subject=assignment.subject,
                session=active_session
            ).count()
            
            # Calculate progress for each term
            # Check if marks are entered (non-zero obtained marks)
            results = StudentResult.objects.filter(
                student__in=students,
                subject=assignment.subject,
                session=active_session
            )
            
            first_term_entered = results.filter(
                first_summative_obtained__gt=0
            ).count() if results.exists() else 0
            
            second_term_entered = results.filter(
                second_summative_obtained__gt=0
            ).count() if results.exists() else 0
            
            third_term_entered = results.filter(
                third_summative_obtained__gt=0
            ).count() if results.exists() else 0
            
            pending_tasks.append({
                'assignment_id': str(assignment.id),
                'class_id': str(assignment.class_ref.id),
                'class_name': assignment.class_ref.name,
                'section_id': str(assignment.section.id),
                'section_name': assignment.section.name,
                'subject_id': str(assignment.subject.id),
                'subject_name': assignment.subject.name,
                'total_students': total_students,
                'first_term': {
                    'entered': first_term_entered,
                    'total': total_students,
                    'progress': round((first_term_entered / total_students * 100) if total_students else 0)
                },
                'second_term': {
                    'entered': second_term_entered,
                    'total': total_students,
                    'progress': round((second_term_entered / total_students * 100) if total_students else 0)
                },
                'third_term': {
                    'entered': third_term_entered,
                    'total': total_students,
                    'progress': round((third_term_entered / total_students * 100) if total_students else 0)
                }
            })
        
        return Response({
            'teacher': TeacherSerializer(teacher).data,
            'pending_tasks': pending_tasks,
            'session': SessionSerializer(active_session).data
        })


# ============================================================================
# ADMIN DASHBOARD API
# ============================================================================

class AdminDashboardStatsView(APIView):
    """
    View to get admin dashboard statistics.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        from django.db.models import Sum, Count
        from payments_management.models import StudentFee, Payment
        from result_management.models import StudentResult
        from decimal import Decimal
        
        # Get active session
        active_session = Session.objects.filter(is_active=True).first()
        
        # Basic counts
        total_students = Student.objects.filter(is_active=True).count()
        total_teachers = Teacher.objects.count()
        total_classes = Class.objects.count()
        
        # Session-specific counts
        session_students = 0
        if active_session:
            session_students = Student.objects.filter(
                session=active_session,
                is_active=True
            ).count()
        
        # Payment statistics
        fee_stats = StudentFee.objects.aggregate(
            total_fees=Sum('net_amount'),
            total_collected=Sum('paid_amount')
        )
        total_fees = fee_stats['total_fees'] or Decimal('0.00')
        total_collected = fee_stats['total_collected'] or Decimal('0.00')
        
        # Recent payments - use student_fee__student for the relationship
        recent_payments = Payment.objects.select_related(
            'student_fee', 'student_fee__student'
        ).order_by('-payment_date')[:5]
        
        from payments_management.serializers import PaymentSerializer
        
        # Class-wise student distribution
        class_distribution = Student.objects.filter(
            is_active=True
        ).values(
            'class_ref__name', 'class_ref__level'
        ).annotate(
            count=Count('id')
        ).order_by('class_ref__level')
        
        return Response({
            'session': SessionSerializer(active_session).data if active_session else None,
            'counts': {
                'total_students': total_students,
                'session_students': session_students,
                'total_teachers': total_teachers,
                'total_classes': total_classes
            },
            'fees': {
                'total_fees': str(total_fees),
                'total_collected': str(total_collected),
                'pending': str(total_fees - total_collected),
                'collection_rate': round((total_collected / total_fees * 100) if total_fees else 0, 1)
            },
            'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            'class_distribution': [
                {'class_name': item['class_ref__name'], 'count': item['count']}
                for item in class_distribution if item['class_ref__name']
            ]
        })


# ============================================================================
# STUDENT ENROLLMENT & LIFECYCLE MANAGEMENT
# ============================================================================

class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for student enrollments."""
    from .models import StudentEnrollment
    from .serializers import StudentEnrollmentSerializer, StudentEnrollmentCreateSerializer
    
    queryset = StudentEnrollment.objects.select_related(
        'student', 'class_ref', 'section', 'session'
    )
    serializer_class = StudentEnrollmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'session', 'class_ref', 'section', 'status']
    search_fields = ['student__name', 'student__student_id', 'roll_no']
    ordering_fields = ['roll_no', 'created_at']
    ordering = ['roll_no']
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            from .serializers import StudentEnrollmentCreateSerializer
            return StudentEnrollmentCreateSerializer
        from .serializers import StudentEnrollmentSerializer
        return StudentEnrollmentSerializer
    
    def get_queryset(self):
        from .models import StudentEnrollment
        queryset = StudentEnrollment.objects.select_related(
            'student', 'class_ref', 'section', 'session'
        )
        
        session_id = self.request.query_params.get('session_id')
        class_id = self.request.query_params.get('class_id')
        section_id = self.request.query_params.get('section_id')
        status_filter = self.request.query_params.get('status')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='promote')
    def promote(self, request):
        """Promote a single student."""
        from .serializers import StudentPromotionSerializer
        
        serializer = StudentPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_enrollment = serializer.save()
        
        from .serializers import StudentEnrollmentSerializer
        return Response(
            StudentEnrollmentSerializer(new_enrollment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'], url_path='bulk-promote')
    def bulk_promote(self, request):
        """Bulk promote students."""
        from .serializers import BulkPromotionSerializer, StudentEnrollmentSerializer
        
        serializer = BulkPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_enrollments = serializer.save()
        
        return Response(
            StudentEnrollmentSerializer(new_enrollments, many=True).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'], url_path='retain')
    def retain(self, request):
        """Retain a student in the same class."""
        from .serializers import StudentRetentionSerializer, StudentEnrollmentSerializer
        
        serializer = StudentRetentionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_enrollment = serializer.save()
        
        return Response(
            StudentEnrollmentSerializer(new_enrollment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer(self, request):
        """Transfer a student out."""
        from .serializers import StudentTransferSerializer, StudentEnrollmentSerializer
        
        serializer = StudentTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()
        
        return Response(
            StudentEnrollmentSerializer(enrollment).data,
            status=status.HTTP_200_OK
        )


# ============================================================================
# CLASS TEACHER MANAGEMENT
# ============================================================================

class ClassTeacherViewSet(viewsets.ModelViewSet):
    """ViewSet for class teacher assignments."""
    from .models import ClassTeacher
    from .serializers import ClassTeacherSerializer, ClassTeacherCreateSerializer
    
    queryset = ClassTeacher.objects.select_related(
        'teacher', 'class_ref', 'section', 'session'
    )
    serializer_class = ClassTeacherSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['teacher', 'class_ref', 'section', 'session', 'is_active']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            from .serializers import ClassTeacherCreateSerializer
            return ClassTeacherCreateSerializer
        from .serializers import ClassTeacherSerializer
        return ClassTeacherSerializer
    
    def get_queryset(self):
        from .models import ClassTeacher
        queryset = ClassTeacher.objects.select_related(
            'teacher', 'class_ref', 'section', 'session'
        )
        
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return queryset


# ============================================================================
# SESSION MANAGEMENT (Lock/Unlock)
# ============================================================================

class SessionLockView(APIView):
    """View to lock a session, preventing further modifications."""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        from .serializers import SessionLockSerializer
        
        serializer = SessionLockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        
        return Response({
            'message': f"Session '{session.name}' has been locked.",
            'session': SessionSerializer(session).data
        })


# ============================================================================
# COCURRICULAR & OPTIONAL TEACHER ASSIGNMENTS
# ============================================================================

class CocurricularTeacherAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for cocurricular teacher assignments."""
    from .models import CocurricularTeacherAssignment
    from .serializers import CocurricularTeacherAssignmentSerializer, CocurricularTeacherAssignmentCreateSerializer
    
    queryset = CocurricularTeacherAssignment.objects.select_related(
        'teacher', 'class_ref', 'section', 'cocurricular_subject', 'session'
    )
    serializer_class = CocurricularTeacherAssignmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['teacher', 'class_ref', 'section', 'cocurricular_subject', 'session', 'is_active']
    ordering = ['-created_at']
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            from .serializers import CocurricularTeacherAssignmentCreateSerializer
            return CocurricularTeacherAssignmentCreateSerializer
        from .serializers import CocurricularTeacherAssignmentSerializer
        return CocurricularTeacherAssignmentSerializer


class OptionalTeacherAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for optional teacher assignments."""
    from .models import OptionalTeacherAssignment
    from .serializers import OptionalTeacherAssignmentSerializer, OptionalTeacherAssignmentCreateSerializer
    
    queryset = OptionalTeacherAssignment.objects.select_related(
        'teacher', 'class_ref', 'section', 'optional_subject', 'session'
    )
    serializer_class = OptionalTeacherAssignmentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['teacher', 'class_ref', 'section', 'optional_subject', 'session', 'is_active']
    ordering = ['-created_at']
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            from .serializers import OptionalTeacherAssignmentCreateSerializer
            return OptionalTeacherAssignmentCreateSerializer
        from .serializers import OptionalTeacherAssignmentSerializer
        return OptionalTeacherAssignmentSerializer


# ============================================================================
# ENHANCED MARKSHEET GENERATION WITH FEE VALIDATION
# ============================================================================

class MarksheetGenerationView(APIView):
    """
    View for generating marksheets with fee validation.
    
    Critical Business Rule:
    If student fees are not cleared → Result and Marksheet generation must be blocked
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Generate marksheet for a student or class/section."""
        from .permissions import validate_marksheet_generation_permission, check_student_fees_cleared
        from result_management.models import StudentResult, StudentCocurricularResult, StudentOptionalResult
        from result_management.serializers import (
            StudentResultSerializer, StudentCocurricularResultSerializer, StudentOptionalResultSerializer
        )
        
        student_id = request.query_params.get('student_id')
        class_id = request.query_params.get('class_id')
        section_id = request.query_params.get('section_id')
        session_id = request.query_params.get('session_id')
        skip_fee_check = request.query_params.get('skip_fee_check', 'false').lower() == 'true'
        
        if student_id:
            # Single student marksheet
            try:
                student = Student.objects.select_related(
                    'class_ref', 'section', 'session'
                ).get(id=student_id)
            except Student.DoesNotExist:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
            
            session = Session.objects.get(id=session_id) if session_id else student.session
            
            # Check fee clearance
            if not skip_fee_check and not check_student_fees_cleared(student, session):
                return Response({
                    'error': 'Cannot generate marksheet',
                    'message': 'Student has pending fees. Please clear all dues before generating marksheet.',
                    'fee_status': 'pending'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get results
            results = StudentResult.objects.filter(
                student=student, session=session
            ).select_related('subject')
            
            cocurricular_results = StudentCocurricularResult.objects.filter(
                student=student, session=session
            ).select_related('cocurricular_subject')
            
            optional_results = StudentOptionalResult.objects.filter(
                student=student, session=session
            ).select_related('optional_subject')
            
            # Calculate totals
            total_marks = sum(r.total_marks for r in results)
            total_full_marks = sum(r.calculate_full_marks() for r in results)
            optional_total = sum(r.obtained_marks for r in optional_results)
            optional_full = sum(r.full_marks for r in optional_results)
            
            grand_total = total_marks + optional_total
            grand_full = total_full_marks + optional_full
            percentage = (grand_total / grand_full * 100) if grand_full > 0 else 0
            
            return Response({
                'student': StudentSerializer(student).data,
                'results': StudentResultSerializer(results, many=True).data,
                'cocurricular_results': StudentCocurricularResultSerializer(cocurricular_results, many=True).data,
                'optional_results': StudentOptionalResultSerializer(optional_results, many=True).data,
                'summary': {
                    'total_marks': total_marks,
                    'total_full_marks': total_full_marks,
                    'optional_total': optional_total,
                    'optional_full': optional_full,
                    'grand_total': grand_total,
                    'grand_full': grand_full,
                    'percentage': round(percentage, 2)
                },
                'fee_status': 'cleared'
            })
        
        elif all([class_id, section_id, session_id]):
            # Class/Section marksheet
            try:
                class_obj = Class.objects.get(id=class_id)
                section_obj = Section.objects.get(id=section_id)
                session_obj = Session.objects.get(id=session_id)
            except (Class.DoesNotExist, Section.DoesNotExist, Session.DoesNotExist):
                return Response({'error': 'Invalid class, section, or session'}, status=status.HTTP_404_NOT_FOUND)
            
            # Validate permission
            is_allowed, error_msg, students_with_pending = validate_marksheet_generation_permission(
                request.user, class_obj, section_obj, session_obj, check_fees=not skip_fee_check
            )
            
            if not is_allowed:
                return Response({
                    'error': 'Cannot generate marksheet',
                    'message': error_msg,
                    'students_with_pending_fees': students_with_pending
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all students
            students = Student.objects.filter(
                class_ref=class_obj,
                section=section_obj,
                session=session_obj,
                is_active=True
            ).order_by('roll_no')
            
            marksheet_data = []
            for student in students:
                results = StudentResult.objects.filter(
                    student=student, session=session_obj
                ).select_related('subject')
                
                optional_results = StudentOptionalResult.objects.filter(
                    student=student, session=session_obj
                )
                
                total_marks = sum(r.total_marks for r in results)
                total_full = sum(r.calculate_full_marks() for r in results)
                optional_total = sum(r.obtained_marks for r in optional_results)
                optional_full = sum(r.full_marks for r in optional_results)
                
                grand_total = total_marks + optional_total
                grand_full = total_full + optional_full
                percentage = (grand_total / grand_full * 100) if grand_full > 0 else 0
                
                marksheet_data.append({
                    'student': StudentSerializer(student).data,
                    'total_marks': grand_total,
                    'total_full_marks': grand_full,
                    'percentage': round(percentage, 2)
                })
            
            # Sort by percentage and assign positions
            sorted_data = sorted(marksheet_data, key=lambda x: x['percentage'], reverse=True)
            for i, item in enumerate(sorted_data):
                item['position'] = i + 1
            
            return Response({
                'class': ClassSerializer(class_obj).data,
                'section': SectionSerializer(section_obj).data,
                'session': SessionSerializer(session_obj).data,
                'students': sorted_data,
                'total_students': len(sorted_data)
            })
        
        return Response(
            {'error': 'Please provide student_id or class_id, section_id, and session_id'},
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================================
# TEACHER MARKS ENTRY AUTHORIZATION CHECK
# ============================================================================

class CheckMarksEntryAuthorizationView(APIView):
    """
    Check if current user can enter marks for a specific subject/class/section.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from .permissions import validate_marks_entry_permission
        
        class_id = request.query_params.get('class_id')
        section_id = request.query_params.get('section_id')
        subject_id = request.query_params.get('subject_id')
        session_id = request.query_params.get('session_id')
        
        if not all([class_id, section_id, subject_id, session_id]):
            return Response({
                'error': 'class_id, section_id, subject_id, and session_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            class_obj = Class.objects.get(id=class_id)
            section_obj = Section.objects.get(id=section_id)
            subject_obj = Subject.objects.get(id=subject_id)
            session_obj = Session.objects.get(id=session_id)
        except (Class.DoesNotExist, Section.DoesNotExist, Subject.DoesNotExist, Session.DoesNotExist):
            return Response({'error': 'Invalid IDs provided'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create a mock student object for permission check
        class MockStudent:
            def __init__(self, class_ref, section):
                self.class_ref = class_ref
                self.section = section
        
        mock_student = MockStudent(class_obj, section_obj)
        is_allowed, error_msg = validate_marks_entry_permission(
            request.user, mock_student, subject_obj, session_obj
        )
        
        return Response({
            'is_authorized': is_allowed,
            'error': error_msg,
            'class': ClassSerializer(class_obj).data,
            'section': SectionSerializer(section_obj).data,
            'subject': SubjectSerializer(subject_obj).data,
            'session': SessionSerializer(session_obj).data
        })

