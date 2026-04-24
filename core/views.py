from django.db import connections
from django.contrib import messages
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Company

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

            conn = connections[db_alias]
            conn.close()
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
                error = "Error de integridad: la base de datos conectada no coincide."
                return render(request, 'core/login_informix.html', {'error': error})

            # ✅ Guardar credenciales POR EMPRESA (no sobreescribe otras)
            request.session[f'user_{company.key}'] = user
            request.session[f'pass_{company.key}'] = pw

            # ✅ Guardar lista de empresas activas en sesión
            active = request.session.get('active_companies', {})
            active[company.key] = {
                'key':    company.key,
                'name':   company.name,
                'db_alias': company.db_alias,
            }
            request.session['active_companies'] = active
            request.session['active_company_key'] = company.key
            request.session.modified = True

            # Obtener datos del usuario
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT ur_cia, ur_age, ur_bodprn FROM tattt034 WHERE ur_user = ?",
                    [user]
                )
                user_data = cursor.fetchone()
                if user_data:
                    # Guardar por empresa, no globalmente
                    request.session[f'user_data_{company.key}'] = {
                        'compania': user_data[0],
                        'agencia':  user_data[1],
                        'bodega':   user_data[2],
                    }

            # Limpiar pending
            request.session.pop('pending_company_key', None)
            request.session.pop('pending_company_db', None)
            request.session.pop('pending_company_name', None)

            messages.success(request, f"Conectado a {company.name}.")
            # ✅ Redirigir pasando la empresa activa como query param
            return redirect(f'/mimenu/?company={company.key}')

        except Company.DoesNotExist:
            error = "Empresa no encontrada."
            return render(request, 'core/login_informix.html', {'error': error})
        except Exception as e:
            try:
                connections[db_alias].close()
            except Exception:
                pass
            error = f"Error de conexión: {str(e)}"
            return render(request, 'core/login_informix.html', {'error': error})

    return render(request, 'core/login.html')