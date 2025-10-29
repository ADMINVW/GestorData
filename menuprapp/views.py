
from django.shortcuts import render, redirect
from globales.views import gusername,gpassword
from django.http import JsonResponse 
from django.views.decorators.csrf import csrf_exempt



import json
import pyodbc
import traceback
# Create your views here.

#def login(request):
#    return render(request,'login.html' )

def inilogin(request):
    if request.method == 'GET':
        password = request.GET.get('password')
        username = request.GET.get('username')
        

        if username is None:
            return JsonResponse({'error': 'Usuario no proporcionada'}, status=400)
        
        try:
            #Desarrollo
            #with pyodbc.connect("DSN=DNSdesarrollo;UID=" + username + ";PWD=" + password) as conn:
            #Produccion
            with pyodbc.connect("DSN=DNSecuawagen;UID=" + username + ";PWD=" + password) as conn:
                print('Login correcto00')
                gusername = username
                gpassword = password
                
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM tattt034 WHERE ur_user = '" + username + "'")
                    #datuser = cur.fetchall()
                    rows = cur.fetchall()
                    column_names = [desc[0] for desc in cur.description]
                    datuser = [dict(zip(column_names, row)) for row in rows]
                    return JsonResponse({'ndatuser': datuser})
                
        except Exception as e:
            #return render(request,'ordenCompra.html',{'error': 'Error en la base de datos'} )
            traceback.print_exc()
            #print('Login Incorrecto..')
            return JsonResponse({'error': str(e)}, status=500)
    #return render(request,'ordenCompra.html',{'error': 'Error inesperado'} )
    print('Login Indefinido..')
    return JsonResponse({'error': 'Método no permitido'}, status=405)


def mimenu(request):
    return render(request,'menuPrincipal.html')

def wlogin(request):
    return render(request,'login.html')










