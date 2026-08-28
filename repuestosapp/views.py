from django.shortcuts import render
from core.db_context import get_db, get_db_from_request
from django.db import connections
import xml.etree.ElementTree as ET

from django.http import JsonResponse 
from django.views.decorators.csrf import csrf_exempt
from globales.views import *
import json
#mine
from datetime import datetime
from datetime import date
from datetime import timedelta 
from django.shortcuts import redirect
from django.views.decorators.http import require_GET
from django.db import connection, transaction
from decimal import Decimal, ROUND_HALF_UP
from core.context_processors import company_context
from core.permisos import validar_acceso
import os
import xml.etree.ElementTree as ET

##mineoctubre
from comprasapp.views import *


# Create your views here.
def comprasRepuestos(request):
   # if not validar_acceso(request, 'RE'):
    #    return render(request, 'core/acceso_denegado.html')

    from core.models import Company

    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    key = company_key.split('__')[0]
    
    try:
        company = Company.objects.get(key=key)
    except Company.DoesNotExist:
        company = None

    db_alias = get_db_from_request(request)

    if db_alias not in connections.databases:
        print(f"ERROR: La conexión '{db_alias}' no está configurada")
        return render(request, 'ordenCompra.html', {
            'nempresa': [], 'nsolicita': [], 'ntcredito': [],
            'company': company, 'company_key': company_key,
        })

    with connections[db_alias].cursor() as cur:

        cur.execute("SELECT * FROM ocxxt006 WHERE so_estado = 'A'")
        rows = cur.fetchall()
        column_names = [desc[0] for desc in cur.description]
        solicita = [dict(zip(column_names, row)) for row in rows]

        cur.execute("SELECT * FROM coat007 WHERE cre_codigo <> '00'")
        rows = cur.fetchall()
        column_names = [desc[0] for desc in cur.description]
        tcredito = [dict(zip(column_names, row)) for row in rows]

    return render(request,'compraRepuestos.html',{
        'nsolicita':solicita ,
        'ntcredito':tcredito,
        'username':   company_context(request).get('db_user', ''),
        'company': company,
        'company_key': company_key,
    })

@require_GET
def mapeaItem(request):
    db_alias = get_db_from_request(request)
    codigo = request.GET.get("codigo", "").strip()
    resultado = None
    print("codigo recibido:", codigo)
    if codigo:
        with connections[db_alias].cursor() as cur:
            cur.execute("SELECT it_codigo,it_descrip FROM inrrt003 WHERE it_codigo = '" + codigo.strip() + "'" )
            row = cur.fetchone()
            if row:
                resultado = row[0]
            else:
                cur.execute("SELECT mp_codigolo,mp_descriplo FROM inrrt012 WHERE mp_codigoex = '" + codigo.strip() + "'" )
                row = cur.fetchone()
                if row:
                    resultado = row[0]

    return JsonResponse({"codigo": resultado})

@csrf_exempt
def guardaFacturaRepuestos(request):
    Compania = "x"
    Agencia = "PX"
    tipoDoc = "OC"
    Bodega = "AX"
    porcenIva = "0"
    ordinal = 1

    db_alias = get_db_from_request(request)
   
    
    if request.method == 'POST':
        #datos = json.loads(request.body)
        body_unicode = request.body.decode('utf-8')
        body_data = json.loads(body_unicode)
        datos = body_data['datos']
        datos_tabla = body_data['datosTabla']
        Compania = datos.get("Compania")
        Agencia = datos.get("Agencia")
        Bodega = datos.get("Bodega")
       
        Division = datos.get("Division")
        Solicitante = "ADL" #datos.get("Solicitante")
        Usuario = datos.get('Usuario')
        RucProveedor = datos.get("RucProveedor")
        FechaIngreso = datos.get("FechaIngreso")
        FechaEmision = datos.get("FechaEmision")
        SubTipo = datos.get("SubTipo")
       
        TotalDescuento = datos.get("TotalDescuento")
        #Iva = datos.get("Iva")
        TotalFactura = datos.get("TotalFactura")
        PlazoPago = datos.get("PlazoPago")
        FactorVenta = datos.get("FactorVenta")
        SerieFactura = datos.get("SerieFactura")
        NumeroFactura = datos.get("NumeroFactura")
        TipoCredito = datos.get("TipoCredito")
        AutorizacionSri = datos.get("AutorizacionSri")
        DescripcionFactura = datos.get("DescripcionFactura")

        #if float(SubTotalIva) > 0:
        porcenIva = "15" #(Iva/SubTotalSinImpuestos)*100

        FechaIngresoHora = datos.get("FechaIngresoHora")
        
        try:
            with transaction.atomic(using=db_alias):
                with connections[db_alias].cursor() as cur:   
                    # OBTENGO SECUENCIA DE LA COMPRA
                    cur.execute("SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
                    secuencia = cur.fetchone() 
                            
                    if secuencia:
                        Secuencia = secuencia[0] + 1

                    # ACTUALIZO LA SECUENCIA
                    cur.execute("UPDATE ciatt008 SET sq_numero = " + str(Secuencia) + " WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")        
                    if cur.rowcount == 0:
                        raise MiError("Al actualizar secuencia de oc")
                    
                    print("paso 1 seq oc:",Secuencia)    
                    # OBTENGO CODIGO DEL PROVEEDOR
                    cur.execute("SELECT pv_codigo,pv_nombre FROM ciatt011 WHERE pv_cia = '" + Compania + "' AND pv_cedruc = '" + RucProveedor + "'")

                    codigoprovedor = cur.fetchone() 
                    if codigoprovedor:
                        CodigoProveedor = codigoprovedor[0]
                        NombreProveedor = codigoprovedor[1]
                    else:
                        raise MiError("No se encontró código de proveedor")

                    print("paso 2 busqueda proveedor:",Secuencia)    
                    # GUARDO LA CABECERA DE LA COMPRA
                    cur.execute("INSERT INTO ocxxt001 VALUES (" + str(Secuencia) + ",'" + Compania + "','" + Agencia + "','" + Division + "','" + Usuario + "','" + FechaIngresoHora + "','" + Solicitante + "','A','" + SubTipo + "','','','',''," + str(CodigoProveedor) + ",'" + FechaIngreso + "','" + NumeroFactura + "','" + FechaEmision + "'," + TotalFactura + "," + TotalFactura + "," + TotalDescuento + "," + PlazoPago + "," + porcenIva +"," + porcenIva + ",0,'','" + Bodega + "','" + DescripcionFactura + "','',null,0,0,'DO','SRS','',0,'','01','" + TipoCredito + "','9999','" + SerieFactura + "','" + AutorizacionSri + "','" + FechaEmision + "','','')" )
                    OcNumero = Secuencia
                    if cur.rowcount == 0:
                        raise MiError("Al insertar cabecera de oc")
                    print("paso 3 cabecera:",Usuario)
                    # GUARDO EL DETALLE DE LA COMPRA
                    for fila in datos_tabla:
                        # CALCULO PORCENTAJE DESCUENTO
                        totParcial = 0.0
                        
                        totParcial = float(fila[4]) * float(fila[0])          
                        fila[5] = round((float(fila[5]) / totParcial) * 100) 
 
                        ##mineoctubre
                        tipoItem = "BIENES"
                        
                        cur.execute("INSERT INTO ocxxt002 VALUES('" + Compania + "','" + Division + "','" + Agencia + "'," + str(Secuencia) + "," + str(ordinal) + ",'" + fila[1] + "'," + fila[0] + "," + fila[0] + ",'" + fila[3] + "',''," + str(fila[4]) + ",''," + str(fila[5]) + ",'" + tipoItem + "',NULL," + fila[7] + "," + fila[8] + ")")
                        if cur.rowcount == 0:
                            raise MiError(f"Al insertar detalle de oc: {e}")

                        ordinal = ordinal + 1
                        print("paso 4 detalle:",ordinal)
                        

                    #GUARDA COMPRA LOCAL REPUESTOS
                    tipoDoc = "16"
                    #OBTENGO LA SECUENCIA
                    cur.execute("SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + Compania + "' AND sq_bodega = '" + Bodega + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
                    secuencia = cur.fetchone()         
                    if secuencia:
                        Secuencia = secuencia[0] + 1

                    # ACTUALIZO LA SECUENCIA COMPRA LOCAL 
                    cur.execute("UPDATE ciatt008 SET sq_numero = " + str(Secuencia) + " WHERE sq_cia = '" + Compania + "' AND sq_bodega  = '" + Bodega + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
                    if cur.rowcount == 0:
                        raise MiError("Al actualizar secuencia de compra local")

                    print("paso 5 seq compralocal:",Secuencia)    

                    TipoTran = Bodega.strip() + tipoDoc.strip() 

                    #CABECERA
                    cur.execute("INSERT INTO inrrt015 VALUES ('" + str(TipoTran) + "'," + str(Secuencia) + ",'" + NombreProveedor + "'," + str(CodigoProveedor) + ",0,0," + str(OcNumero) + ",'" + FechaIngreso + "',2,null,'" + DescripcionFactura + "','" + NumeroFactura + "',null,'" + Usuario + "'," + FactorVenta + ",0,null,'" + Bodega + "'," + str(TotalFactura) + ",'X'," + porcenIva + ",'DO',1,null)" ) 
                    if cur.rowcount == 0:
                        raise MiError("Al insertar cabecera de compra local")
                                            
                    print("paso 6 cabecera compra local:",Usuario)
                    #OBTENGO INFORMACION ADICIONAL DE LOS REPUESTOS
                    for fila in datos_tabla:
                        cur.execute("SELECT it_linea,it_clase, it_costpro,st_ubica,st_stockact,it_descrip,it_precio FROM inrrt003,inrrt004 WHERE it_codigo = '" + fila[2].strip() + "' AND it_codigo = st_codigo ")
                        nuevaInfo = cur.fetchone()
                                
                        if nuevaInfo:
                            fila.append(nuevaInfo[0])
                            fila.append(nuevaInfo[1])
                            fila.append(nuevaInfo[2]) 
                            fila.append(nuevaInfo[3])
                            fila.append(nuevaInfo[4])
                            fila.append(nuevaInfo[5])
                            fila.append(nuevaInfo[6])
                            print ("opcion 1")
                        else:
                            cur.execute("SELECT it_linea,it_clase, it_costpro,'NOLOC',0,it_descrip,it_precio FROM inrrt003 WHERE it_codigo = '" + fila[2].strip() + "'")
                            nuevaInfo = cur.fetchone() 
                            if nuevaInfo:
                                fila.append(nuevaInfo[0])
                                fila.append(nuevaInfo[1])
                                fila.append(nuevaInfo[2]) 
                                fila.append(nuevaInfo[3])
                                fila.append(nuevaInfo[4])
                                fila.append(nuevaInfo[5])
                                fila.append(nuevaInfo[6])
                                print ("opcion 2")

                        #mine0826: validacion grupo de linea (usado para registros contables)
                        ssql= "SELECT li_grupo FROM gralt009 WHERE li_codigo = ? AND li_bodega = ? AND li_estado = 'A'" 
                        print("LINEA :", nuevaInfo[0] , " BODEGA ", Bodega)
                        grupo = consultarDato(request,ssql,(nuevaInfo[0],Bodega),db_alias)
                        if (grupo == 0):
                            raise MiError(f"Linea {nuevaInfo[0]} no existe o desactivada en bodega de ingreso, se deberá crear o activar")


                        #OBTENGO EL STOCK TOTAL DEL ITEM EN TODAS LAS BODEGAS     
                        cur.execute("SELECT SUM(st_stockact) FROM inrrt004 WHERE st_codigo = '" + fila[2].strip() + "'")
                        nuevaInfo = cur.fetchone() 
                        if nuevaInfo:  
                            totalItem = nuevaInfo[0]
                        else:    
                            totalItem = 0


                        cur.execute("SELECT st_ubica FROM inrrt004 WHERE st_codigo = '" + fila[2].strip() + "' AND st_bodega = '" + Bodega + "'")

                        ubicaItem = cur.fetchone() 
                        if ubicaItem:  
                            fila[12] = ubicaItem[0]
                        else:    
                            fila[12] = "NOLOC"
                        
                        valDescuento = float(fila[4]) *float(fila[5])/100 
                        #CALCULO NUEVO COSTO PROMEDIO
                        fila.append((float(fila[0])*(float(fila[4])-valDescuento) + float(totalItem)*float(fila[11]))/(float(fila[0])+float(totalItem)))
                        
                        #DETALLE
                        # CALCULO PORCENTAJE DESCUENTO
                        totParcial = 0 
                        fob = 0
                        valDescuento = float(fila[4]) *float(fila[5])/100
                        cur.execute("INSERT INTO inrrt016 VALUES('" + str(TipoTran) +  "'," + str(Secuencia) + ",'" + fila[2] + "','" + fila[14] + "'," + str(fila[0]) + "," + str(fila[0]) + "," + str((float(fila[4])-valDescuento)*float(FactorVenta)) + "," + str(fila[4]) + "," + str(fob) + ",'" + str(round(fila[5])) + "','" + fila[10] + "','" + fila[12] + "',null,'" + fila[9] + "',null," + str(fila[11]) + "," + fila[7] + ")")
                        if cur.rowcount == 0:
                            raise MiError(f"Al insertar detalle de compra local: {e}")

                        print ("paso 7. detalle compra local: " + fila[2]  + " Precio ganancia :" + str(float(fila[4])-valDescuento) + " x " + str(float(FactorVenta)))
                        #ACTUALIZO ITEM DE STOCK CABECERA
                        cur.execute("UPDATE inrrt003 SET it_costpro = " + str(fila[16]) + ", it_costult = " + str(fila[11]) + ", it_precio = " + str((float(fila[4])-valDescuento)*float(FactorVenta)) + ",it_preant = " + str(fila[15]) + " WHERE it_codigo = '" + fila[2] + "'" )
                        if cur.rowcount == 0:
                            raise MiError(f"Al actulizar valores de item: {fila[2]}")
                        #ACTUALIZO ITEM DE STOCK DETALLE

                        cur.execute("SELECT * FROM inrrt004 WHERE st_codigo = '" + fila[2].strip() + "' AND st_bodega = '" + Bodega + "'")
                        nuevaInfo = cur.fetchone()
                            
                        if nuevaInfo:
                            cur.execute("UPDATE inrrt004 SET st_stockant = st_stockact , st_stockact = st_stockact + " + str(fila[0]) + ",st_fulmov = '" + FechaIngreso + "', st_documov = '" + str(Secuencia) + "',st_tipumov = '" + tipoDoc.strip() + "' WHERE st_codigo = '" + fila[2] + "' AND st_bodega = '" + Bodega + "'")
                            print("opcion stock update ", Bodega,fila[2].strip())
                        else:
                            cur.execute("INSERT INTO inrrt004 VALUES('" + Bodega + "','" + fila[2].strip()  + "','" + str(fila[12]) + "','',0," + str(fila[0]) + ",'',0,0,0.0,0,0,'','" + FechaIngreso + "'," + str(Secuencia) + ",'16')")
                            print("opcion stock insert  ", Bodega,fila[2].strip())

                        if cur.rowcount == 0:
                            raise MiError("Al registrar stock en bodega")

                        #GUARDO CODIGO DE ITEM DISTINTO EN LA TABLA MAPEO
                        if fila[1].strip() != fila[2].strip():
                            cur.execute("SELECT mp_codigoex FROM inrrt012 WHERE mp_codigoex = '" + fila[1] + "'")
                            codigoex = cur.fetchall()
                            print ("codigo fila1/fila2: ",fila[1],"/", fila[2])
                            if not codigoex:
                                cur.execute("INSERT INTO inrrt012 VALUES('" + fila[2] + "','" + fila[14] + "','" + fila[1] + "','" + fila[3] + "')")
                                if cur.rowcount == 0:
                                    raise MiError(f"Al registrar item {fila[2]} en tabla de mapeo")
                                print ("paso 8. registro mapeo")



                    ##MineOctubre
                    print(OcNumero)
                    ordenCompra =  obtenerOrdenCompra(request,db_alias, Agencia, Division, OcNumero)   
                    if ordenCompra is None:
                        return JsonResponse({'error': f'No se pudo recuperar la orden de compra {OcNumero}'}, status=400)
                    guardarCtaPagar(request, db_alias, ordenCompra)
            
                    #Actualizacion compra local en cuenta por pagar --debe reflejarse en resumen
                    documento = TipoTran +  str(Secuencia).zfill(6)
                    print ("documento", documento)
                    ssql = "UPDATE cpxxt001 SET dc_numcpr = ? WHERE dc_division = ? AND dc_agencia = ? AND dc_codpro = ? AND dc_numdoc = ?"
                    parametros = [documento, Division, Agencia, CodigoProveedor, NumeroFactura]
                    cur.execute(ssql,parametros)
                    
        except Exception as e:
            print(f"Error al guardaFacturaRepuestos: {e}")
            return JsonResponse({'status': 'error','detallerr': str(e)}, status=400)
 
        #return JsonResponse({"Secuencia":Secuencia})
        company_key = request.headers.get('X-Company-Key', '')
        return JsonResponse({'redirect_url': f'../../comprasapp/templates/retencionCompra/{OcNumero}/{Division}/?Agencia={Agencia}&company={company_key}'})
    else:
            
        return JsonResponse({'status': 'fail', 'message': 'Método no permitido'}, status=405)
    

