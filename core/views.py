from django.db import connections
from django.contrib import messages
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Company
from core.crypto import encrypt_credential

def company_select(request):
    companies = Company.objects.filter(activa=True)

    if request.method == 'POST':
        company_key = request.POST.get('company')
        try:
            company = Company.objects.get(key=company_key, activa=True)

            # Guardar empresa PENDIENTE de login (no activa aún)
            request.session['pending_company_key']  = company.key
            request.session['pending_company_db']   = company.db_alias
            request.session['pending_company_name'] = company.name

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'ok': True})

            return redirect('company_login')

        except Company.DoesNotExist:
            pass

    return render(request, 'core/login.html', {'companies': companies})


def company_login(request):
    db_alias = request.session.get('pending_company_db')
    if not db_alias:
        return redirect('company_select')

    if request.method == 'POST':
        user = request.POST.get('username')
        pw   = request.POST.get('password')

        try:
            company = Company.objects.get(db_alias=db_alias)

            if db_alias not in connections.databases:
                connections.databases[db_alias] = {
                    'ENGINE':           company.db_engine,
                    'NAME':             company.db_name,
                    'HOST':             company.db_host,
                    'USER':             '',
                    'PASSWORD':         '',
                    'CONN_MAX_AGE':     0,
                    'ATOMIC_REQUESTS':  False,
                    'AUTOCOMMIT':       True,
                    'TIME_ZONE':        None,
                    'CONN_HEALTH_CHECKS': False,
                    'TEST':             {'NAME': None},
                    'OPTIONS':          {'MIGRATE': False},
                }
                if company.db_engine == 'django_informixdb':
                    connections.databases[db_alias]['DSN']    = company.db_dsn
                    connections.databases[db_alias]['SERVER'] = company.db_server
                if company.db_port:
                    connections.databases[db_alias]['PORT'] = str(company.db_port)

            # Cerrar y limpiar antes de intentar conectar
            try:
                connections[db_alias].close()
            except Exception:
                pass

            conn = connections[db_alias]
            conn.settings_dict['USER']     = user
            conn.settings_dict['PASSWORD'] = pw
            conn.ensure_connection()

            # Verificar integridad de la DB
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT TRIM(name) FROM sysmaster:sysdatabases "
                    "WHERE is_logging = 1 AND TRIM(name) = ?",
                    [company.db_name]
                )
                row = cursor.fetchone()

            if not row or row[0].lower() != company.db_name.lower():
                conn.close()
                messages.error(request, "Error de integridad: la base de datos conectada no coincide.")
                return redirect('company_select')

            # get_nombre_user DESPUÉS de conexión exitosa
            nombre_user = get_nombre_user(db_alias, user)

            # Guardar credenciales por empresa y usuario
            session_key = f"{company.key}__{user}" 

            request.session[f'user_{session_key}']      = encrypt_credential(user)
            request.session[f'user_name_{session_key}'] = encrypt_credential(nombre_user) if nombre_user else None
            request.session[f'pass_{session_key}']      = encrypt_credential(pw)
            request.session[f'user_data_{session_key}'] = { ... }

            active = request.session.get('active_companies', {})
            active[session_key] = {
                'key':      company.key,       
                'name':     company.name,
                'db_alias': company.db_alias,
                'username': user,               
            }
            request.session['active_companies'] = active
            request.session['active_company_key'] = session_key  

            request.session.modified = True

            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT ur_cia, ur_age, ur_bodprn FROM tattt034 WHERE ur_user = ?",
                    [user]
                )
                user_data = cursor.fetchone()
                if user_data:
                    request.session[f'user_data_{session_key}'] = {
                        'compania': str(user_data[0]) if user_data[0] is not None else None,
                        'agencia':  str(user_data[1]) if user_data[1] is not None else None,
                        'bodega':   str(user_data[2]) if user_data[2] is not None else None,
                    }

            request.session.pop('pending_company_key', None)
            request.session.pop('pending_company_db', None)
            request.session.pop('pending_company_name', None)

            return redirect(f'/mimenu/?company={session_key}')

        except Company.DoesNotExist:
            messages.error(request, "Empresa no encontrada.")
            return redirect('company_select')
        except Exception as e:
            print(f"[DEBUG LOGIN ERROR] type={type(e).__name__} | error={e}")
            try:
                connections[db_alias].close()
                connections.databases[db_alias]['USER'] = ''
                connections.databases[db_alias]['PASSWORD'] = ''
            except Exception:
                pass
            messages.error(request, "Error de conexión: usuario o contraseña incorrectos")
    return redirect('company_select')

def company_logout(request):
    session_key = request.GET.get('company') or request.session.get('active_company_key')
    if session_key:
        request.session.pop(f'user_{session_key}', None)
        request.session.pop(f'user_name_{session_key}', None)
        request.session.pop(f'pass_{session_key}', None)
        request.session.pop(f'user_data_{session_key}', None)

        active = request.session.get('active_companies', {})
        active.pop(session_key, None)
        request.session['active_companies'] = active

        if request.session.get('active_company_key') == session_key:
            if active:
                request.session['active_company_key'] = next(iter(active))
            else:
                request.session.pop('active_company_key', None)

        # Cerrar conexión solo si no hay otras sesiones activas usando el mismo db_alias
        company_info = active
        still_using = any(
            v['db_alias'] == session_key.split('__')[0]
            for v in company_info.values()
        )
        if not still_using:
            db_alias = session_key.split('__')[0]
            try:
                connections[db_alias].close()
            except Exception:
                pass

    return redirect('company_select')


def get_nombre_user(db_alias, user):
    with connections[db_alias].cursor() as cur:
        cur.execute(
            "SELECT us_nombre FROM ciatt004 WHERE us_login = ?",
            [user]
        )
        row = cur.fetchone()
        return row[0] if row else None