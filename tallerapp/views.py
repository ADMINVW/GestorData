from django.shortcuts import render
from core.permisos import validar_acceso
# Create your views here.

def inicioTaller(request):
    #if not validar_acceso(request, 'TA'):
     #   return render(request, 'core/acceso_denegado.html')
    return render(request,'inicioTaller.html')

def ordenTrabajo(request):
    #if not validar_acceso(request, 'TA'):
     #   return render(request, 'core/acceso_denegado.html')
    return render(request,'ordenesTrabajo.html')