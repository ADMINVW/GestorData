from .models import Company
from core.crypto import decrypt_credential
from django.db import connections
from core.db_context import get_db_from_request

from globales.utils import *

#Obtiene accesos habilitados del usuario, en js de menuBarraNav se hace un barrido para deshabilitar aquellos que no esten en este conjunto de datos
def accesos_context(request):
    accesos_usuario = []

    try:
        db_alias = get_db_from_request(request)
        login = getattr(request, "db_user", None)
        if login:
            with connections[db_alias].cursor() as cur:
                ssql = """
                    SELECT pf_nivelperfil, TRIM(pf_codmenu) as pf_codmenu, pf_nivelmenu, TRIM(pf_padremenu) as pf_padremenu FROM tattt034, ciatt010 WHERE ur_user = ? AND ur_codperfil = pf_codperfil
                    GROUP BY pf_nivelperfil, pf_codmenu,pf_nivelmenu, pf_padremenu ORDER BY pf_nivelmenu ASC
                    """
                accesos_usuario = consultarRegistros(ssql,[login],db_alias)
    except Exception:
        print("Error al capturar accesos")
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
            #mine180826
            accesos_usuario = accesos_context
            return {
                'company':      company,
                'db_user':      db_user,
                'db_user_name': db_user_name,
                'nombre_user':  db_user_name,
                'company_key':  session_key, 
                'accesos_user':  accesos_usuario,
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