"""
Views for Result Management API.

Authorization Rules (Backend-Enforced):
- Only assigned subject teacher may enter marks for that subject
- Only class teacher or admin may generate marksheets
- Admin has full academic override
- If student fees are not cleared → Result and Marksheet generation must be blocked
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, F

from .models import StudentResult, StudentCocurricularResult, StudentOptionalResult
from .serializers import (
    StudentResultSerializer, StudentResultCreateSerializer, StudentResultDetailSerializer,
    StudentResultUpsertSerializer, BulkStudentResultUpsertSerializer,
    StudentCocurricularResultSerializer, StudentCocurricularResultCreateSerializer,
    StudentCocurricularResultDetailSerializer, BulkStudentCocurricularResultUpsertSerializer,
    StudentOptionalResultSerializer, StudentOptionalResultCreateSerializer,
    StudentOptionalResultDetailSerializer, BulkStudentOptionalResultUpsertSerializer
)
from core_services.views import IsAdminUser
from core_services.models import Student, Subject
from core_services.permissions import (
    IsAdminOrTeacher, SessionNotLocked, 
    validate_marks_entry_permission, check_teacher_subject_assignment
)


class StudentResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for student results.
    
    Authorization:
    - Only assigned subject teacher may enter marks for that subject
    - Admin has full override
    """
    queryset = StudentResult.objects.all()
    serializer_class = StudentResultSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'subject', 'session', 'grade']
    search_fields = ['student__name', 'student__roll_no']
    ordering_fields = ['total_marks', 'grade', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsAdminOrTeacher, SessionNotLocked]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudentResultDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return StudentResultCreateSerializer
        return StudentResultSerializer
    
    def get_queryset(self):
        queryset = StudentResult.objects.select_related(
            'student', 'student__class_ref', 'student__section', 'subject', 'session'
        )
        student_id = self.request.query_params.get('student_id')
        subject_id = self.request.query_params.get('subject_id')
        session_id = self.request.query_params.get('session_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        """Create or update a single result with authorization check."""
        # Authorization check for teachers
        user = request.user
        if user.role == 'teacher':
            student_id = request.data.get('student_id')
            subject_id = request.data.get('subject_id')
            session_id = request.data.get('session_id')
            
            try:
                from core_services.models import Session
                student = Student.objects.select_related('class_ref', 'section').get(id=student_id)
                subject = Subject.objects.get(id=subject_id)
                session = Session.objects.get(id=session_id)
                
                is_allowed, error_msg = validate_marks_entry_permission(user, student, subject, session)
                if not is_allowed:
                    return Response({'error': error_msg}, status=status.HTTP_403_FORBIDDEN)
            except (Student.DoesNotExist, Subject.DoesNotExist, Session.DoesNotExist):
                return Response({'error': 'Invalid student, subject, or session ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = StudentResultUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(
            StudentResultSerializer(result).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='bulk-upsert')
    def bulk_upsert(self, request):
        """Bulk create or update results with authorization check."""
        # Authorization check for teachers
        user = request.user
        if user.role == 'teacher':
            results_data = request.data.get('results', [])
            if results_data:
                # Check first result's subject for authorization
                first_result = results_data[0]
                student_id = first_result.get('student_id')
                subject_id = first_result.get('subject_id')
                session_id = first_result.get('session_id')
                
                try:
                    from core_services.models import Session
                    student = Student.objects.select_related('class_ref', 'section').get(id=student_id)
                    subject = Subject.objects.get(id=subject_id)
                    session = Session.objects.get(id=session_id)
                    
                    is_allowed, error_msg = validate_marks_entry_permission(user, student, subject, session)
                    if not is_allowed:
                        return Response({'error': error_msg}, status=status.HTTP_403_FORBIDDEN)
                except (Student.DoesNotExist, Subject.DoesNotExist, Session.DoesNotExist):
                    return Response({'error': 'Invalid student, subject, or session ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = BulkStudentResultUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            StudentResultSerializer(results, many=True).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='by-students')
    def by_students(self, request):
        """Get results for multiple students in one request."""
        student_ids = request.data.get('student_ids', [])
        session_id = request.data.get('session_id')
        
        if not student_ids:
            return Response([])
        
        queryset = StudentResult.objects.filter(
            student_id__in=student_ids
        ).select_related('student', 'subject', 'session')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return Response(StudentResultSerializer(queryset, many=True).data)
    
    @action(detail=False, methods=['get'], url_path='by-class-section')
    def by_class_section(self, request):
        """Get results for a specific class/section/session/subject combination."""
        session_id = request.query_params.get('session_id')
        class_id = request.query_params.get('class_id')
        section_id = request.query_params.get('section_id')
        subject_id = request.query_params.get('subject_id')
        
        if not all([session_id, class_id, section_id, subject_id]):
            return Response(
                {'error': 'session_id, class_id, section_id, and subject_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get students in the class/section/session
        students = Student.objects.filter(
            session_id=session_id,
            class_ref_id=class_id,
            section_id=section_id
        ).order_by('roll_no')
        
        # Get existing results
        results = StudentResult.objects.filter(
            session_id=session_id,
            subject_id=subject_id,
            student__in=students
        ).select_related('student', 'subject', 'session')
        
        # Create result dict for quick lookup
        result_dict = {str(r.student_id): r for r in results}
        
        # Combine students with results
        response_data = []
        for student in students:
            student_data = {
                'id': str(student.id),
                'roll_no': student.roll_no,
                'name': student.name,
                'result': None
            }
            if str(student.id) in result_dict:
                student_data['result'] = StudentResultSerializer(result_dict[str(student.id)]).data
            response_data.append(student_data)
        
        return Response(response_data)


class StudentCocurricularResultViewSet(viewsets.ModelViewSet):
    """ViewSet for student co-curricular results."""
    queryset = StudentCocurricularResult.objects.all()
    serializer_class = StudentCocurricularResultSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'cocurricular_subject', 'session', 'overall_grade']
    search_fields = ['student__name', 'student__roll_no']
    ordering_fields = ['overall_grade', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudentCocurricularResultDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return StudentCocurricularResultCreateSerializer
        return StudentCocurricularResultSerializer
    
    def get_queryset(self):
        queryset = StudentCocurricularResult.objects.select_related(
            'student', 'student__class_ref', 'student__section', 'cocurricular_subject', 'session'
        )
        student_id = self.request.query_params.get('student_id')
        session_id = self.request.query_params.get('session_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        """Create or update a single co-curricular result."""
        student_id = request.data.get('student_id')
        cocurricular_subject_id = request.data.get('cocurricular_subject_id')
        session_id = request.data.get('session_id')
        
        defaults = {
            k: v for k, v in request.data.items()
            if k not in ['student_id', 'cocurricular_subject_id', 'session_id']
        }
        
        result, created = StudentCocurricularResult.objects.update_or_create(
            student_id=student_id,
            cocurricular_subject_id=cocurricular_subject_id,
            session_id=session_id,
            defaults=defaults
        )
        
        return Response(
            StudentCocurricularResultSerializer(result).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='by-students')
    def by_students(self, request):
        """Get cocurricular results for multiple students in one request."""
        student_ids = request.data.get('student_ids', [])
        session_id = request.data.get('session_id')
        
        if not student_ids:
            return Response([])
        
        queryset = StudentCocurricularResult.objects.filter(
            student_id__in=student_ids
        ).select_related('student', 'cocurricular_subject', 'session')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return Response(StudentCocurricularResultSerializer(queryset, many=True).data)
    
    @action(detail=False, methods=['post'], url_path='bulk-upsert')
    def bulk_upsert(self, request):
        """Bulk create or update co-curricular results."""
        serializer = BulkStudentCocurricularResultUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            StudentCocurricularResultSerializer(results, many=True).data,
            status=status.HTTP_200_OK
        )


class StudentOptionalResultViewSet(viewsets.ModelViewSet):
    """ViewSet for student optional results."""
    queryset = StudentOptionalResult.objects.all()
    serializer_class = StudentOptionalResultSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'optional_subject', 'session', 'grade']
    search_fields = ['student__name', 'student__roll_no']
    ordering_fields = ['obtained_marks', 'grade', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StudentOptionalResultDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return StudentOptionalResultCreateSerializer
        return StudentOptionalResultSerializer
    
    def get_queryset(self):
        queryset = StudentOptionalResult.objects.select_related(
            'student', 'student__class_ref', 'student__section', 'optional_subject', 'session'
        )
        student_id = self.request.query_params.get('student_id')
        session_id = self.request.query_params.get('session_id')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        """Create or update a single optional result."""
        student_id = request.data.get('student_id')
        optional_subject_id = request.data.get('optional_subject_id')
        session_id = request.data.get('session_id')
        
        defaults = {
            k: v for k, v in request.data.items()
            if k not in ['student_id', 'optional_subject_id', 'session_id']
        }
        
        result, created = StudentOptionalResult.objects.update_or_create(
            student_id=student_id,
            optional_subject_id=optional_subject_id,
            session_id=session_id,
            defaults=defaults
        )
        
        return Response(
            StudentOptionalResultSerializer(result).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='bulk-upsert')
    def bulk_upsert(self, request):
        """Bulk create or update optional results."""
        serializer = BulkStudentOptionalResultUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            StudentOptionalResultSerializer(results, many=True).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='by-students')
    def by_students(self, request):
        """Get optional results for multiple students in one request."""
        student_ids = request.data.get('student_ids', [])
        session_id = request.data.get('session_id')
        
        if not student_ids:
            return Response([])
        
        queryset = StudentOptionalResult.objects.filter(
            student_id__in=student_ids
        ).select_related('student', 'optional_subject', 'session')
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        return Response(StudentOptionalResultSerializer(queryset, many=True).data)


class MarksheetView(viewsets.ViewSet):
    """ViewSet for generating marksheets."""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/.]+)')
    def student_marksheet(self, request, student_id=None):
        """Get complete marksheet data for a student."""
        session_id = request.query_params.get('session_id')
        
        try:
            student = Student.objects.select_related(
                'class_ref', 'section', 'session'
            ).get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get regular results
        results_query = StudentResult.objects.filter(student=student)
        if session_id:
            results_query = results_query.filter(session_id=session_id)
        results = results_query.select_related('subject', 'session')
        
        # Get co-curricular results
        cocurricular_query = StudentCocurricularResult.objects.filter(student=student)
        if session_id:
            cocurricular_query = cocurricular_query.filter(session_id=session_id)
        cocurricular_results = cocurricular_query.select_related('cocurricular_subject', 'session')
        
        # Get optional results
        optional_query = StudentOptionalResult.objects.filter(student=student)
        if session_id:
            optional_query = optional_query.filter(session_id=session_id)
        optional_results = optional_query.select_related('optional_subject', 'session')
        
        # Calculate totals
        total_marks = sum(r.total_marks for r in results)
        total_full_marks = sum(r.calculate_full_marks() for r in results)
        optional_total = sum(r.obtained_marks for r in optional_results)
        optional_full = sum(r.full_marks for r in optional_results)
        
        grand_total = total_marks + optional_total
        grand_full = total_full_marks + optional_full
        percentage = (grand_total / grand_full * 100) if grand_full > 0 else 0
        
        # Calculate overall grade
        if percentage >= 90:
            overall_grade = 'AA'
        elif percentage >= 75:
            overall_grade = 'A+'
        elif percentage >= 60:
            overall_grade = 'A'
        elif percentage >= 45:
            overall_grade = 'B+'
        elif percentage >= 34:
            overall_grade = 'B'
        elif percentage >= 25:
            overall_grade = 'C'
        else:
            overall_grade = 'D'
        
        return Response({
            'student': {
                'id': str(student.id),
                'roll_no': student.roll_no,
                'name': student.name,
                'class': student.class_ref.name if student.class_ref else None,
                'section': student.section.name if student.section else None,
                'session': student.session.name if student.session else None,
            },
            'results': StudentResultDetailSerializer(results, many=True).data,
            'cocurricular_results': StudentCocurricularResultDetailSerializer(
                cocurricular_results, many=True
            ).data,
            'optional_results': StudentOptionalResultDetailSerializer(
                optional_results, many=True
            ).data,
            'summary': {
                'total_marks': total_marks,
                'total_full_marks': total_full_marks,
                'optional_total': optional_total,
                'optional_full': optional_full,
                'grand_total': grand_total,
                'grand_full': grand_full,
                'percentage': round(percentage, 2),
                'overall_grade': overall_grade
            }
        })
    
    @action(detail=False, methods=['get'], url_path='class-section')
    def class_marksheet(self, request):
        """Get marksheet data for all students in a class/section."""
        session_id = request.query_params.get('session_id')
        class_id = request.query_params.get('class_id')
        section_id = request.query_params.get('section_id')
        
        if not all([session_id, class_id, section_id]):
            return Response(
                {'error': 'session_id, class_id, and section_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        students = Student.objects.filter(
            session_id=session_id,
            class_ref_id=class_id,
            section_id=section_id
        ).select_related('class_ref', 'section', 'session').order_by('roll_no')
        
        student_ids = list(students.values_list('id', flat=True))
        
        # Prefetch all results in bulk to avoid N+1 queries
        all_results = StudentResult.objects.filter(
            student_id__in=student_ids, session_id=session_id
        ).select_related('subject')
        
        all_optional_results = StudentOptionalResult.objects.filter(
            student_id__in=student_ids, session_id=session_id
        ).select_related('optional_subject')
        
        # Group results by student_id for quick lookup
        results_by_student = {}
        for result in all_results:
            if result.student_id not in results_by_student:
                results_by_student[result.student_id] = []
            results_by_student[result.student_id].append(result)
        
        optional_by_student = {}
        for result in all_optional_results:
            if result.student_id not in optional_by_student:
                optional_by_student[result.student_id] = []
            optional_by_student[result.student_id].append(result)
        
        marksheet_data = []
        for student in students:
            # Get results from prefetched data
            results = results_by_student.get(student.id, [])
            optional_results = optional_by_student.get(student.id, [])
            
            # Calculate totals
            total_marks = sum(r.total_marks for r in results)
            total_full_marks = sum(r.calculate_full_marks() for r in results)
            optional_total = sum(r.obtained_marks for r in optional_results)
            optional_full = sum(r.full_marks for r in optional_results)
            
            grand_total = total_marks + optional_total
            grand_full = total_full_marks + optional_full
            percentage = (grand_total / grand_full * 100) if grand_full > 0 else 0
            
            marksheet_data.append({
                'id': str(student.id),
                'roll_no': student.roll_no,
                'name': student.name,
                'total_marks': grand_total,
                'total_full_marks': grand_full,
                'percentage': round(percentage, 2),
                'results': StudentResultSerializer(results, many=True).data,
                'optional_results': StudentOptionalResultSerializer(optional_results, many=True).data
            })
        
        # Sort by percentage and assign positions
        sorted_data = sorted(marksheet_data, key=lambda x: x['percentage'], reverse=True)
        for i, student_data in enumerate(sorted_data):
            student_data['position'] = i + 1
        
        return Response(sorted_data)
