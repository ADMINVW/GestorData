from django.db import connections
from core.db_context import set_db_credentials

class DynamicConnectionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Intentar obtener company_key desde el request (pestaña específica)
        company_key = (
            request.GET.get('company')
            or request.headers.get('X-Company-Key')
            or request.POST.get('company_key')
        )

        # 2. Fallback: usar la última empresa logueada en sesión
        #    (funciona para una sola pestaña, que es tu caso actual)
        if not company_key:
            company_key = request.session.get('active_company_key')

        if company_key:
            active = request.session.get('active_companies', {})
            company_info = active.get(company_key)

            if company_info:
                db_alias = company_info['db_alias']
                db_user  = request.session.get(f'user_{company_key}')
                db_pass  = request.session.get(f'pass_{company_key}')

                if db_alias in connections.databases and db_user and db_pass:
                    conn = connections[db_alias]
                    if conn.settings_dict.get('USER') != db_user:
                        conn.close()
                        conn.settings_dict['USER']     = db_user
                        conn.settings_dict['PASSWORD'] = db_pass

                set_db_credentials(db_alias, db_user, db_pass)
                return self.get_response(request)

        # Sin empresa activa: usar default
        set_db_credentials('default', None, None)
        return self.get_response(request)