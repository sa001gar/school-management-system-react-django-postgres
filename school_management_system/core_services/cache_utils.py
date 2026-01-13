"""
Cache utilities for API responses.
Provides decorators and helpers for caching ViewSet responses.
"""
from functools import wraps
from django.core.cache import cache
from django.conf import settings
from rest_framework.response import Response
import hashlib
import json


# Cache TTL settings
CACHE_TTL_SHORT = getattr(settings, 'CACHE_TTL_SHORT', 60)
CACHE_TTL_MEDIUM = getattr(settings, 'CACHE_TTL_MEDIUM', 300)
CACHE_TTL_LONG = getattr(settings, 'CACHE_TTL_LONG', 900)


def make_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a unique cache key from prefix and arguments."""
    key_data = json.dumps({'args': args, 'kwargs': kwargs}, sort_keys=True, default=str)
    key_hash = hashlib.md5(key_data.encode()).hexdigest()[:16]
    return f"{prefix}:{key_hash}"


def cache_response(timeout=CACHE_TTL_MEDIUM, key_prefix=None):
    """
    Decorator to cache ViewSet list/retrieve responses.
    Only caches GET requests. Automatically generates cache key from request params.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Only cache GET requests
            if request.method != 'GET':
                return view_func(self, request, *args, **kwargs)
            
            # Generate cache key
            prefix = key_prefix or f"{self.__class__.__name__}:{view_func.__name__}"
            cache_key = make_cache_key(
                prefix,
                path=request.path,
                query=dict(request.query_params),
                pk=kwargs.get('pk')
            )
            
            # Try to get from cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Get fresh response
            response = view_func(self, request, *args, **kwargs)
            
            # Cache successful responses
            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout)
            
            return response
        return wrapper
    return decorator


def invalidate_cache_prefix(prefix: str):
    """
    Invalidate all cache keys with a given prefix.
    Note: This only works with cache backends that support key patterns (like Redis).
    For LocMemCache, we track keys manually.
    """
    # For simple invalidation, we use versioned keys
    version_key = f"{prefix}:version"
    current_version = cache.get(version_key, 0)
    cache.set(version_key, current_version + 1, None)


class CacheMixin:
    """
    Mixin for ViewSets to add caching support.
    Override cache_key_prefix and cache_timeout in your ViewSet.
    """
    cache_key_prefix = None
    cache_timeout = CACHE_TTL_MEDIUM
    
    def get_cache_key(self, request, pk=None):
        """Generate cache key for current request."""
        prefix = self.cache_key_prefix or self.__class__.__name__
        return make_cache_key(
            prefix,
            path=request.path,
            query=dict(request.query_params),
            pk=pk
        )
    
    def list(self, request, *args, **kwargs):
        """Cached list view."""
        cache_key = self.get_cache_key(request)
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            return Response(cached_data)
        
        response = super().list(request, *args, **kwargs)
        
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_timeout)
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Cached retrieve view."""
        cache_key = self.get_cache_key(request, pk=kwargs.get('pk'))
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            return Response(cached_data)
        
        response = super().retrieve(request, *args, **kwargs)
        
        if response.status_code == 200:
            cache.set(cache_key, response.data, self.cache_timeout)
        
        return response
    
    def invalidate_list_cache(self):
        """Invalidate list cache when data changes."""
        prefix = self.cache_key_prefix or self.__class__.__name__
        invalidate_cache_prefix(prefix)
    
    def perform_create(self, serializer):
        """Invalidate cache after create."""
        super().perform_create(serializer)
        self.invalidate_list_cache()
    
    def perform_update(self, serializer):
        """Invalidate cache after update."""
        super().perform_update(serializer)
        self.invalidate_list_cache()
    
    def perform_destroy(self, instance):
        """Invalidate cache after delete."""
        super().perform_destroy(instance)
        self.invalidate_list_cache()


# Specific cache keys for common queries
CACHE_KEYS = {
    'sessions_list': 'sessions:list',
    'sessions_active': 'sessions:active',
    'classes_list': 'classes:list',
    'sections_list': 'sections:list',
    'subjects_list': 'subjects:list',
    'cocurricular_subjects_list': 'cocurricular_subjects:list',
    'optional_subjects_list': 'optional_subjects:list',
    'teachers_list': 'teachers:list',
}


def get_cached_sessions():
    """Get cached list of sessions."""
    from .models import Session
    from .serializers import SessionSerializer
    
    cache_key = CACHE_KEYS['sessions_list']
    data = cache.get(cache_key)
    
    if data is None:
        sessions = Session.objects.all()
        data = SessionSerializer(sessions, many=True).data
        cache.set(cache_key, data, CACHE_TTL_LONG)
    
    return data


def get_cached_classes():
    """Get cached list of classes."""
    from .models import Class
    from .serializers import ClassSerializer
    
    cache_key = CACHE_KEYS['classes_list']
    data = cache.get(cache_key)
    
    if data is None:
        classes = Class.objects.prefetch_related('sections').all()
        data = ClassSerializer(classes, many=True).data
        cache.set(cache_key, data, CACHE_TTL_LONG)
    
    return data


def get_cached_subjects():
    """Get cached list of subjects."""
    from .models import Subject
    from .serializers import SubjectSerializer
    
    cache_key = CACHE_KEYS['subjects_list']
    data = cache.get(cache_key)
    
    if data is None:
        subjects = Subject.objects.all()
        data = SubjectSerializer(subjects, many=True).data
        cache.set(cache_key, data, CACHE_TTL_LONG)
    
    return data


def invalidate_model_cache(model_name: str):
    """Invalidate cache for a specific model."""
    key_map = {
        'session': CACHE_KEYS['sessions_list'],
        'class': CACHE_KEYS['classes_list'],
        'section': CACHE_KEYS['sections_list'],
        'subject': CACHE_KEYS['subjects_list'],
        'cocurricularsubject': CACHE_KEYS['cocurricular_subjects_list'],
        'optionalsubject': CACHE_KEYS['optional_subjects_list'],
        'teacher': CACHE_KEYS['teachers_list'],
    }
    cache_key = key_map.get(model_name.lower())
    if cache_key:
        cache.delete(cache_key)
