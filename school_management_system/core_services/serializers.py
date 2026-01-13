"""
Serializers for Core Services API.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from .models import (
    CustomUser, Admin, Teacher, Session, Class, Section,
    Subject, CocurricularSubject, OptionalSubject, ClassSubjectAssignment,
    ClassOptionalConfig, ClassOptionalAssignment, ClassCocurricularConfig,
    ClassMarksDistribution, SchoolConfig, Student, TeacherAssignment,
    StudentEnrollment, ClassTeacher, CocurricularTeacherAssignment, OptionalTeacherAssignment
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user basic information."""
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'role', 'is_active']
        read_only_fields = ['id', 'is_active']


class AdminSerializer(serializers.ModelSerializer):
    """Serializer for admin profiles."""
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Admin
        fields = ['id', 'email', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for teacher profiles."""
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Teacher
        fields = ['id', 'email', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeacherCreateSerializer(serializers.Serializer):
    """Serializer for creating a new teacher with user account."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    name = serializers.CharField(max_length=255)
    
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            password=validated_data['password'],
            role='teacher'
        )
        teacher = Teacher.objects.create(
            user=user,
            name=validated_data['name']
        )
        return teacher


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid login credentials.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
            data['user'] = user
        else:
            raise serializers.ValidationError("Must include 'email' and 'password'.")
        
        return data


class SessionSerializer(serializers.ModelSerializer):
    """Serializer for academic sessions."""
    class Meta:
        model = Session
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassSerializer(serializers.ModelSerializer):
    """Serializer for classes."""
    class Meta:
        model = Class
        fields = ['id', 'name', 'level', 'created_at']
        read_only_fields = ['id', 'created_at']


class SectionSerializer(serializers.ModelSerializer):
    """Serializer for sections."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'class_id', 'class_name', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        class_id = self.context.get('class_id') or self.initial_data.get('class_id')
        if class_id:
            validated_data['class_ref'] = Class.objects.get(id=class_id)
        return super().create(validated_data)


class SectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sections with class_id."""
    class_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'class_id', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        class_id = validated_data.pop('class_id')
        validated_data['class_ref'] = Class.objects.get(id=class_id)
        return super().create(validated_data)


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer for subjects."""
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'full_marks', 'created_at']
        read_only_fields = ['id', 'created_at']


class CocurricularSubjectSerializer(serializers.ModelSerializer):
    """Serializer for co-curricular subjects."""
    class Meta:
        model = CocurricularSubject
        fields = ['id', 'name', 'code', 'created_at']
        read_only_fields = ['id', 'created_at']


class OptionalSubjectSerializer(serializers.ModelSerializer):
    """Serializer for optional subjects."""
    class Meta:
        model = OptionalSubject
        fields = ['id', 'name', 'code', 'default_full_marks', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassSubjectAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for class-subject assignments."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = ClassSubjectAssignment
        fields = ['id', 'class_id', 'subject', 'subject_id', 'is_required', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        subject_id = validated_data.pop('subject_id')
        class_id = self.context.get('class_id') or self.initial_data.get('class_id')
        subject = Subject.objects.get(id=subject_id)
        class_ref = Class.objects.get(id=class_id) if class_id else None
        
        # Use get_or_create to handle duplicates gracefully
        instance, created = ClassSubjectAssignment.objects.get_or_create(
            class_ref=class_ref,
            subject=subject,
            defaults={'is_required': validated_data.get('is_required', True)}
        )
        
        # If it already exists, update is_required if provided
        if not created and 'is_required' in validated_data:
            instance.is_required = validated_data['is_required']
            instance.save()
        
        return instance


class ClassOptionalConfigSerializer(serializers.ModelSerializer):
    """Serializer for class optional configuration."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    
    class Meta:
        model = ClassOptionalConfig
        fields = ['id', 'class_id', 'has_optional', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassOptionalAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for class optional subject assignments."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    optional_subject = OptionalSubjectSerializer(read_only=True)
    optional_subject_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = ClassOptionalAssignment
        fields = ['id', 'class_id', 'optional_subject', 'optional_subject_id', 'full_marks', 'is_required', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        optional_subject_id = validated_data.pop('optional_subject_id')
        class_id = self.context.get('class_id') or self.initial_data.get('class_id')
        optional_subject = OptionalSubject.objects.get(id=optional_subject_id)
        class_ref = Class.objects.get(id=class_id) if class_id else None
        
        # Use get_or_create to handle duplicates gracefully
        instance, created = ClassOptionalAssignment.objects.get_or_create(
            class_ref=class_ref,
            optional_subject=optional_subject,
            defaults={
                'full_marks': validated_data.get('full_marks', 100),
                'is_required': validated_data.get('is_required', True)
            }
        )
        
        # If it already exists, update fields if provided
        if not created:
            if 'full_marks' in validated_data:
                instance.full_marks = validated_data['full_marks']
            if 'is_required' in validated_data:
                instance.is_required = validated_data['is_required']
            instance.save()
        
        return instance


class ClassCocurricularConfigSerializer(serializers.ModelSerializer):
    """Serializer for class co-curricular configuration."""
    class_id = serializers.PrimaryKeyRelatedField(
        queryset=Class.objects.all(),
        source='class_ref'
    )
    
    class Meta:
        model = ClassCocurricularConfig
        fields = ['id', 'class_id', 'has_cocurricular', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassMarksDistributionSerializer(serializers.ModelSerializer):
    """Serializer for class marks distribution."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    total_marks = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ClassMarksDistribution
        fields = [
            'id', 'class_id',
            'first_summative_marks', 'first_formative_marks',
            'second_summative_marks', 'second_formative_marks',
            'third_summative_marks', 'third_formative_marks',
            'number_of_unit_tests', 'has_final_term',
            'unit_test_marks', 'formative_marks', 'final_term_marks',
            'total_marks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SchoolConfigSerializer(serializers.ModelSerializer):
    """Serializer for school configuration."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True, allow_null=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True, allow_null=True)
    
    class Meta:
        model = SchoolConfig
        fields = ['id', 'class_id', 'session_id', 'total_school_days', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for students."""
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True, allow_null=True)
    section_id = serializers.UUIDField(source='section.id', read_only=True, allow_null=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True, allow_null=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True, allow_null=True)
    section_name = serializers.CharField(source='section.name', read_only=True, allow_null=True)
    session_name = serializers.CharField(source='session.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'roll_no', 'name', 'date_of_birth',
            'father_name', 'mother_name', 'phone', 'address',
            'class_id', 'section_id', 'session_id',
            'class_name', 'section_name', 'session_name',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'student_id', 'created_at']


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating students."""
    class_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    section_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    session_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'roll_no', 'name', 'date_of_birth',
            'father_name', 'mother_name', 'phone', 'address',
            'class_id', 'section_id', 'session_id', 'password', 'created_at'
        ]
        read_only_fields = ['id', 'student_id', 'created_at']
    
    def create(self, validated_data):
        class_id = validated_data.pop('class_id', None)
        section_id = validated_data.pop('section_id', None)
        session_id = validated_data.pop('session_id', None)
        password = validated_data.pop('password', None)
        
        if class_id:
            validated_data['class_ref'] = Class.objects.get(id=class_id)
        if section_id:
            validated_data['section'] = Section.objects.get(id=section_id)
        if session_id:
            validated_data['session'] = Session.objects.get(id=session_id)
        
        student = super().create(validated_data)
        
        # Set password (custom or default DOB)
        if password:
            student.set_password(password)
            student.save()
        elif student.date_of_birth and not student.password_hash:
            student.set_default_password()
            student.save()
        
        return student
    
    def update(self, instance, validated_data):
        class_id = validated_data.pop('class_id', None)
        section_id = validated_data.pop('section_id', None)
        session_id = validated_data.pop('session_id', None)
        password = validated_data.pop('password', None)
        
        if class_id:
            instance.class_ref = Class.objects.get(id=class_id)
        if section_id:
            instance.section = Section.objects.get(id=section_id)
        if session_id:
            instance.session = Session.objects.get(id=session_id)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        return super().update(instance, validated_data)


class StudentDetailSerializer(StudentSerializer):
    """Detailed student serializer with related objects."""
    class_info = ClassSerializer(source='class_ref', read_only=True)
    section_info = SectionSerializer(source='section', read_only=True)
    session_info = SessionSerializer(source='session', read_only=True)
    
    class Meta(StudentSerializer.Meta):
        fields = StudentSerializer.Meta.fields + ['class_info', 'section_info', 'session_info']


class BulkStudentCreateSerializer(serializers.Serializer):
    """Serializer for bulk student creation."""
    students = StudentCreateSerializer(many=True)
    
    @transaction.atomic
    def create(self, validated_data):
        students_data = validated_data.get('students', [])
        if not students_data:
            return []
        
        # Collect all unique IDs to prefetch
        class_ids = set()
        section_ids = set()
        session_ids = set()
        
        for student_data in students_data:
            if 'class_id' in student_data and student_data['class_id']:
                class_ids.add(student_data['class_id'])
            if 'section_id' in student_data and student_data['section_id']:
                section_ids.add(student_data['section_id'])
            if 'session_id' in student_data and student_data['session_id']:
                session_ids.add(student_data['session_id'])
        
        # Prefetch all related objects in bulk
        classes_map = {c.id: c for c in Class.objects.filter(id__in=class_ids)} if class_ids else {}
        sections_map = {s.id: s for s in Section.objects.filter(id__in=section_ids)} if section_ids else {}
        sessions_map = {s.id: s for s in Session.objects.filter(id__in=session_ids)} if session_ids else {}
        
        # Prepare student objects for bulk creation
        student_objects = []
        
        for student_data in students_data:
            class_id = student_data.pop('class_id', None)
            section_id = student_data.pop('section_id', None)
            session_id = student_data.pop('session_id', None)
            
            student = Student(
                roll_no=student_data.get('roll_no'),
                name=student_data.get('name'),
                class_ref=classes_map.get(class_id) if class_id else None,
                section=sections_map.get(section_id) if section_id else None,
                session=sessions_map.get(session_id) if session_id else None
            )
            student_objects.append(student)
        
        # Bulk create all students in a single query
        created_students = Student.objects.bulk_create(student_objects)
        
        return created_students


class StudentLoginSerializer(serializers.Serializer):
    """Serializer for student login."""
    student_id = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        student_id = data.get('student_id')
        password = data.get('password')
        
        if not student_id or not password:
            raise serializers.ValidationError("Must include 'student_id' and 'password'.")
        
        try:
            student = Student.objects.select_related(
                'class_ref', 'section', 'session'
            ).get(student_id=student_id)
        except Student.DoesNotExist:
            raise serializers.ValidationError("Invalid student credentials.")
        
        if not student.is_active:
            raise serializers.ValidationError("Student account is disabled.")
        
        if not student.check_password(password):
            raise serializers.ValidationError("Invalid student credentials.")
        
        data['student'] = student
        return data


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for teacher assignments."""
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_id = serializers.UUIDField(source='section.id', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    subject_id = serializers.UUIDField(source='subject.id', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)
    
    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher_id', 'teacher_name',
            'class_id', 'class_name', 'section_id', 'section_name',
            'subject_id', 'subject_name', 'session_id', 'session_name',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TeacherAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating teacher assignments."""
    teacher_id = serializers.UUIDField(write_only=True)
    class_id = serializers.UUIDField(write_only=True)
    section_id = serializers.UUIDField(write_only=True)
    subject_id = serializers.UUIDField(write_only=True)
    session_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = TeacherAssignment
        fields = ['id', 'teacher_id', 'class_id', 'section_id', 'subject_id', 'session_id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        teacher_id = validated_data.pop('teacher_id')
        class_id = validated_data.pop('class_id')
        section_id = validated_data.pop('section_id')
        subject_id = validated_data.pop('subject_id')
        session_id = validated_data.pop('session_id')
        
        validated_data['teacher'] = Teacher.objects.get(id=teacher_id)
        validated_data['class_ref'] = Class.objects.get(id=class_id)
        validated_data['section'] = Section.objects.get(id=section_id)
        validated_data['subject'] = Subject.objects.get(id=subject_id)
        validated_data['session'] = Session.objects.get(id=session_id)
        
        return super().create(validated_data)


# ============================================================================
# Session-Based Enrollment Serializers
# ============================================================================

class SessionSerializer(serializers.ModelSerializer):
    """Serializer for academic sessions with lock status."""
    class Meta:
        model = Session
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'is_locked', 'created_at']
        read_only_fields = ['id', 'created_at']


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for student session enrollments."""
    student_id = serializers.UUIDField(source='student.id', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_permanent_id = serializers.CharField(source='student.student_id', read_only=True)
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_id = serializers.UUIDField(source='section.id', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)
    
    class Meta:
        model = StudentEnrollment
        fields = [
            'id', 'student_id', 'student_name', 'student_permanent_id',
            'session_id', 'session_name', 'class_id', 'class_name',
            'section_id', 'section_name', 'roll_no', 'status',
            'promotion_date', 'remarks', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StudentEnrollmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating student enrollments."""
    student_id = serializers.UUIDField(write_only=True)
    class_id = serializers.UUIDField(write_only=True)
    section_id = serializers.UUIDField(write_only=True)
    session_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = StudentEnrollment
        fields = ['id', 'student_id', 'session_id', 'class_id', 'section_id', 'roll_no', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        session = Session.objects.get(id=data['session_id'])
        if session.is_locked:
            raise serializers.ValidationError("Cannot create enrollment in a locked session.")
        return data
    
    def create(self, validated_data):
        student_id = validated_data.pop('student_id')
        class_id = validated_data.pop('class_id')
        section_id = validated_data.pop('section_id')
        session_id = validated_data.pop('session_id')
        
        validated_data['student'] = Student.objects.get(id=student_id)
        validated_data['class_ref'] = Class.objects.get(id=class_id)
        validated_data['section'] = Section.objects.get(id=section_id)
        validated_data['session'] = Session.objects.get(id=session_id)
        
        return super().create(validated_data)


class StudentPromotionSerializer(serializers.Serializer):
    """Serializer for promoting students to next class/session."""
    enrollment_id = serializers.UUIDField()
    new_class_id = serializers.UUIDField()
    new_section_id = serializers.UUIDField()
    new_session_id = serializers.UUIDField()
    new_roll_no = serializers.CharField(max_length=50)
    
    def validate(self, data):
        try:
            enrollment = StudentEnrollment.objects.get(id=data['enrollment_id'])
            if enrollment.status != 'active':
                raise serializers.ValidationError("Only active enrollments can be promoted.")
            data['enrollment'] = enrollment
        except StudentEnrollment.DoesNotExist:
            raise serializers.ValidationError("Enrollment not found.")
        
        try:
            new_session = Session.objects.get(id=data['new_session_id'])
            if new_session.is_locked:
                raise serializers.ValidationError("Cannot promote to a locked session.")
            data['new_session'] = new_session
        except Session.DoesNotExist:
            raise serializers.ValidationError("New session not found.")
        
        try:
            data['new_class'] = Class.objects.get(id=data['new_class_id'])
        except Class.DoesNotExist:
            raise serializers.ValidationError("New class not found.")
        
        try:
            data['new_section'] = Section.objects.get(id=data['new_section_id'])
        except Section.DoesNotExist:
            raise serializers.ValidationError("New section not found.")
        
        return data
    
    def create(self, validated_data):
        enrollment = validated_data['enrollment']
        return enrollment.promote_to_next_class(
            new_class=validated_data['new_class'],
            new_section=validated_data['new_section'],
            new_session=validated_data['new_session'],
            new_roll_no=validated_data['new_roll_no']
        )


class BulkPromotionSerializer(serializers.Serializer):
    """Serializer for bulk promoting students."""
    promotions = StudentPromotionSerializer(many=True)
    
    @transaction.atomic
    def create(self, validated_data):
        results = []
        for promotion_data in validated_data['promotions']:
            enrollment = promotion_data['enrollment']
            new_enrollment = enrollment.promote_to_next_class(
                new_class=promotion_data['new_class'],
                new_section=promotion_data['new_section'],
                new_session=promotion_data['new_session'],
                new_roll_no=promotion_data['new_roll_no']
            )
            results.append(new_enrollment)
        return results


class StudentRetentionSerializer(serializers.Serializer):
    """Serializer for retaining students in same class."""
    enrollment_id = serializers.UUIDField()
    new_session_id = serializers.UUIDField()
    new_roll_no = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate(self, data):
        try:
            enrollment = StudentEnrollment.objects.get(id=data['enrollment_id'])
            data['enrollment'] = enrollment
        except StudentEnrollment.DoesNotExist:
            raise serializers.ValidationError("Enrollment not found.")
        
        try:
            data['new_session'] = Session.objects.get(id=data['new_session_id'])
        except Session.DoesNotExist:
            raise serializers.ValidationError("New session not found.")
        
        return data
    
    def create(self, validated_data):
        enrollment = validated_data['enrollment']
        return enrollment.retain_in_same_class(
            new_session=validated_data['new_session'],
            new_roll_no=validated_data.get('new_roll_no')
        )


class StudentTransferSerializer(serializers.Serializer):
    """Serializer for transferring students out."""
    enrollment_id = serializers.UUIDField()
    remarks = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        try:
            enrollment = StudentEnrollment.objects.get(id=data['enrollment_id'])
            data['enrollment'] = enrollment
        except StudentEnrollment.DoesNotExist:
            raise serializers.ValidationError("Enrollment not found.")
        return data
    
    def create(self, validated_data):
        enrollment = validated_data['enrollment']
        enrollment.transfer_out(remarks=validated_data.get('remarks', ''))
        return enrollment


# ============================================================================
# Class Teacher Serializers
# ============================================================================

class ClassTeacherSerializer(serializers.ModelSerializer):
    """Serializer for class teacher assignments."""
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_id = serializers.UUIDField(source='section.id', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)
    
    class Meta:
        model = ClassTeacher
        fields = [
            'id', 'teacher_id', 'teacher_name',
            'class_id', 'class_name', 'section_id', 'section_name',
            'session_id', 'session_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ClassTeacherCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating class teacher assignments."""
    teacher_id = serializers.UUIDField(write_only=True)
    class_id = serializers.UUIDField(write_only=True)
    section_id = serializers.UUIDField(write_only=True)
    session_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = ClassTeacher
        fields = ['id', 'teacher_id', 'class_id', 'section_id', 'session_id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        teacher_id = validated_data.pop('teacher_id')
        class_id = validated_data.pop('class_id')
        section_id = validated_data.pop('section_id')
        session_id = validated_data.pop('session_id')
        
        validated_data['teacher'] = Teacher.objects.get(id=teacher_id)
        validated_data['class_ref'] = Class.objects.get(id=class_id)
        validated_data['section'] = Section.objects.get(id=section_id)
        validated_data['session'] = Session.objects.get(id=session_id)
        
        # Use update_or_create to handle unique constraint
        instance, created = ClassTeacher.objects.update_or_create(
            class_ref=validated_data['class_ref'],
            section=validated_data['section'],
            session=validated_data['session'],
            defaults={
                'teacher': validated_data['teacher'],
                'is_active': validated_data.get('is_active', True)
            }
        )
        return instance


# ============================================================================
# Cocurricular & Optional Teacher Assignment Serializers
# ============================================================================

class CocurricularTeacherAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for cocurricular teacher assignments."""
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    cocurricular_subject_name = serializers.CharField(source='cocurricular_subject.name', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)
    
    class Meta:
        model = CocurricularTeacherAssignment
        fields = [
            'id', 'teacher_id', 'teacher_name', 'cocurricular_subject_name',
            'class_name', 'section_name', 'session_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CocurricularTeacherAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cocurricular teacher assignments."""
    teacher_id = serializers.UUIDField(write_only=True)
    class_id = serializers.UUIDField(write_only=True)
    section_id = serializers.UUIDField(write_only=True)
    cocurricular_subject_id = serializers.UUIDField(write_only=True)
    session_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = CocurricularTeacherAssignment
        fields = ['id', 'teacher_id', 'class_id', 'section_id', 'cocurricular_subject_id', 'session_id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['teacher'] = Teacher.objects.get(id=validated_data.pop('teacher_id'))
        validated_data['class_ref'] = Class.objects.get(id=validated_data.pop('class_id'))
        validated_data['section'] = Section.objects.get(id=validated_data.pop('section_id'))
        validated_data['cocurricular_subject'] = CocurricularSubject.objects.get(id=validated_data.pop('cocurricular_subject_id'))
        validated_data['session'] = Session.objects.get(id=validated_data.pop('session_id'))
        
        instance, created = CocurricularTeacherAssignment.objects.update_or_create(
            class_ref=validated_data['class_ref'],
            section=validated_data['section'],
            cocurricular_subject=validated_data['cocurricular_subject'],
            session=validated_data['session'],
            defaults={
                'teacher': validated_data['teacher'],
                'is_active': validated_data.get('is_active', True)
            }
        )
        return instance


class OptionalTeacherAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for optional subject teacher assignments."""
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    optional_subject_name = serializers.CharField(source='optional_subject.name', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    session_name = serializers.CharField(source='session.name', read_only=True)
    
    class Meta:
        model = OptionalTeacherAssignment
        fields = [
            'id', 'teacher_id', 'teacher_name', 'optional_subject_name',
            'class_name', 'section_name', 'session_name', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OptionalTeacherAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating optional teacher assignments."""
    teacher_id = serializers.UUIDField(write_only=True)
    class_id = serializers.UUIDField(write_only=True)
    section_id = serializers.UUIDField(write_only=True)
    optional_subject_id = serializers.UUIDField(write_only=True)
    session_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = OptionalTeacherAssignment
        fields = ['id', 'teacher_id', 'class_id', 'section_id', 'optional_subject_id', 'session_id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['teacher'] = Teacher.objects.get(id=validated_data.pop('teacher_id'))
        validated_data['class_ref'] = Class.objects.get(id=validated_data.pop('class_id'))
        validated_data['section'] = Section.objects.get(id=validated_data.pop('section_id'))
        validated_data['optional_subject'] = OptionalSubject.objects.get(id=validated_data.pop('optional_subject_id'))
        validated_data['session'] = Session.objects.get(id=validated_data.pop('session_id'))
        
        instance, created = OptionalTeacherAssignment.objects.update_or_create(
            class_ref=validated_data['class_ref'],
            section=validated_data['section'],
            optional_subject=validated_data['optional_subject'],
            session=validated_data['session'],
            defaults={
                'teacher': validated_data['teacher'],
                'is_active': validated_data.get('is_active', True)
            }
        )
        return instance


# ============================================================================
# Session Lock Serializer
# ============================================================================

class SessionLockSerializer(serializers.Serializer):
    """Serializer for locking a session."""
    session_id = serializers.UUIDField()
    
    def validate_session_id(self, value):
        try:
            session = Session.objects.get(id=value)
            if session.is_locked:
                raise serializers.ValidationError("Session is already locked.")
            return value
        except Session.DoesNotExist:
            raise serializers.ValidationError("Session not found.")
    
    def create(self, validated_data):
        session = Session.objects.get(id=validated_data['session_id'])
        session.lock_session()
        return session
