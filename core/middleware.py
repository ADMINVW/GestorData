from django.db import connections
from django.shortcuts import redirect
from core.db_context import set_db_credentials
from core.crypto import decrypt_credential

class DynamicConnectionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Primero buscar en parámetros de request, luego en sesión como fallback
        company_key = (
            request.GET.get('company')
            or request.headers.get('X-Company-Key')
            or request.POST.get('company')
            or request.session.get('active_company_key')  # Fallback: buscar en sesión
        )

        # Rutas públicas que no requieren estar logueado
        public_exact_paths = ('/', '/login_db/', '/logout/')
        public_prefix_paths = ('/admin/', '/static/')

        is_public = (
            request.path in public_exact_paths
            or any(request.path.startswith(prefix) for prefix in public_prefix_paths)
        )

        active = request.session.get('active_companies', {})
        company_info = company_key and active.get(company_key)

        db_user = decrypt_credential(request.session.get(f'user_{company_key}')) if company_key else None
        db_pass = decrypt_credential(request.session.get(f'pass_{company_key}')) if company_key else None
        db_user_name = decrypt_credential(request.session.get(f'user_name_{company_key}')) if company_key else None

        valid_login = bool(company_info and db_user and db_pass)

        if not is_public and not valid_login:
            return redirect('company_select')

        print(f"MIDDLEWARE - path: {request.path}")
        print(f"MIDDLEWARE - GET params: {dict(request.GET)}")
        print(f"MIDDLEWARE - Headers X-Company-Key: {request.headers.get('X-Company-Key')}")
        print(f"MIDDLEWARE - company_key resuelto: {company_key}")

        db_user_name = None  # Inicializar por defecto
        
        if company_key:
            # Actualizar la sesión con el company_key resuelto
            request.session['active_company_key'] = company_key
            # Primero intentar desde la sesión (tiene user/pass)
            active = request.session.get('active_companies', {})
            company_info = active.get(company_key)

            if company_info:
                db_alias = company_info['db_alias']
                db_user  = decrypt_credential(request.session.get(f'user_{company_key}'))
                db_pass  = decrypt_credential(request.session.get(f'pass_{company_key}'))
                db_user_name = decrypt_credential(request.session.get(f'user_name_{company_key}'))
            elif company_key in connections.databases:
                db_alias = company_key
                db_user = decrypt_credential(request.session.get(f'user_{company_key}'))
                db_pass = decrypt_credential(request.session.get(f'pass_{company_key}'))
                db_user_name = decrypt_credential(request.session.get(f'user_name_{company_key}'))
                print(f"MIDDLEWARE - fallback directo a db_alias: {company_key}")
            else:
                db_alias, db_user, db_pass = 'default', None, None
        else:
            db_alias, db_user, db_pass = 'default', None, None    

        # Guardar en el request directamente ← clave del fix
        request.db_alias = db_alias
        request.db_user  = db_user
        request.db_user_name = db_user_name

        # También en thread locals para compatibilidad con get_db()
        set_db_credentials(db_alias, db_user, db_pass)

        # Actualizar credenciales de conexión si cambiaron
        if db_alias in connections.databases and db_user:
            conn = connections[db_alias]
            if conn.settings_dict.get('USER') != db_user:
                conn.close()
                conn.settings_dict['USER']     = db_user
                conn.settings_dict['PASSWORD'] = db_pass

        return self.get_response(request)