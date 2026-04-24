# core/routers.py
from core.db_context import get_db

class CompanyDBRouter:
    CORE_APPS = {'admin', 'auth', 'contenttypes', 'sessions', 'core'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.CORE_APPS:
            return 'default'
        return get_db() # Retorna 'ecuawagen', 'germanmoto' o 'default'

    def db_for_write(self, model, **hints):
        return self.db_for_read(model, **hints)
    
    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, **hints):
        return db == 'default'
