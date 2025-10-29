import pyodbc
from django.http import JsonResponse 

from django.db import connection

# Create your views here.con = pyodbc.connect("DSN=DNSecuawagen;UID=intaco;PWD=tcross2206")
try:
    connection.ensure_connection()
    print("Conexión exitosa")
except Exception as e:
    print(f"Error al conectar a la base de datos: {e}")

#Desarrollo
with pyodbc.connect("DSN=DNSdesarrollo;UID=intaco;PWD=tcross2206") as conn:
#Produccion
#with pyodbc.connect("DSN=DNSecuawagen;UID=intaco;PWD=tcross2206") as conn:

    print("conectados")

