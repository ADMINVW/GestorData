
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
    print("mimenu")
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
        'bodega':      user_data.get('bodega', '')
    }
    return render(request, 'menuPrincipal.html', context)





