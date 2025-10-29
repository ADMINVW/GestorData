from django.http import JsonResponse 
from .validators import CONSULTAS
from django.db import connection, transaction

def consultarRegistros(sql, parametros=None):
    #retorna registros en forma de diccionario con nombre de campos
    try: 
        with connection.cursor() as cur:
            cur.execute(sql,parametros or [])
            nombreCampo = [col[0] for col in cur.description]
            resultado = [
                dict(zip(nombreCampo,row))
                for row in cur.fetchall()
            ]
        return resultado
    except Exception as e:
        print("Error en consultarRegistros sql ", e)

def consultarRegistrosTemplate(entidad, codigo):
    #retorna datos definidos en CONSULTAS desde template SOLO recibe entidad y codigo
    if entidad not in CONSULTAS:
        return {"error": "Entidad no encontrada"}, 400

    tabla =  CONSULTAS[entidad]["tabla"]
    condicion =  CONSULTAS[entidad]["condicion"]
    campos =  ",".join(CONSULTAS[entidad]["campos"])
    
    estado = CONSULTAS[entidad]["estado"]
    ssql_est =" 1 = 1 "
    if (estado):
        ssql_est = f" {estado} = 'A' "
   
    grupo  = CONSULTAS[entidad]["group"]
    ssql_grp =""
    if (grupo):
         ssql_grp = f"GROUP BY {grupo}"   
       
    ssql = f"SELECT {campos} FROM {tabla} WHERE {condicion} = ? AND  {ssql_est} {ssql_grp}" 
    print (ssql)
    registros = consultarRegistros(ssql,[codigo])
    
    if (registros):
        return registros, 200
    else:
        return {"error": "No existe registro"}, 400
    
def consultarDato(ssql, parametros=None):
    #retorna un dato simple
    with connection.cursor() as cur:
        cur.execute(ssql,parametros or [])
        dato = cur.fetchone()
        if (dato != None):
            if (len(dato)> 1):
                #raise  MiError( "Retorno mas de un resultado")
                return 0
            else:
                return dato[0] #retorno el unico elemento que debe haber, debería controlar el retorno de mas elementos 
        else:
            return 0
            #raise  MiError( "Sin resultados") 
        
