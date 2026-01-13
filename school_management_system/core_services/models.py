"""
Core Services Models - Central data models for the school management system.
Contains Students, Classes, Sections, Sessions, Teachers, Admins, and related configurations.
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class CustomUser(AbstractUser):
    """Extended User model for authentication."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    
    # User role field
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='teacher')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.email} ({self.role})"


class Admin(models.Model):
    """Admin profile linked to user."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='admin_profile')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'admins'
        verbose_name = 'Admin'
        verbose_name_plural = 'Admins'
    
    @property
    def email(self):
        return self.user.email
    
    def __str__(self):
        return f"{self.name} ({self.email})"


class Teacher(models.Model):
    """Teacher profile linked to user."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='teacher_profile')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'teachers'
        verbose_name = 'Teacher'
        verbose_name_plural = 'Teachers'
    
    @property
    def email(self):
        return self.user.email
    
    def __str__(self):
        return f"{self.name} ({self.email})"


class Session(models.Model):
    """Academic session/year."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'sessions'
        ordering = ['-created_at']
        indexes = [
            # Partial index for active sessions (most common query)
            models.Index(
                fields=['is_active'],
                name='idx_session_active',
                condition=models.Q(is_active=True)
            ),
        ]
    
    def __str__(self):
        return self.name


class Class(models.Model):
    """School class/grade."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    level = models.IntegerField(default=0, help_text="Numeric level for ordering")
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'classes'
        verbose_name = 'Class'
        verbose_name_plural = 'Classes'
        ordering = ['level']
    
    def __str__(self):
        return self.name


class Section(models.Model):
    """Class section (e.g., A, B, C)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='sections', db_column='class_id')
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'sections'
        ordering = ['name']
        indexes = [
            models.Index(fields=['class_ref', 'name'], name='idx_section_class_name'),
        ]
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.name}"


class Subject(models.Model):
    """Academic subject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    full_marks = models.IntegerField(default=100)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'subjects'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class CocurricularSubject(models.Model):
    """Co-curricular activity subject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'cocurricular_subjects'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class OptionalSubject(models.Model):
    """Optional subject."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    default_full_marks = models.IntegerField(default=50)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'optional_subjects'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassSubjectAssignment(models.Model):
    """Assignment of subjects to classes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='subject_assignments', db_column='class_id')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='class_assignments')
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'class_subject_assignments'
        unique_together = ['class_ref', 'subject']
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.subject.name}"


class ClassOptionalConfig(models.Model):
    """Configuration for optional subjects per class."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='optional_config', db_column='class_id')
    has_optional = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'class_optional_config'
    
    def __str__(self):
        return f"{self.class_ref.name} - Optional: {self.has_optional}"


class ClassOptionalAssignment(models.Model):
    """Assignment of optional subjects to classes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='optional_assignments', db_column='class_id')
    optional_subject = models.ForeignKey(OptionalSubject, on_delete=models.CASCADE, related_name='class_assignments')
    full_marks = models.IntegerField(default=50)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'class_optional_assignments'
        unique_together = ['class_ref', 'optional_subject']
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.optional_subject.name}"


class ClassCocurricularConfig(models.Model):
    """Configuration for co-curricular activities per class."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='cocurricular_config', db_column='class_id')
    has_cocurricular = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'class_cocurricular_config'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.class_ref.name} - Cocurricular: {self.has_cocurricular}"


class ClassMarksDistribution(models.Model):
    """Marks distribution configuration per class."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.OneToOneField(Class, on_delete=models.CASCADE, related_name='marks_distribution', db_column='class_id')
    first_summative_marks = models.IntegerField(default=40)
    first_formative_marks = models.IntegerField(default=10)
    second_summative_marks = models.IntegerField(default=40)
    second_formative_marks = models.IntegerField(default=10)
    third_summative_marks = models.IntegerField(default=40)
    third_formative_marks = models.IntegerField(default=10)
    number_of_unit_tests = models.IntegerField(default=3)
    has_final_term = models.BooleanField(default=True)
    unit_test_marks = models.IntegerField(default=40)
    formative_marks = models.IntegerField(default=10)
    final_term_marks = models.IntegerField(default=40)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'class_marks_distribution'
    
    @property
    def total_marks(self):
        return (
            self.first_summative_marks + self.first_formative_marks +
            self.second_summative_marks + self.second_formative_marks +
            self.third_summative_marks + self.third_formative_marks
        )
    
    def __str__(self):
        return f"{self.class_ref.name} - Total: {self.total_marks}"


class SchoolConfig(models.Model):
    """School configuration per class and session."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='school_configs', db_column='class_id', null=True, blank=True)
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='school_configs', null=True, blank=True)
    total_school_days = models.IntegerField(default=200)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'school_config'
        indexes = [
            models.Index(fields=['class_ref', 'session'], name='idx_schoolconfig_class_session'),
        ]
    
    def __str__(self):
        class_name = self.class_ref.name if self.class_ref else "Global"
        session_name = self.session.name if self.session else "All Sessions"
        return f"{class_name} - {session_name} - {self.total_school_days} days"


class Student(models.Model):
    """Student information."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=50, unique=True, help_text="Unique student identifier for login")
    roll_no = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True, help_text="Used as default password (DDMMYYYY format)")
    father_name = models.CharField(max_length=255, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    class_ref = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, related_name='students', db_column='class_id')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, related_name='students')
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, related_name='students')
    # Password hash for student login (default: DOB as DDMMYYYY)
    password_hash = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'students'
        ordering = ['roll_no']
        indexes = [
            # Index for student login
            models.Index(fields=['student_id'], name='idx_stu_student_id'),
            # Composite index for common filter: session + class + section
            models.Index(
                fields=['session', 'class_ref', 'section'],
                name='idx_stu_sess_cls_sec'
            ),
            # Index for class + section lookups
            models.Index(
                fields=['class_ref', 'section'],
                name='idx_stu_cls_sec'
            ),
            # Index for name search
            models.Index(
                fields=['name'],
                name='idx_stu_name'
            ),
            # Composite for ordering by roll_no within class
            models.Index(
                fields=['class_ref', 'roll_no'],
                name='idx_stu_cls_roll'
            ),
        ]
    
    def set_password(self, raw_password):
        """Hash and set the password."""
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check the password against the stored hash."""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)
    
    def set_default_password(self):
        """Set default password as DOB in DDMMYYYY format."""
        if self.date_of_birth:
            default_pwd = self.date_of_birth.strftime('%d%m%Y')
            self.set_password(default_pwd)
    
    def save(self, *args, **kwargs):
        # Auto-generate student_id if not provided
        if not self.student_id:
            # Generate student ID: SESSION_YEAR + CLASS_LEVEL + ROLL_NO
            session_year = ""
            if self.session and self.session.start_date:
                session_year = str(self.session.start_date.year)[-2:]
            class_level = str(self.class_ref.level).zfill(2) if self.class_ref else "00"
            roll = str(self.roll_no).zfill(4) if self.roll_no else "0000"
            self.student_id = f"STU{session_year}{class_level}{roll}"
        
        # Set default password if not set and DOB is available
        if not self.password_hash and self.date_of_birth:
            self.set_default_password()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.student_id} - {self.name}"


class TeacherAssignment(models.Model):
    """Assignment of teachers to class-section-subject combinations."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='assignments')
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='teacher_assignments', db_column='class_id')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='teacher_assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='teacher_assignments')
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='teacher_assignments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_assignments'
        unique_together = ['teacher', 'class_ref', 'section', 'subject', 'session']
        indexes = [
            # Index for teacher lookups
            models.Index(fields=['teacher', 'session'], name='idx_ta_teacher_session'),
            # Index for class-section lookups
            models.Index(fields=['class_ref', 'section', 'session'], name='idx_ta_cls_sec_session'),
        ]
    
    def __str__(self):
        return f"{self.teacher.name} - {self.class_ref.name} {self.section.name} - {self.subject.name}"
