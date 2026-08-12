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
        
        
        
            # OBTENGO SECUENCIA DE LA COMPRA
           
        with connections[db_alias].cursor() as cur:    
            cur.execute("SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
            secuencia = cur.fetchone() 
                      
            if secuencia:
                Secuencia = secuencia[0] + 1

            # ACTUALIZO LA SECUENCIA
            cur.execute("UPDATE ciatt008 SET sq_numero = " + str(Secuencia) + " WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")        

            print("paso 1 seq:",Secuencia)    
            # OBTENGO CODIGO DEL PROVEEDOR
            cur.execute("SELECT pv_codigo,pv_nombre FROM ciatt011 WHERE pv_cia = '" + Compania + "' AND pv_cedruc = '" + RucProveedor + "'")

            codigoprovedor = cur.fetchone() 
            if codigoprovedor:
                CodigoProveedor = codigoprovedor[0]
                NombreProveedor = codigoprovedor[1]
            
            #NO PERIODICAS
            Plantillas = ',null,'

            # GUARDO LA CABECERA DE LA COMPRA
            try:

                cur.execute("INSERT INTO ocxxt001 VALUES (" + str(Secuencia) + ",'" + Compania + "','" + Agencia + "','" + Division + "','" + Usuario + "','" + FechaIngresoHora + "','" + Solicitante + "','A','" + SubTipo + "','','','',''," + str(CodigoProveedor) + ",'" + FechaIngreso + "','" + NumeroFactura + "','" + FechaEmision + "'," + TotalFactura + "," + TotalFactura + "," + TotalDescuento + "," + PlazoPago + "," + porcenIva +"," + porcenIva + ",0,'','" + Bodega + "','" + DescripcionFactura + "',''" + str(Plantillas) + "0,0,'DO','SRS','',0,'','01','" + TipoCredito + "','9999','" + SerieFactura + "','" + AutorizacionSri + "','" + FechaEmision + "','','')" )
                OcNumero = Secuencia

                print("paso 3 cabecera:",Usuario)
                # GUARDO EL DETALLE DE LA COMPRA
                for fila in datos_tabla:
                    CenGastos = ''
                    # cantidad fila[0]
                    # codigo item fila[1]
                    # codigo local fila[2]
                    # descripcion fila[3]
                    # precio unitario fila[4]
                    # descuento fila[5]
                    # precio total sin impuestos fila[6]
                    # porcentaje iva fila[7]
                    # valor iva fila[8]
                    
                    # CALCULO PORCENTAJE DESCUENTO
                    totParcial = 0.0
                    
                    totParcial = float(fila[4]) * float(fila[0])          
                    fila[5] = round((float(fila[5]) / totParcial) * 100) 

                    #if not Periodicas:
                    CenGastos = "0" 
                    ##mineoctubre
                    tipoItem = "BIENES"
                    ##
                    cur.execute("INSERT INTO ocxxt002 VALUES('" + Compania + "','" + Division + "','" + Agencia + "'," + str(Secuencia) + "," + str(ordinal) + ",'" + fila[1] + "'," + fila[0] + "," + fila[0] + ",'" + fila[3] + "',''," + str(fila[4]) + ",''," + str(fila[5]) + ",'" + tipoItem + "','" + str(CenGastos) + "'," + fila[7] + "," + fila[8] + ")")

                    ordinal = ordinal + 1
                print("paso 4 detalle:",ordinal)

            except Exception as e:
                print(f"Error al insertar detalle: {e}")
                messages.error(request, f"Hubo un fallo: no se guardó la factura")
                company_key = request.headers.get('X-Company-Key', '')
                return JsonResponse(
                    {'redirect_url': f'/repuestosapp/templates/compraRepuestos&company={company_key}'}
                )
            
            try:


                #GUARDA COMPRA LOCAL REPUESTOS
                tipoDoc = "16"
                #OBTENGO LA SECUENCIA
                cur.execute("SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + Compania + "' AND sq_bodega = '" + Bodega + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
                secuencia = cur.fetchone() 
                        
                if secuencia:
                    Secuencia = secuencia[0] + 1

                # ACTUALIZO LA SECUENCIA COMPRA LOCAL 
                cur.execute("UPDATE ciatt008 SET sq_numero = " + str(Secuencia) + " WHERE sq_cia = '" + Compania + "' AND sq_bodega  = '" + Bodega + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")

                TipoTran = Bodega.strip() + tipoDoc.strip() 

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
                    
                        
                for fila in datos_tabla:
                    print ("fila nueva :", fila[9] + "/" + str(fila[5]) + "/" + str(fila[15]) + "/" + str(valDescuento))
                
                #CABECERA
                cur.execute("INSERT INTO inrrt015 VALUES ('" + str(TipoTran) + "'," + str(Secuencia) + ",'" + NombreProveedor + "'," + str(CodigoProveedor) + ",0,0," + str(OcNumero) + ",'" + FechaIngreso + "',2,null,'" + DescripcionFactura + "','" + NumeroFactura + "',null,'" + Usuario + "'," + FactorVenta + ",0,null,'" + Bodega + "'," + str(TotalFactura) + ",'X'," + porcenIva + ",'DO',1,null)" ) 

                #DETALLE
                for fila in datos_tabla:
                    CenGastos = ''
                    # cantidad fila[0]
                    # codigo item fila[1]
                    # codigo local fila[2]
                    # descripcion fila[3]
                    # precio unitario fila[4]
                    # descuento fila[5]
                    # precio total sin impuestos fila[6]
                    # porcentaje iva fila[7]
                    # valor iva fila[8]
                    # linea fila[9]
                    # clase fila[10]
                    # costo promedio fila[11]
                    # ubicacion fila[12]
                    # stock actual fila[13]
                    # descripcion codigo local fila[14]
                    # precio anterior fila[15]
                    # costo promedio nuevo fila[16]

                    # CALCULO PORCENTAJE DESCUENTO
                    totParcial = 0 
                    #print("pre: ", fila[5], "cant: " , fila[0])
                    #totParcial = float(fila[4]) * float(fila[0])          
                    #fila[5] = (float(fila[5]) / totParcial) * 100
                    fob = 0

                    #print ("ERROR: ", str(fila[5]), "/", totParcial, "/", fila[0], "/", fila[10] , "/", fila[12])
                    CenGastos = "0" 
                    valDescuento = float(fila[4]) *float(fila[5])/100
                    cur.execute("INSERT INTO inrrt016 VALUES('" + str(TipoTran) +  "'," + str(Secuencia) + ",'" + fila[2] + "','" + fila[14] + "'," + str(fila[0]) + "," + str(fila[0]) + "," + str((float(fila[4])-valDescuento)*float(FactorVenta)) + "," + str(fila[4]) + "," + str(fob) + ",'" + str(round(fila[5])) + "','" + fila[10] + "','" + fila[12] + "',null,'" + fila[9] + "',null," + str(fila[11]) + "," + fila[7] + ")")

                    print ("Precio ganancia :" + str(float(fila[4])-valDescuento) + " x " + str(float(FactorVenta)))
                    #ACTUALIZO ITEM DE STOCK CABECERA
                    cur.execute("UPDATE inrrt003 SET it_costpro = " + str(fila[16]) + ", it_costult = " + str(fila[11]) + ", it_precio = " + str((float(fila[4])-valDescuento)*float(FactorVenta)) + ",it_preant = " + str(fila[15]) + " WHERE it_codigo = '" + fila[2] + "'" )

                    #ACTUALIZO ITEM DE STOCK DETALLE

                    cur.execute("SELECT * FROM inrrt004 WHERE st_codigo = '" + fila[2].strip() + "' AND st_bodega = '" + Bodega + "'")
                    nuevaInfo = cur.fetchone()
                        
                    if nuevaInfo:
                        cur.execute("UPDATE inrrt004 SET st_stockant = st_stockact , st_stockact = st_stockact + " + str(fila[0]) + ",st_fulmov = '" + FechaIngreso + "', st_documov = '" + str(Secuencia) + "',st_tipumov = '" + tipoDoc.strip() + "' WHERE st_codigo = '" + fila[2] + "' AND st_bodega = '" + Bodega + "'")
                        print("opcion 3 ", Bodega,fila[2].strip())
                    else:
                        cur.execute("INSERT INTO inrrt004 VALUES('" + Bodega + "','" + fila[2].strip()  + "','" + str(fila[12]) + "','',0," + str(fila[0]) + ",'',0,0,0.0,0,0,'','" + FechaIngreso + "'," + str(Secuencia) + ",'16')")
                        print("opcion 4 ", Bodega,fila[2].strip())

                    #GUARDO CODIGO DE ITEM DISTINTO EN LA TABLA MAPEO
                    if fila[1].strip() != fila[2].strip():
                        cur.execute("SELECT mp_codigoex FROM inrrt012 WHERE mp_codigoex = '" + fila[1] + "'")
                        codigoex = cur.fetchall()
                        print ("codigo fila1/fila2: ",fila[1],"/", fila[2])
                        if not codigoex:
                            cur.execute("INSERT INTO inrrt012 VALUES('" + fila[2] + "','" + fila[14] + "','" + fila[1] + "','" + fila[3] + "')")

                        ordinal = ordinal + 1
                    
            except Exception as e:
                print(f"Error al insertar detalle: {e}")
                messages.error(request, f"Hubo un fallo: no se generó la compra local de repuestos")
                company_key = request.headers.get('X-Company-Key', '')
                return JsonResponse(
                    {'redirect_url': f'/repuestosapp/templates/compraRepuestos&company={company_key}'}
                )

            print("paso 4 detalle:",ordinal)

        cur.close()
        ##MineOctubre
        print(OcNumero)
        ordenCompra =  obtenerOrdenCompra(request,db_alias, Agencia, Division, OcNumero)   
        if ordenCompra is None:
            return JsonResponse({'error': f'No se pudo recuperar la orden de compra {OcNumero}'}, status=400)
        guardarCtaPagar(request, db_alias, ordenCompra)

        #Actualizacion compra local en cuenta por pagar --debe reflejarse en resumen
        with connections[db_alias].cursor() as cur:
            documento = TipoTran +  str(Secuencia).zfill(6)
            print ("documento", documento)
            ssql = "UPDATE cpxxt001 SET dc_numcpr = ? WHERE dc_division = ? AND dc_agencia = ? AND dc_codpro = ? AND dc_numdoc = ?"
            parametros = [documento, Division, Agencia, CodigoProveedor, NumeroFactura]
            cur.execute(ssql,parametros)
            cur.close()
        
        #return JsonResponse({"Secuencia":Secuencia})
        company_key = request.headers.get('X-Company-Key', '')
        return JsonResponse({'redirect_url': f'../../comprasapp/templates/retencionCompra/{OcNumero}/{Division}/?Agencia={Agencia}&company={company_key}'})
    else:
            
        return JsonResponse({'status': 'fail', 'message': 'Método no permitido'}, status=405)
    

