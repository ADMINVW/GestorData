
from django.shortcuts import render, redirect
from globales.views import gusername,gpassword
from django.http import JsonResponse 
from django.views.decorators.csrf import csrf_exempt
from core.context_processors import company_context



import json
import pyodbc
import traceback

def mimenu(request):
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    user_data = request.session.get(f'user_data_{company_key}', {})
    
    # Obtener objeto company para el navbar
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None

    context = {
        'company_key': company_key,
        'company':     company,        # ← para el navbar
        'username':    company_context(request).get('db_user', ''),
        'compania':    user_data.get('compania', ''),
        'agencia':     user_data.get('agencia', ''),
        'bodega':      user_data.get('bodega', ''),
    }
    return render(request, 'menuPrincipal.html', context)






