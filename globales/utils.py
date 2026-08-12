from django.http import JsonResponse 
from .validators import CONSULTAS
from django.db import connections
from core.db_context import get_db, get_db_from_request

def consultarRegistros(sql, parametros=None, db_alias=None):
    #retorna registros en forma de diccionario con nombre de campos
    if db_alias is None:
        db_alias = get_db_from_request() or 'default'
    try: 
        with connections[db_alias].cursor() as cur:
            cur.execute(sql,parametros or [])
            nombreCampo = [col[0] for col in cur.description]
            resultado = [
                dict(zip(nombreCampo,row))
                for row in cur.fetchall()
            ]
        return resultado
    except Exception as e:
        print("Error en consultarRegistros sql ", e)

def consultarRegistrosTemplate(entidad, codigo, db_alias=None):
    #retorna datos definidos en CONSULTAS desde template SOLO recibe entidad y codigo
    if db_alias is None:
        db_alias = get_db_from_request() or 'default'
    
    if entidad not in CONSULTAS:
        return {"error": "Entidad no encontrada"}, 400

    tabla =  CONSULTAS[entidad]["tabla"]
    condicion =  CONSULTAS[entidad]["condicion"]
    
    condicionAux = CONSULTAS[entidad]["condicionAux"]
    
    if (condicionAux):
        ssql_aux = condicionAux
    else:
        ssql_aux = " 1 = 1 "
        
    campos =  ",".join(CONSULTAS[entidad]["campos"])
    
    estado = CONSULTAS[entidad]["estado"]
    ssql_est =" 1 = 1 "
    if (estado):
        ssql_est = f" {estado} = 'A' "
   
    grupo  = CONSULTAS[entidad]["group"]
    ssql_grp =""
    if (grupo):
         ssql_grp = f"GROUP BY {grupo}"   
   
    ssql = f"SELECT {campos} FROM {tabla} WHERE {condicion} = ? AND  {ssql_est} AND {ssql_aux} {ssql_grp}" 
    print (ssql)
    registros = consultarRegistros(ssql,[codigo],db_alias)
    print(registros)
    if (registros):
        return registros, 200
    else:
        return {"error": "No existe registro"}, 400
    
def consultarDato(request, ssql, parametros=None, db_alias=None):
    if db_alias is None:
        db_alias = get_db_from_request() or 'default'
    try: 
        #retorna un dato simple
        with connections[db_alias].cursor() as cur:
            cur.execute(ssql,parametros or [])
            dato = cur.fetchone()
            if dato is None:
                return 0
            else:
                if (len(dato)> 1):
                    #raise  MiError( "Retorno mas de un resultado")
                    return 0
                else:
                    if (dato[0] == None): #retorna vacio devuelve 0
                        return 0
                    else:
                        return dato[0] #retorno el unico elemento que debe haber, debería controlar el retorno de mas elementos 
    except Exception as e:
        print(f"Error en consultarDato ({ssql}) ", e)
        
