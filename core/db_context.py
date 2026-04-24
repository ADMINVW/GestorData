import threading
_thread_locals = threading.local()

def set_db_credentials(alias, username, password):
    _thread_locals.db_alias = alias
    _thread_locals.db_user = username
    _thread_locals.db_password = password

def get_db_info():
    return {
        'alias': getattr(_thread_locals, 'db_alias', 'default'),
        'user': getattr(_thread_locals, 'db_user', None),
        'pass': getattr(_thread_locals, 'db_password', None)
    }

def get_db():
    return getattr(_thread_locals, 'db_alias', 'default')
