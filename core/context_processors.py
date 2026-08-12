from .models import Company
from core.crypto import decrypt_credential
from django.db import connections
from core.db_context import get_db_from_request

def accesos_context(request):
    accesos_usuario = []

    try:
        db_alias = get_db_from_request(request)
        login = getattr(request, "db_user", None)

        if login:
            with connections[db_alias].cursor() as cur:
                cur.execute("""
                    SELECT sistema
                    FROM acceso
                    WHERE login = ?
                """, [login])

                accesos_usuario = [
                    str(row[0]).strip()
                    for row in cur.fetchall()
                ]

    except Exception:
        accesos_usuario = []

    return {
        "accesos_usuario": accesos_usuario
    }

def company_context(request):
    session_key = request.session.get('active_company_key')
    print(f"CONTEXT PROCESSOR - company_key de sesión: {session_key}")
    if session_key:
        try:
            # Extraer company_key real (antes del __)
            company_key = session_key.split('__')[0]
            company = Company.objects.get(key=company_key)
            db_user      = decrypt_credential(request.session.get(f'user_{session_key}'))
            db_user_name = decrypt_credential(request.session.get(f'user_name_{session_key}'))
            print(f"CONTEXT PROCESSOR - company: {company}, db_user: {db_user}, db_user_name: {db_user_name}")
            return {
                'company':      company,
                'db_user':      db_user,
                'db_user_name': db_user_name,
                'nombre_user':  db_user_name,
                'company_key':  session_key,  
            }
        except Company.DoesNotExist:
            print(f"CONTEXT PROCESSOR - Company no existe para key: {session_key}")
            pass
    print("CONTEXT PROCESSOR - retornando diccionario vacío")
    return {}


def company_theme(request):
    session_key = request.session.get('active_company_key')
    company = None
    theme = 'theme-default'

    if session_key:
        try:
            company_key = session_key.split('__')[0]
            company = Company.objects.get(key=company_key)
            theme_map = {
                'Ecuawagen':     'theme-ecuawagen',
                'German Motors': 'theme-germanmoto',
            }
            theme = theme_map.get(company.name, 'theme-default')
            print(f"CONTEXT PROCESSOR - company: {company}, theme: {theme}")
        except Company.DoesNotExist:
            print(f"CONTEXT PROCESSOR - Company no existe para key: {session_key}")
            pass

    return {
        'company':     company,
        'company_key': session_key, 
        'body_theme':  theme,
    }