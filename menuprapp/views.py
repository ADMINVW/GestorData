
from django.shortcuts import render, redirect
from globales.views import gusername,gpassword
from django.http import JsonResponse 
from django.views.decorators.csrf import csrf_exempt
from core.context_processors import company_context


from globales.utils import *


import json
import pyodbc
import traceback

def mimenu(request):
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    user_data = request.session.get(f'user_data_{company_key}', {})
    usuario = company_context(request).get('db_user', '')
    context = {
        'company_key': company_key,
        'company':     company_context(request).get('company', ''),        # ← para el navbar
        'username':     usuario,
        'nombre_user': company_context(request).get('db_user_name', ''),
        'compania':    user_data.get('compania', ''),
        'agencia':     user_data.get('agencia', ''),
        'bodega':      user_data.get('bodega', ''),
        'accesos':     get_accesos_user(request,usuario)
    }
    return render(request, 'menuPrincipal.html', context)

    
#Obtiene accesos habilitados del usuario, en js de menuBarraNav se hace un barrido para deshabilitar aquellos que no esten en este conjunto de datos
def get_accesos_user(request,user):
    db_alias = get_db_from_request(request)
    print(db_alias, "user ", user)
    with connections[db_alias].cursor() as cur:
        ssql ="SELECT TRIM(pf_codmenu) as pf_codmenu FROM ciatt004, ciatt010 WHERE us_login=? AND us_div = 'd' AND us_tipo = pf_codperfil"
        accesos = consultarRegistros(ssql,[user],db_alias)
        print(accesos)
        return accesos





