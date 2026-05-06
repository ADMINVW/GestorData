from django.shortcuts import render
import xml.etree.ElementTree as ET
from django.db import connections
from core.db_context import get_db, get_db_from_request

from django.http import JsonResponse 
from django.views.decorators.csrf import csrf_exempt
import json
from globales.views import *

#mine
from datetime import datetime
from datetime import date
from datetime import timedelta 
from django.shortcuts import redirect

from django.db import connection, transaction
from decimal import Decimal, ROUND_HALF_UP

import os
import unicodedata

from globales.utils import *
from globales.validators import VALIDACIONES

from django.contrib import messages
from core.context_processors import company_context

from .services import orden_compra_service as services

# Create your views here.

def ordenCompras(request):
    from core.models import Company

    # Usar active_company_key para mantener consistencia con el login
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None

    db_alias = get_db_from_request(request)
    print(f"Conectando a: {db_alias}")
    print(f"company_key: {company_key}")
    print(f"Conexiones disponibles: {list(connections.databases.keys())}")

    if db_alias not in connections.databases:
        print(f"ERROR: La conexión '{db_alias}' no está configurada")
        return render(request, 'ordenCompra.html', {
            'nempresa': [], 'nsolicita': [], 'ntcredito': [],
            'company': company, 'company_key': company_key,
        })

    service = services.OrdenComprasService()

    return render(request, 'ordenCompra.html', {
        'nempresa':   service.get_division().using(db_alias),
        'nsolicita':  service.get_solicitante().using(db_alias),
        'ntcredito':  service.get_tipo_credito().using(db_alias),
        'username':   company_context(request).get('db_user', ''),
        'company':    company,
        'company_key': company_key,
    })

def subTipo(request):

    db_alias = get_db_from_request(request)
    print(f"subTipo - Conectando a: {db_alias}")
    print(f"subTipo - company_key desde request: {request.GET.get('company')}")
    print(f"subTipo - Conexiones disponibles: {list(connections.databases.keys())}")

    if request.method == 'GET':
        division = request.GET.get('division')
        
        if division is None:
            return JsonResponse({'error': 'Division no proporcionada'}, status=400)
        
        try:
            with connections[db_alias].cursor() as cur:
                    #cur.execute("SELECT * FROM ocxxt004 WHERE to_cia = %s AND to_division = %s", ('e', division))
                    cur.execute("SELECT * FROM ocxxt004 WHERE to_cia = 'e' AND to_division = '" + division + "'")
                    rows = cur.fetchall()
                    column_names = [desc[0] for desc in cur.description]
                    tipoorden = [dict(zip(column_names, row)) for row in rows]
                    cur.close
            #return render(request,'ordenCompra.html',{'ntipoorden':tipoorden} )
            return JsonResponse({'ntipoorden': tipoorden})

        except Exception as e:
            #return render(request,'ordenCompra.html',{'error': 'Error en la base de datos'} )
            return JsonResponse({'error': str(e)}, status=500)
    #return render(request,'ordenCompra.html',{'error': 'Error inesperado'} )
    return JsonResponse({'error': 'Método no permitido Sub Tipo'}, status=405)

def cuentaProv(request):
    db_alias = get_db_from_request(request)
    print(f"cuentaProv - Conectando a: {db_alias}")
    print(f"cuentaProv - company_key desde request: {request.GET.get('company')}")
    print(f"cuentaProv - Conexiones disponibles: {list(connections.databases.keys())}")

    if request.method == 'GET':
        ruc = request.GET.get('rucprov')
        
        if ruc is None:
            return JsonResponse({'error': 'Código de Proveedor no proporcionado'}, status=400)
        
        try:
            with connections[db_alias].cursor() as cur:
                    cur.execute("SELECT a.*,ct_cuenta,c.ct_descripcion FROM ocxxt013 a,ciatt011 b, cgrta001 c WHERE mc_codpro = pv_codigo AND ct_cuenta = mc_cuenta AND ct_compania = 'e' AND pv_cedruc = '" + ruc + "'")
                    rows = cur.fetchall()
                    column_names = [desc[0] for desc in cur.description]
                    cuentaprov = [dict(zip(column_names, row)) for row in rows]
                    cur.close()
            return JsonResponse({'ncuentaprov': cuentaprov})
        
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Método no permitido cuenta proveedor'}, status=405)



def plantillaProv(request):
    db_alias = get_db_from_request(request)

    if request.method == 'GET':
        rucprovp = request.GET.get('rucprovp')

        if not rucprovp:
            return JsonResponse({'error': 'Ruc no proporcionado'}, status=400)

        try:
            with connections[db_alias].cursor() as cur:

                # 1. Obtener código del proveedor para Informix
                cur.execute(
                    "SELECT pv_codigo FROM ciatt011 WHERE pv_cia = 'e' AND pv_cedruc = ?",
                    [rucprovp]
                )
                row = cur.fetchone()

                if not row:
                    return JsonResponse({'nplantilla': []})

                codigo_proveedor = row[0]

                # 2. Obtener plantillas — mismo placeholder
                cur.execute(
                    """
                    SELECT UNIQUE(pt_codplantilla), pc_concepto
                    FROM cgrta035, ocxxt010
                    WHERE pt_codplantilla = pc_codigo
                    AND pt_codproveedor = ?
                    """,
                    [codigo_proveedor]
                )
                rows = cur.fetchall()
                column_names = [desc[0].lower() for desc in cur.description]
                plantilla = [dict(zip(column_names, row)) for row in rows]

                return JsonResponse({'nplantilla': plantilla})

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Método no permitido'}, status=405)

def limpiar_texto_informix(texto):
    if not texto:
        return ''
    texto = str(texto).replace("'", "''")
    texto = unicodedata.normalize('NFKD', texto)
    texto = texto.encode('ascii', errors='ignore').decode('ascii')
    return texto

@csrf_exempt
def guardaFacturaCompra(request):
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
        Periodicas = datos.get("Periodicas")
        Division = datos.get("Division")
        Solicitante = datos.get("Solicitante")
        Usuario = datos.get('Usuario')
        RucProveedor = datos.get("RucProveedor")
        Plantillas = datos.get("Plantillas")
        FechaIngreso = datos.get("FechaIngreso")
        FechaEmision = datos.get("FechaEmision")
        SubTipo = datos.get("SubTipo")
        SubTotalIva = datos.get("SubTotalIva")
        #SubTotalCero = datos.get("SubtotalCero")
        #SubTotalNoIva = datos.get("SubtotalNoIva")
        #SubTotalSinImpuestos = datos.get("SubtotalSinImpuestos")
        TotalDescuento = datos.get("TotalDescuento")
        #Iva = datos.get("Iva")
        TotalFactura = datos.get("TotalFactura")
        PlazoPago = datos.get("PlazoPago")
        SerieFactura = datos.get("SerieFactura")
        NumeroFactura = datos.get("NumeroFactura")
        TipoCredito = datos.get("TipoCredito")
        AutorizacionSri = datos.get("AutorizacionSri")
        DescripcionFactura = datos.get("DescripcionFactura")

        #if float(SubTotalIva) > 0:
        porcenIva = "15" #(Iva/SubTotalSinImpuestos)*100

        FechaIngresoHora = datos.get("FechaIngresoHora")
        
        
        
        # OBTENGO SECUENCIA DE LA COMPRA
        # Usar valores por defecto si están vacíos o son "null"
        Compania = datos.get("Compania") if datos.get("Compania") and datos.get("Compania") != "null" else "e"
        Agencia = datos.get("Agencia") if datos.get("Agencia") and datos.get("Agencia") != "null" else "PX"
        Bodega = datos.get("Bodega") if datos.get("Bodega") and datos.get("Bodega") != "null" else "01"
        Division = datos.get("Division") if datos.get("Division") and datos.get("Division") != "null" else "d"
        RucProveedor = datos.get("RucProveedor") if datos.get("RucProveedor") else ""
        
        with connections[db_alias].cursor() as cur:    
            # Primero intentar con tipo OC, si no existe buscar cualquier tipo
            print(f"Buscando secuencia: cia={Compania}, div={Division}, agencia={Agencia}")
            cur.execute("SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")
            secuencia = cur.fetchone() 
            
            if not secuencia:
                return JsonResponse({'error': 'No se encontró secuencia para la compañía/división/agencia'}, status=400)
            
            secuenciaw = secuencia[0] + 1

                        
            cur.execute("UPDATE ciatt008 SET sq_numero = " + str(secuenciaw) + " WHERE sq_cia = '" + Compania + "' AND sq_div = '" + Division + "' AND sq_agencia = '" + Agencia + "' AND sq_tipo = '" + tipoDoc + "'")      

            print("paso 1 seq:",secuenciaw)    
            # OBTENGO CODIGO DEL PROVEEDOR
            cur.execute("SELECT pv_codigo FROM ciatt011 WHERE pv_cia = '" + Compania + "' AND pv_cedruc = '" + RucProveedor + "'")

            codigoprovedor = cur.fetchall() 
            CodigoProveedor = None
            if codigoprovedor:
                for codigoproveedorw in codigoprovedor:  
                    CodigoProveedor = codigoproveedorw[0]
            
            if not CodigoProveedor:
                return JsonResponse({'error': 'No se encontró código de proveedor'}, status=400)
            
            #Plantillas = ",'" + Plantillas + "',"
            print("paso 2 prov:",CodigoProveedor)

            if Periodicas:
                PlantillaSQL = "'" + Plantillas + "'"  # 'VALOR'
            else:
                PlantillaSQL = "null"  # NULL sin comillas para SQL
            # GUARDO LA CABECERA DE LA COMPRA

            print(f"TotalFactura: '{TotalFactura}'")
            print(f"TotalDescuento: '{TotalDescuento}'")
            print(f"PlazoPago: '{PlazoPago}'")
            print(f"porcenIva: '{porcenIva}'")

            try:
                
                sql_insert = ("INSERT INTO ocxxt001 VALUES (" + 
                    str(secuenciaw) + ",'" + Compania + "','" + Agencia + "','" + Division + 
                    "','" + Usuario + "','" + FechaIngresoHora + "','" + Solicitante + 
                    "','A','" + SubTipo + "','','','',''," + str(CodigoProveedor) + 
                    ",'" + FechaIngreso + "','" + NumeroFactura + "','" + FechaEmision + 
                    "'," + TotalFactura + "," + TotalFactura + "," + TotalDescuento + 
                    "," + PlazoPago + "," + porcenIva + "," + porcenIva + 
                    ",0,'','" + Bodega + "','" + DescripcionFactura + "',''," +  
                    PlantillaSQL +                                                  
                    ",0,0,'DO','SRS','',0,'','01','" + TipoCredito + 
                    "','9999','" + SerieFactura + "','" + AutorizacionSri + 
                    "','" + FechaEmision + "','','')")

                print(f"SQL INSERT: {sql_insert}")
                cur.execute(sql_insert)
                Cantidad = 0

                print("paso 3 cabecera:",Usuario)
                # GUARDO EL DETALLE DE LA COMPRA
                for fila in datos_tabla:
                    CenGastos = ''
                    # precio total sin impuestos fila[5]
                    # precio unitario fila[3]
                    # descuento fila[4]
                    # cantidad fila[0]
                    # CALCULO PORCENTAJE DESCUENTO
                    totParcial = 0 
                    print("pre: ", fila[3], "cant: " , fila[0])
                    totParcial = float(fila[3]) * float(fila[0])          
                    fila[4] = (float(fila[4]) / totParcial) * 100
                    if not Periodicas:
                        CenGastos = fila[7]

                    fila1 = limpiar_texto_informix(fila[1])
                    fila2 = limpiar_texto_informix(fila[2])
                    fila5 = limpiar_texto_informix(fila[5])
                    CenGastos_str = limpiar_texto_informix(CenGastos)

                    sql_detalle = ("INSERT INTO ocxxt002 VALUES('" + Compania + "','" + Division + 
                        "','" + Agencia + "'," + str(secuenciaw) + "," + str(ordinal) + 
                        ",'" + fila1 + "'," + str(fila[0]) + "," + str(fila[0]) + 
                        ",'" + fila2 + "',''," + str(fila[3]) + ",''," + str(fila[4]) + 
                        ",'" + fila5 + "','" + CenGastos_str + "'," + str(fila[8]) + "," + str(fila[9]) + ")")

                    print(f"SQL DETALLE: {sql_detalle}")
                    cur.execute(sql_detalle) 

                    ordinal = ordinal + 1
                print("paso 4 detalle:",ordinal)

            except Exception as e:
                print(f"Error al insertar detalle: {e}")
                messages.error(request, f"Hubo un fallo: no se generó la compra local {e}")
                company_key = request.headers.get('X-Company-Key', '')
                return JsonResponse({'redirect_url': f'../../comprasapp/templates/retencionCompra/{OcNumero}/{Division}/?Agencia={Agencia}&company={company_key}'})

        ordenCompra = obtenerOrdenCompra(db_alias, Agencia, Division, secuenciaw)   
        if ordenCompra is None:
            return JsonResponse({'error': f'No se pudo recuperar la orden de compra {secuenciaw}'}, status=400)
        guardarCtaPagar(request, db_alias, ordenCompra)

        # Obtener company_key para incluir en la redirección
        company_key = request.headers.get('X-Company-Key', '')
        return JsonResponse({'redirect_url': f'retencionCompra/{secuenciaw}/{Division}/?Agencia={Agencia}&company={company_key}'})
    else:
            
        return JsonResponse({'status': 'fail', 'message': 'Método no permitido'}, status=405)


def existe_factura(request):
    db_alias = get_db_from_request(request)
    
    factura = request.GET.get("NumeroFactura")
    division = request.GET.get("Division")
    agencia = request.GET.get("Agencia")
    cia = request.GET.get("Cia")
    ruc = request.GET.get("Ruc")

    # Convertir "null" string o None a valores por defecto
    if agencia == "null" or agencia is None:
        agencia = "01"  # Valor por defecto
    if cia == "null" or cia is None:
        cia = "e"  # Valor por defecto
    if division == "null" or division is None:
        division = "d"  # Valor por defecto

    # Validar parámetros requeridos (solo factura y ruc son obligatorios)
    if not factura or not ruc:
        return JsonResponse({"error": "Faltan parámetros"}, status=400)

    with connections[db_alias].cursor() as cur:
        cur.execute("SELECT pv_codigo FROM ciatt011 WHERE pv_cia = '" + cia + "' AND pv_cedruc = '" + ruc + "'")

        codigoprovedor = cur.fetchall()
        print("codigoprovedor", codigoprovedor)
        codprov = None
        if codigoprovedor:
            for codigoproveedorw in codigoprovedor:
                codprov = codigoproveedorw[0] 

        if not codprov:
            return JsonResponse({"error": "Proveedor no encontrado"}, status=400)

        sql = ("EXECUTE PROCEDURE sp_existe_factura('" + factura + "','" + division + "','" + agencia + "','" + cia + "'," + str(codprov) + ")")
        print(f"SQL ejecutado: {sql}")

        cur.execute(
            "EXECUTE PROCEDURE sp_existe_factura('" + factura + "','" + division + "','" + agencia + "','" + cia + "'," + str(
                codprov) + ")")
        result = cur.fetchone()

    existe = result[0] if result else 0  # Si no hay datos, devuelve 0

    return JsonResponse({"existe": existe})


##MINE      
def guardarCtaPagar(request, db_alias=None, orden=None):
    if db_alias is None:
        db_alias = get_db_from_request(request)

    cia = 'e'       
    division = orden["oc_division"]
    agencia = orden["oc_agencia"]
    codpro = orden["oc_codpro"]
    numdoc = orden["oc_facpro"]
    secuenc = "01"
    cladoc= "DO"
    fechoa= datetime.now()
    usera= orden["oc_usring"]
    fecemi= orden["oc_fecfac"]
    fevctoo= fecemi + timedelta(days=orden["oc_plazo"])
    #dias = date.today() - fevctoo
    vcapori= orden["oc_valfac"]
    vcapact= orden["oc_valfac"]
    vintori= 0
    vintact= 0
    moneda= orden["oc_moneda"]
    tipcam= 1
    refere= "ORDEN DE COMPRA No." + str(orden["oc_numero"])
    ssql= "SELECT ur_codcar FROM tattt034 WHERE ur_user = ? AND ur_age = ?"
    #Probar
    caract= consultarDato(request, ssql,[usera,agencia], db_alias=db_alias)
    indant = obtenerIndiceVcto(fevctoo)
    fevctou = fevctoo
    origen = "T"
    iva = orden["oc_iva_rp"]

    try:
        with connections[db_alias].cursor() as cur:
            ssql ="INSERT INTO cpxxt001 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)" 
            cur.execute(ssql,(cia,division,agencia,codpro,numdoc,secuenc,cladoc,fechoa,usera,fecemi,fevctoo,vcapori,vcapact,vintori,vintact,moneda,tipcam,refere,None,None,caract,None,None,indant,fevctou,origen,iva,None,None))
            print("cur.rowcount", cur.rowcount)
            if cur.rowcount > 0:
                # Actualiza saldos pagar por compania y proveedor
                actualizarSaldos(request, db_alias, fecemi,fevctoo,vcapact,division,agencia,caract,codpro)
                
                # Se anula el proceso de actualizacion de cupos en proveedor, hay control pero no es efectivamente usado (procedimiento: actualizar_cupos)
                #  Se anula el proceso de actualizacion de cupos por usuario, hay control pero no es efectivamente usado (procedimiento: actualiza_cupo_usuario)
                
                # Se actualiza estado de orden
                ssql = "UPDATE ocxxt001 SET oc_estado = 'T' WHERE oc_compania ='e' AND oc_division = ? AND oc_agencia = ? AND  oc_numero = ?" 
                cur.execute(ssql,(division,agencia,orden["oc_numero"]))

    except Exception as e:
        print("Error al guardar cta pagar: ", e)
    finally:
        cur.close() 
   
def obtenerIndiceVcto(fechaVencimiento):
    dias = date.today() - fechaVencimiento
    dias = int(str(dias.days))
    if dias >= -15: #-1 y -15
        return 1
    elif dias <= 0: # -16 -->
        return 2
    elif dias <= 15:
        return 3
    elif dias <=30:
        return 4
    elif dias <=60:
        return 5
    elif dias <= 90:
        return 6
    else:
        return 7  

def actualizarSaldos(request, db_alias=None, fechaFactura=None, fechaVencimiento=None, valorPagar=None, division=None,agencia=None, cartera=None, proveedor=None):
    if db_alias is None:
        db_alias = get_db_from_request(request)
    
    print("actualizarSaldos")
    tipoProv = consultarDato(request,"SELECT pv_tipo FROM ciatt011 WHERE pv_codigo = " + str(proveedor), db_alias=db_alias)
    indice = obtenerIndiceVcto(fechaVencimiento)
    match indice:
        case 1:
            ssqlAuxC = " re_spvtot = re_spvtot + %f" % valorPagar + ", re_spv0a15 = re_spv0a15 + %f" % valorPagar 
            ssqlAuxP = " rc_spvtot = rc_spvtot + %f" % valorPagar + ", rc_spv0a15 = rc_spv0a15 + %f" % valorPagar 
        case 2:
            ssqlAuxC = " re_spvtot = re_spvtot + %f" % valorPagar
            ssqlAuxP = " rc_spvtot = rc_spvtot + %f" % valorPagar
        case 3:
            ssqlAuxC = " re_sv0a15 = re_sv0a15 + %f" % valorPagar
            ssqlAuxP = " rc_sv0a15 = rc_sv0a15 + %f" % valorPagar
        case 4:
            ssqlAuxC = " re_sv16a30 = re_sv16a30 + %f" % valorPagar
            ssqlAuxP = " rc_sv16a30 = rc_sv16a30 + %f" % valorPagar
        case 5:
            ssqlAuxC = " re_sv31a60  = re_sv31a60 + %f" % valorPagar
            ssqlAuxP = " rc_sv31a60  = rc_sv31a60 + %f" % valorPagar
        case 6:
            ssqlAuxC = " re_sv61a90  = re_sv61a90 + %f" % valorPagar
            ssqlAuxP = " rc_sv61a90  = rc_sv61a90 + %f" % valorPagar
        case 7:
            ssqlAuxC = " re_svmde90  = re_svmde90 + %f" % valorPagar
            ssqlAuxP = " rc_svmde90  = rc_svmde90 + %f" % valorPagar
    with connections[db_alias].cursor() as cur:
        #Registro general Pagar
        actualizo=False
        while (actualizo==False):
            ssql = "UPDATE cpxxt003 SET " + ssqlAuxC + " WHERE re_ano = " + str(fechaFactura.year) + " AND re_mes = " + str(fechaFactura.month) + " AND "\
                " re_cia = 'e' AND re_division = '" + division +"' AND re_agencia = '"+ agencia + "' AND re_tipcart  = '"+ cartera + "' AND re_tippro  = '" + tipoProv + "' AND re_tipmon = 'DO'"  
            cur.execute(ssql)
            if cur.rowcount > 0:
                print("Registro general Pagar")
                actualizo = True
            else:
                crearRegistroSaldos(db_alias, "G",division,agencia,cartera,proveedor,fechaFactura,tipoProv)
        #Registro proveedor
        actualizo=False
        while (actualizo==False):
            ssql = "UPDATE cpxxt004 SET " + ssqlAuxP + " WHERE rc_cia = 'e' AND rc_division = '" + division + "' AND rc_agencia = '" + agencia + "' AND "\
            " rc_codigo = " + str(proveedor) + " AND rc_tipmon = 'DO'"
            cur.execute(ssql)
            if cur.rowcount > 0:
                print("Registro proveedor")
                actualizo = True
            else:
                crearRegistroSaldos(db_alias, "P",division,agencia,cartera,proveedor,fechaFactura,None)
    cur.close

def crearRegistroSaldos(db_alias=None, tipoReg=None, division=None, agencia=None, cartera=None, proveedor=None, fechaFactura=None, tipoProv=None):
    if db_alias is None:
        db_alias = get_db_from_request(request)
    
    with connections[db_alias].cursor() as cur:
        if (tipoReg=="G"):
            ssql = "INSERT INTO cpxxt003 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            cur.execute(ssql,(fechaFactura.year,fechaFactura.month,"e",division,agencia,cartera,tipoProv,"DO",0,0,0,0,0,0,0))
        else:
            ssql= "INSERT INTO cpxxt004 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            cur.execute(ssql,("e",division,agencia,proveedor,"DO",0,0,0,0,0,0,0,0,0))
        
        if cur.rowcount > 0:
            return True
    cur.close
    
def ingresarRetencion(request,id,codDiv):
    codAge = request.GET.get('Agencia', 'Not provided')
    print(f">>> ingresarRetencion: id={id}, codDiv={codDiv}, codAge={codAge}")
    db_alias = get_db_from_request(request)
    
    # Obtener company_key para el contexto
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None

    if request.method == 'GET':
        #Datos OC/Factura
        codcia = "e"
        #codDiv = "d"
        ocompra = id

        ordenCompra = obtenerOrdenCompra(db_alias, codAge, codDiv, ocompra)   
        
        numFac = ordenCompra["oc_facpro"]
        codProv = ordenCompra["oc_codpro"]
        datosFactura =  obtenerDatosFactura(db_alias, codcia, codDiv, codAge, codProv, numFac)
        
        if datosFactura==None:
            print("Factura no existe!")
        else:
            #print ("datos" , datosFactura[0], " ", datosFactura[1])
            valorOriginal=datosFactura["valOriginal"]
            valorActual=datosFactura["valActual"]          
            #valoresBase = calcularValoresBase(datosFactura["valOriginal"], datosFactura["iva"], valorBienes, valorServicios)
            valoresBase = calcularvaloresBaseNew(request,codAge, codDiv, ocompra)
            datosProveedor = obtenerDatosProveedor(request, codProv)

            #Traigo datos de plantilla en caso de orden periodica
            ivaPeriodica=0
            ftePeriodica=0
            codPlantilla = ordenCompra["oc_clasif1"]
            if (codPlantilla !=  None):
                ssql = "SELECT * FROM ocxxt010 WHERE pc_codigo = '" + codPlantilla + "' AND pc_codpro = " + str(codProv)
                with connections[db_alias].cursor() as cur:
                    cur.execute(ssql)
                    columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
                    periodica = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
                    
                    ivaPeriodica = periodica[0]["pc_secuencia_iva"]
                    ftePeriodica = periodica[0]["pc_secuencia_renta"]
                    
                cur.close
                # si no tengo items de iva debería redireccionar a template resumen, Prueba
                if (ivaPeriodica==0 and ftePeriodica==0):
                    url = f'../../../verTransaccion/{ocompra}/?agencia={codAge}&division={codDiv}&proceso=I'
                    return redirect(url)

        with connections[db_alias].cursor() as cur:
                #Listado items tipo Iva
                cur.execute("SELECT * FROM ocxxt003 WHERE rt_estado = 'A' AND rt_tipo = 'I' ORDER BY rt_tipo, rt_porcen")
                columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
                retencionesI = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
                #retencionesI = cur.fetchall()
                
                #Listado items tipo Fuentes
                cur.execute("SELECT * FROM ocxxt003 WHERE rt_estado = 'A' AND rt_tipo = 'F' ORDER BY rt_tipo, rt_porcen")
                columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
                retencionesF = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
                #retencionesF = cur.fetchall()
        cur.close

        context = {
            'norden':ordenCompra["oc_numero"],
            'ncodProv': codProv,
            'nnumFac' : numFac,
            'nvalorActual': valorActual,
            'nvalorOriginal' : valorOriginal,
            'nnomProveedor' : datosProveedor["nombre"],
            'nretencionesI':retencionesI,
            'nretencionesF':retencionesF,
            'nbaseIva' : valoresBase["baseIva"],
            'nbaseIvaB' : valoresBase["baseIvaB"],
            'nbaseIvaS' : valoresBase["baseIvaS"],
            'nbaseFuente': valoresBase["baseFuente"],
            'nbaseFuenteB': valoresBase["baseFuenteB"],
            'nbaseFuenteS': valoresBase["baseFuenteS"],
            'ngranContrib': datosProveedor["granContrib"],
            'nrimpe': datosProveedor["rimpe"],
            'ncontribEsp': datosProveedor["contribEsp"],
            'nretIva': datosProveedor["retIva"],
            'nretFte': datosProveedor["retFte"],
            'nftePeriodica':ftePeriodica,
            'nivaPeriodica':ivaPeriodica,
            'ndivision':codDiv,
            'ncompania': codcia,
            'nagencia': codAge,
            'nbodega': 'CP', 
            'company': company,           # Para el navbar
            'company_key': company_key,   # Para el navbar
        }

        print(f"CONTEXTO compania={codcia}, agencia={codAge}")
        print(f"TEMPLATE PATH: {request.build_absolute_uri()}")
      
        return render(request,'retencionCompra.html', context)

def guardarRetencion(request):
    db_alias = get_db_from_request(request)
    company_key = (
        request.POST.get('company')
        or request.headers.get('X-Company-Key')
        or request.GET.get('company')
    )
    
    if request.method == 'POST':
        try:
            with transaction.atomic():
                data = json.loads(request.body)
                #Obtengo datos recibidos
                itemRetencion = data.get('tabla', [])
                
                #Obtengo datos de campos en forma
                otrosDatos=data.get('forma',[])
                compania = otrosDatos.get("compania")
                division = otrosDatos.get("division")
                agencia = otrosDatos.get("agencia")
                codpro = otrosDatos.get("ncodProv")
                nompro = otrosDatos.get("nnomProveedor")
                fhaper = datetime.now() #Definir si para todos los casos va a tomar la fecha de factura o realmente fecha de registro
                factura = otrosDatos.get("nnumFac")
                valfac= otrosDatos.get("nvalorOriginal")
                ocompra = otrosDatos.get("ocompra")
                valRet = otrosDatos.get("totRetencion")
                with connections[db_alias].cursor() as cur:
                    #retencion unica secuencia con division "d"    
                    numero=obtenerSecuencia(request, compania,"d",agencia,"RT","CP")
                    for item in itemRetencion: 
                        ssql = """
                            INSERT INTO cpxxt007 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """                            
                        cur.execute(ssql,(compania,division,agencia,numero,codpro,nompro,item["porcentaje"],factura,valfac,item["base"],"DO",fhaper,"A",None,1.00, item["codigo"],None))
                        
                    #Registro unico de secuencia de retencion, tiene como division: d
                    actualizarSecuencia(db_alias, numero, compania, "d", agencia, "RT", "CP")
                    
                    #Ajuste sobre factura por el valor de la retencion
                    datos ={
                        "codDiv":division,
                        "codAge":agencia,
                        "codProv":codpro,
                        "usuario":otrosDatos.get("user"),
                        "valorRet":valRet,
                        "valorCActual":valfac,
                        "valorIActual":0,
                        "numFactura":factura,
                        "secFactura":"01",
                        "tipFactura":"DO",
                        "numRet": numero
                    }
                    guardarAjuste(request, "AC", datos)
                
                    generarDiario(request, agencia, numero, fhaper.date(), otrosDatos.get("user"))  

        except Exception as e:
            # return JsonResponse({'error': str(e)}, status=400)
            print(f"Error al guardar retencion : {e}")
            raise 
        return JsonResponse(
            {'redirect_url': f'/comprasapp/templates/verTransaccion/{ocompra}/?agencia={agencia}&division={division}&proceso=I&company={company_key}'}
        )
    else:
        return JsonResponse({'ERROR': 'Método no permitido'}, status=405)

def calcularValoresBase(valorFactura, porIva, valorBienes, valorServicios):
    valorFactura=float(valorFactura)
    if porIva > 0:
        baseIva = valorFactura-(valorFactura/(1+(porIva/100))) 
        baseIvaS = valorServicios * (porIva/100) 
        baseIvaB = valorBienes * (porIva/100)
    else:
        baseIva = 0
        baseIvaS=0
        baseIvaB=0
    
    baseFuente = valorFactura - baseIva
    baseFuenteB = valorBienes 
    baseFuenteS = valorServicios 
    
    valoresBase = {"baseIva": baseIva, "baseFuente": baseFuente, "baseIvaS":baseIvaS,"baseIvaB":baseIvaB,"baseFuenteS":baseFuenteS,"baseFuenteB":baseFuenteB}
    return valoresBase

#minejulio
def calcularvaloresBaseNew(request, codAge, codDiv, numOrden):
    db_alias = get_db_from_request(request)
    parametros=[codAge,codDiv,numOrden]
    #No trabajo con valor guardado porque por tema decimales con valores totales hay diferencia en mas o menos decimales
    with connections[db_alias].cursor() as cur:
        ssql = """
            SELECT sum(od_canped*(od_preest-(od_preest*(od_descto /100)))) as od_total, od_poriva, od_observ 
            FROM ocxxt002 WHERE od_agencia = ? AND od_division = ? AND od_numero = ? 
            GROUP BY od_poriva, od_observ
        """ 
        cur.execute(ssql,parametros)
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        detalleOrden = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        
        baseIvaS = 0
        baseIvaB = 0
        baseFuenteS = 0
        baseFuenteB = 0
        for detalle in detalleOrden:
            if detalle["od_observ"].rstrip() == "SERVICIOS":
                baseFuenteS += detalle["od_total"]
                baseIvaS += float(detalle["od_total"]) * (detalle["od_poriva"]/100)
                
            if detalle["od_observ"].rstrip()  == "BIENES":
                baseFuenteB += detalle["od_total"]
                baseIvaB += float(detalle["od_total"]) * (detalle["od_poriva"]/100)    

        baseIva = baseIvaS + baseIvaB
        baseFuente = baseFuenteS + baseFuenteB

        valoresBase = {"baseIva": baseIva, "baseFuente": baseFuente, "baseIvaS":baseIvaS,"baseIvaB":baseIvaB,"baseFuenteS":baseFuenteS,"baseFuenteB":baseFuenteB}
        
    cur.close()
    return valoresBase


def obtenerDatosFactura(db_alias, codcia, codDiv, codAge, codProv, numFac):
    with connections[db_alias].cursor() as cur:
        parametros=[codcia, codDiv, codAge, codProv, numFac]
        ssql ='''
            SELECT (dc_vcapori + dc_vintori), dc_iva, (dc_vcapact+dc_vintact), dc_fecemi,dc_fevctoo, dc_fechoa, dc_clarel,dc_trnrel,dc_numcpr FROM cpxxt001 
            WHERE dc_cia = ? AND dc_division = ? AND dc_agencia = ? AND dc_codpro = ? AND dc_numdoc = ? AND dc_secuenc in ('51','01') AND dc_cladoc = 'DO' 
        ''' 
        cur.execute(ssql,parametros)
        datosFactura = cur.fetchone()
        if (datosFactura != None):
            valOriginal = datosFactura[0]
            iva = datosFactura[1]
            valActual = datosFactura[2]
            fechaFactura = datosFactura[3]
            fechaVcto = datosFactura[4]
            fechaIng = datosFactura[5]
            tipUltMov = datosFactura[6]
            numUltMov = datosFactura[7]
            compraLocal = datosFactura[8]
            valFactura={
                "valOriginal":valOriginal,
                "iva":iva,
                "valActual":valActual,
                "fechaFactura":fechaFactura,
                "fechaVcto":fechaVcto,
                "fechaIng":fechaIng,
                "tipUltMov":tipUltMov,
                "numUltMov":numUltMov,
                "compraLocal": compraLocal
                }
        else:
            valFactura = None
        cur.close()
        return valFactura

def obtenerDatosProveedor(request, codigo):
    #Datos de proveedor para validaciones y despliegue de datos
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        #Gran contribuyente (S/N), RIMPE (N > NO APLICA / E > EMPRENDEDOR / G > NEGOCIO POPULAR) , Contribuyente especial (S/N), Retencion Iva (S/N), Retencion FTE 
        ssql = "SELECT pv_aut_sri, pv_region, pv_contesp, pv_autimp, pv_nombre, pv_cedruc, pv_mail, pv_codigo, pv_actpro, pv_person, pv_serie "\
                "FROM ciatt011 WHERE pv_codigo = " + str(codigo) 
        cur.execute(ssql)
        datosProveedor = cur.fetchone()
        if datosProveedor==None:
            print("Proveedor no existe!")
        else:
            granContrib = str(datosProveedor[0]).rstrip()
            rimpe =str(datosProveedor[1]).rstrip()
            contribEsp = str(datosProveedor[2]).rstrip()
            retIva = str(datosProveedor[3]).rstrip()
            nombre = str(datosProveedor[4]).rstrip()
            identificacion = str(datosProveedor[5]).rstrip()
            email = str(datosProveedor[6]).rstrip()
            codigo = datosProveedor[7]
            actividad=datosProveedor[8]
            persona = datosProveedor[9]
            retFte = str(datosProveedor[10]).rstrip()
    cur.close
    valProveedor ={
        "granContrib":granContrib,
        "rimpe":rimpe,
        "contribEsp":contribEsp,
        "retIva":retIva,
        "nombre":nombre,
        "identificacion":identificacion,
        "email":email,
        "codigo":codigo,
        "actividad":actividad,
        "persona":persona,
        "retFte": retFte}
    return valProveedor

def verTransaccionResumen(request, numOrden):
    # Desplegará todos los datos relacionados a la transacción 
    codAge = request.GET.get('agencia', 'Not provided')
    codDiv = request.GET.get('division', 'Not provided') 
    proceso = request.GET.get('proceso', 'C') 
    db_alias = get_db_from_request(request)
    
    # Obtener company_key para el contexto
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    #with connections[db_alias].cursor() as cur:
    codcia="e"
    
    #Datos de agencia
    ssql= "SELECT co_nomcorto FROM ciatt003 WHERE co_tipfila = 'a' AND co_agencia = '" + codAge + "' AND co_div ='v' "
    nombreAgencia = consultarDato(request, ssql, db_alias=db_alias)
    
    #Datos Orden
    datosOrden = obtenerOrdenCompra(db_alias, codAge, codDiv, numOrden)
    
    factura =  datosOrden["oc_facpro"]
    codProveedor = datosOrden["oc_codpro"]
    descripcion = datosOrden["oc_obser1"]
    
    if (datosOrden["oc_obser2"] != None):
        descripcion = descripcion + datosOrden["oc_obser2"]
    
    #Fecha inicio registro de diario en OC
    fechaRegDiarios = date(2025,3,1)
    fechaIngreso = (datosOrden["oc_fecing"]).date()

    #Bandera para sql de su detalle: Si tiene numero de diario o registros anteriores a fecha proceso deben estar contabilizadas
    if (datosOrden["oc_numdia"] != None or fechaIngreso < fechaRegDiarios):
        verificada = 1
        numDiarioOc = datosOrden["oc_numdia"]
    else:
        verificada = 0 
        numDiarioOc= None


    #datos de orden
    ssql = "SELECT to_descrip FROM ocxxt004 WHERE to_cia = 'e' AND to_tipo = '" + datosOrden["oc_tipo"]+ "' AND to_division = '" + codDiv+ "'"
    nombreTipo = consultarDato(request, ssql, db_alias=db_alias)
    ssql = "SELECT so_nombres FROM ocxxt006 WHERE so_cia = 'e' AND  so_codigo = '" + datosOrden["oc_solicit"] + "'"
    nombreSol = consultarDato(request, ssql, db_alias=db_alias)
    periodica=0
    nombrePlantilla=""
    if (datosOrden["oc_clasif1"]!=None):
        ssql="SELECT pc_concepto FROM ocxxt010 WHERE pc_codigo = '" + datosOrden["oc_clasif1"] +"'"
        nombrePlantilla = consultarDato(request, ssql, db_alias=db_alias)
        periodica = 1
    descuento = datosOrden["oc_descto"]
    recargo = datosOrden["oc_recargo"]
    user = datosOrden["oc_usring"]
    ssql = "SELECT us_nombre FROM ciatt004 WHERE us_agencia = '" + codAge + "' AND us_div = '" + codDiv + "' AND us_login = '" + user + "'"
    nombreUser = consultarDato(request, ssql, db_alias=db_alias)

    with connections[db_alias].cursor() as cur:
        #Items Retencion
        ssql = """
            SELECT *, (cpxxt007.rt_base * (cpxxt007.rt_porcen/100)) AS valret FROM cpxxt007, ocxxt003 
            WHERE rt_compania = ? AND rt_factura = ? AND rt_codpro = ?
            AND rt_agencia = ? AND rt_division = ? AND cpxxt007.rt_secuencia = ocxxt003.rt_secuencia AND ocxxt003.rt_estado = 'A'
        """
        cur.execute(ssql,(codcia,factura,codProveedor,codAge,codDiv))
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        datosRetencion = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        if len(datosRetencion) == 0:
            numRet=0
            numDiario=""
        else:
            numRet = datosRetencion[0]["rt_numero"]
            #Diario Retención
            ssql = "SELECT cc_numero FROM cgrta002 WHERE cc_compania = 'e' AND cc_descrip1 MATCHES '*RETENCION*" + str(numRet) + " *' "\
            " AND   cc_benefic matches '" + str(codProveedor)+ " *' AND cc_estado <> 'E'"
        
            numDiario = consultarDato(request, ssql, db_alias=db_alias)
    cur.close()
    
    #Datos generales de transaccion  
    datosProveedor = obtenerDatosProveedor(request, codProveedor)
    
    datosFactura =  obtenerDatosFactura(db_alias, codcia, codDiv, codAge, codProveedor, str(factura).rstrip())
            
    #valoresBase =  calcularvaloresBase(datosFactura["valOriginal"], datosFactura["iva"], valBienes, valServicios)        
    valoresBase = calcularvaloresBaseNew(request, codAge, codDiv, numOrden)
            
    if datosFactura==None:
        print("Factura no existe!")

    context = {
            'nnombreAgencia' : nombreAgencia,
            'ncodAgencia': codAge,
            'ndivision': obtenerNombreDiv(request, codDiv),
            'ncodDiv': codDiv,
            'ntipo': datosOrden["oc_tipo"],
            'nnombreTipo' : nombreTipo,
            'nnombreSol': nombreSol,
            'ndescripcion':descripcion,
            'nperiodica':periodica,
            'nnombrePlantilla':nombrePlantilla,
            'ndescuento':descuento,
            'nrecargo':recargo,
            'nserie':datosOrden["oc_serie"],
            'nautorizacion':datosOrden["oc_aut_sri"],
            'nnumRetencion':numRet,
            'ndataRetencion':datosRetencion,
            'nfactura':factura,
            'ndataFactura':datosFactura,          
            'ndataProveedor':datosProveedor,
            'nnumOrden':datosOrden["oc_numero"],
            'nvaloresBase':valoresBase,
            'nuser':user,
            'nnombreUser': nombreUser,
            'nnumDiario':numDiario,
            'nverificada':verificada,
            'nnumDiarioOc': numDiarioOc,
            'nordenTaller' : datosOrden["oc_ordtra"],
            'company': company,           # Para el navbar
            'company_key': company_key,   # Para el navbar
    } 
    #Si es proceso (I)ngreso, genera XML y actualiza autorizacion en tabla, si proceso (C)onsulta no debería ingresar; tampoco si (I)ngreso no generó retención
    print (" condiciones generar xml: numRet (  ", numRet, ") y proceso (" , proceso , ")")
    if (numRet>0 and proceso == "I"):
        ssql = "SELECT rt_aut_sri FROM cpxxt007 WHERE rt_agencia = ? AND rt_numero = ? "
        rt_aut_sri = consultarDato(request, ssql, [codAge,numRet], db_alias=db_alias)
        if (rt_aut_sri == None): 
            autorizacion = crearXmlRetencion(request, context)
            if autorizacion is None:
                return JsonResponse({'error': 'No se encontró configuración de agencia para generar el XML'}, status=400)
            with connections[db_alias].cursor() as cur:
                ssql ="UPDATE cpxxt007 SET rt_aut_sri = ? WHERE rt_agencia = ? AND rt_numero = ?"
                cur.execute(ssql,(autorizacion,codAge,numRet))
                cur.close
        
    return render(request, 'resumenIngreso.html',context)

def obtenerNombreDiv(request, div):
    db_alias = get_db_from_request(request)
    ssql = "SELECT co_nomcorto FROM ciatt003 WHERE co_cia = 'e' AND co_div = ? AND co_tipfila = 'd'"
    nombre = consultarDato(request, ssql,[div], db_alias=db_alias)
    return nombre

def obtenerOrdenCompra(db_alias=None, codAge=None, codDiv=None, numOrden=None):
    if db_alias is None:
        db_alias = get_db_from_request(request)
    
    #Datos de la orden de compra relacionada
    print("orden ", numOrden, "div ", codDiv)
    parametros = [codAge, codDiv, numOrden]
    with connections[db_alias].cursor() as cur:
        #CABECERA
        ssql = """
                SELECT * FROM ocxxt001 WHERE oc_agencia = ? AND oc_division = ? AND oc_numero = ?  
                UNION
                SELECT * FROM ocxxt801 WHERE oc_agencia = ? AND oc_division = ? AND oc_numero = ?
        """ 
        cur.execute(ssql,parametros+parametros)
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar con nombre de campo
        orden = cur.fetchone()
        if orden is None:
            print(f"Error: No se encontró la orden {numOrden} en la agencia {codAge}, desde obtenerOrdenCompra")
            return None
        datosOrden = dict(zip(columnas, orden)) 
               
        # #DETALLE --> se suprime 08-10-25 por calculo nuevo tipo de item e iva en detalle
        # ssql = """
        #     SELECT *  FROM ocxxt002 WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
        #     UNION 
        #     SELECT *  FROM ocxxt802 WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
        # """    
        # cur.execute(ssql,parametros+parametros)
        # detalleOrden = cur.fetchall()
        
        # vBienes = 0
        # vServicios = 0
        # for detalle in detalleOrden:
        #     valDetalle =  detalle[6] * (float(detalle[10]) -  (float(detalle[10]) * (detalle[12]/100)))
        #     if str(detalle[13]).rstrip() == "BIENES" :
        #         vBienes= vBienes + valDetalle
        #     else:
        #         vServicios= vServicios + valDetalle
    #return datosOrden, vBienes, vServicios
    return datosOrden

def obtenerDetalleOrdenCompraT(request,numOrden,codAge):
    #mine julio
    db_alias = get_db_from_request(request)
    
    # Obtener company_key para el contexto
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    parametros = [numOrden,codAge]
    with connections[db_alias].cursor() as cur:
        ssql = """
            SELECT tr_descri, tr_valor, oc_iva_rp FROM tattt005, ocxxt001 WHERE tr_ctrato  = oc_numero AND oc_division = 't'
            AND oc_numero = ? AND oc_agencia = ? AND oc_ordtra = tr_numord
            UNION
            SELECT tr_descri, tr_valor, oc_iva_rp FROM tattt805, ocxxt801 WHERE tr_ctrato  = oc_numero AND oc_division = 't'
            AND oc_numero = ? AND oc_agencia = ? AND oc_ordtra = tr_numord
        """
        cur.execute(ssql,parametros+parametros)
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        detalleOrden = [dict(zip(columnas, fila)) for fila in cur.fetchall()]

        #iva --> si se da iva por item se debera corregir
        ssql="SELECT oc_iva_rp FROM ocxxt001 WHERE oc_agencia = '" + codAge + "' AND oc_division = 't' AND oc_numero = " + str(numOrden) + " "\
             " UNION "\
             "SELECT oc_iva_rp FROM ocxxt801 WHERE oc_agencia = '" + codAge + "' AND oc_division = 't' AND oc_numero = " + str(numOrden) 
        iva=consultarDato(request, ssql, db_alias=db_alias)

        cur.close()
        
    if request.method == 'GET':
        context = {
            'ndetalleOrden':detalleOrden,
            'nnumOrden':numOrden,
            'niva':iva,
            'company': company,           # Para el navbar
            'company_key': company_key,   # Para el navbar
        }
    return render(request, 'detalleOrdenCompraT.html',context)


#mine octubre, ordenes de compra de inventario repuestos/accesorios
def obtenerDetalleOrdenCompraR(request,numOrden,codAge):
    print("obtenerDetalleOrdenCompraR")
    db_alias = get_db_from_request(request)
    
    # Obtener company_key para el contexto
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    parametros = [numOrden,codAge]
    with connections[db_alias].cursor() as cur:
        ssql = """
            SELECT hd_can_des, hd_codigo, hd_descri, hd_costo, hd_descto, (hd_can_des*(hd_costo-(hd_costo*(hd_descto/100)))) AS total, oc_iva_rp
            FROM inrrt015, inrrt016, ocxxt001 WHERE hc_tipo = hd_tipo AND hc_transac = hd_transac AND hc_mecanico  = oc_numero 
            AND ((oc_division = 'r' AND oc_tipo = 'I') OR (oc_division = 'v' AND oc_tipo = 'E'))
            AND oc_numero = ? AND oc_agencia = ? AND hc_orden = oc_facpro AND oc_codpro = hc_codigo 
            UNION
            SELECT hd_can_des, hd_codigo, hd_descri, hd_costo, hd_descto, (hd_can_des*(hd_costo-(hd_costo*(hd_descto/100)))) AS total, oc_iva_rp
            FROM inrrt015, inrrt016, ocxxt801 WHERE hc_tipo = hd_tipo AND hc_transac = hd_transac AND hc_mecanico  = oc_numero 
            AND ((oc_division = 'r' AND oc_tipo = 'I') OR (oc_division = 'v' AND oc_tipo = 'E'))
            AND oc_numero = ? AND oc_agencia = ? AND hc_orden = oc_facpro AND oc_codpro = hc_codigo 
        """
        cur.execute(ssql,parametros+parametros)
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        detalleOrden = [dict(zip(columnas, fila)) for fila in cur.fetchall()]

        #iva --> si se da iva por item se debera corregir
        ssql="""
            SELECT oc_iva_rp FROM ocxxt001 WHERE oc_numero = ? AND oc_agencia = ? AND oc_division = 'r'  
            UNION
            SELECT oc_iva_rp FROM ocxxt801 WHERE oc_numero = ? AND oc_agencia = ? AND oc_division = 'r'       
            """
        iva=consultarDato(request, ssql, parametros+parametros, db_alias=db_alias)

        cur.close()
        
    if request.method == 'GET':
        context = {
            'ndetalleOrden':detalleOrden,
            'nnumOrden':numOrden,
            'niva':iva,
            'company': company,           # Para el navbar
            'company_key': company_key,   # Para el navbar
        }
    return render(request, 'detalleOrdenCompraR.html',context)
    
def obtenerDetalleOrdenCompra(request,numOrden,codAge, codDiv, periodica, verificada):
    print("obtenerDetalleOrdenCompra", periodica, verificada)
    db_alias = get_db_from_request(request)
    
    # Obtener company_key para el contexto
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    from core.models import Company
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    parametros=[codAge,codDiv,numOrden]
    #Datos de la orden de compra relacionada
    with connections[db_alias].cursor() as cur:
        if (periodica=="1" or codDiv != "d"):
            #En tipo periodicas no se registra centro de gastos u ordenes de repuestos
            ssql = """
                SELECT ocxxt002.*, '' AS ct_descripcion,  (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total
                FROM ocxxt002 WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
                UNION 
                SELECT ocxxt802.*, '' AS ct_descripcion, (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total
                FROM ocxxt802 WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
            """            
        else:
            #En tipo no periodicas se registra centro de gastos que se detalla en ventana
            if (verificada=="0"):
                print("no verificada")
                #La bandera verificada se orienta si ya se generó su diario, indicando que el campo que inicialmente tiene el centro de gastos ahora tiene la cuenta contable
                ssql = """
                    SELECT ocxxt002.*, ct_descripcion,  (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total 
                    FROM ocxxt002, ocxxt012, OUTER cgrta001 
                    WHERE od_agencia = ? AND od_division = ? AND od_numero = ? 
                    AND ct_secgrp = od_ped_or AND ocxxt012.ct_cuenta = cgrta001.ct_cuenta AND ct_compania = 'e' 
                    UNION 
                    SELECT ocxxt802.*, ct_descripcion,  (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total 
                    FROM ocxxt802, ocxxt012, OUTER cgrta001 
                    WHERE od_agencia = ? AND od_division = ? AND od_numero = ? 
                    AND ct_secgrp = od_ped_or AND ocxxt012.ct_cuenta = cgrta001.ct_cuenta AND ct_compania = 'e'
                """
            else:
                #Ya con diario solo se busca en tablas de cuentas     
                ssql = """
                    SELECT ocxxt002.*, ct_descripcion, (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total 
                    FROM ocxxt002, OUTER cgrta001 
                    WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
                    AND od_ped_or = cgrta001.ct_cuenta AND ct_compania = 'e'
                    UNION 
                    SELECT ocxxt802.*, ct_descripcion, (od_canped*(od_preest-(od_preest*(od_descto/100)))) AS total
                    FROM ocxxt802, OUTER cgrta001 
                    WHERE od_agencia = ? AND od_division = ? AND od_numero = ?
                    AND od_ped_or = cgrta001.ct_cuenta AND ct_compania = 'e'
                """
        cur.execute(ssql,parametros+parametros)
        
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        detalleOrden = [dict(zip(columnas, fila)) for fila in cur.fetchall()]

        #iva --> si se da iva por item se debera corregir
        ssql = (
            f"SELECT oc_iva_rp FROM ocxxt001 "
            f"WHERE oc_agencia = '{codAge}' AND oc_division = '{codDiv}' AND oc_numero = {numOrden} "
            f"UNION "
            f"SELECT oc_iva_rp FROM ocxxt801 "
            f"WHERE oc_agencia = '{codAge}' AND oc_division = '{codDiv}' AND oc_numero = {numOrden}"
        )
        iva=consultarDato(request, ssql, db_alias=db_alias)
        
    if request.method == 'GET':
        context ={
            'ndetalleOrden':detalleOrden,
            'nnumOrden':numOrden,
            'niva':iva,
            'company': company,           # Para el navbar
            'company_key': company_key,   # Para el navbar
        }
        return render(request, 'detalleOrdenCompra.html',context)

def actualizarSecuencia(db_alias, secuencia, compania,division, agencia,tipo,bodega ):
    actualizo = False    
    with connections[db_alias].cursor() as cur:
        registros = 0
        ssql = "UPDATE ciatt008 SET sq_numero = " + str(secuencia) + " WHERE sq_cia = '" + compania + "' AND sq_div = '" + division + "' AND sq_agencia = '" + agencia + "'"\
               " AND sq_tipo = '" + tipo + "' AND sq_bodega = '" + bodega +"'"
        cur.execute(ssql)
        registros= cur.rowcount
        if registros is not None and registros > 0:
            actualizo=True
    return actualizo

def obtenerSecuencia(request, compania, division, agencia, tipo, bodega):  
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        registros = 0
        #El campo bodega en secuencia de transacciones trabaja con sigla de modulo (CP Cuentas por pagar o proveedore), (CO Cobranzas o clientes) 
        ssql = "SELECT sq_numero FROM ciatt008 WHERE sq_cia = '" + compania + "' AND sq_div = '" + division + "' AND sq_agencia = '" + agencia + "' "\
             " AND sq_tipo = '" + tipo + "' AND sq_bodega = '" + bodega + "'"
        print(ssql)
        cur.execute (ssql)
        
        print(f"Buscando secuencia: Cia:{compania}, Div:{division}, Age:{agencia}, Tipo:{tipo}, Bod:{bodega}")

        registros= cur.fetchone()
        if registros is not None:
            secuencia=registros[0]
            return secuencia + 1
        else:
            raise MiError(f"No existe registro de secuencia para: {tipo} en Div: {division}")
    
    
def generarDiario(request, agencia, nreten, fecha, usuario): #Estoy trabajando con fecha de ingreso y no con fecha de factura
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql="SELECT cl_fec_ca FROM cgrta050 WHERE cl_compania = 'e'"
        fechaCierre = consultarDato(request, ssql, db_alias=db_alias)
        mes = f'{fecha.month:02d}' #Formato dos digitos de mes
        if fechaCierre.year < fecha.year :
            #Sin cierrre todavia, toma secuencia con sufijo 
            campo = "nu_mes" +  mes + "s"
        else:
            #Con cierre toma secuencia sin sufijo
            campo = "nu_mes" + mes
        
        #Obtengo secuencia de diario
        ssql = "SELECT " + campo + " FROM cgrta052 WHERE nu_compania = 'e' AND nu_tipo = 'DC'"
        ndiario = consultarDato(request, ssql, db_alias=db_alias) + 1 
        #Ejecuto procedure para generacion de diario
        ssql= "EXECUTE PROCEDURE sp_diario_reten(" + str(nreten) + ",'" + str(ndiario) + "','" + agencia +"','" + usuario +"')"
        print("Desde generarDiario, ejecutando: ", ssql)
        cur.execute(ssql)
        #Actualizo secuencia de diario
        ssqlaux =  " SET " + campo + " = " + campo + " + 1 " 

        ssql = "UPDATE cgrta052 " + ssqlaux +  " WHERE nu_compania = 'e' AND nu_tipo = 'DC'" 
        cur.execute(ssql)

class MiError(Exception):
    pass   
    
def guardarAjuste(request, tipo, datos):
    db_alias = get_db_from_request(request)
    cia = "e"
    division = datos["codDiv"]
    agencia = datos["codAge"]
    codpro = datos["codProv"]
    numdoc = obtenerSecuencia(request, cia, division, agencia, tipo, "CP")
    if (numdoc>0):
        cladoc = tipo
        fechoa = datetime.now()
        usera = datos["usuario"]
        valcapo = datos["valorRet"]
        valinto = 0
        valactc = datos["valorCActual"]
        valacti = datos["valorIActual"]
        moneda = "DO"
        tipcam = "1"
        refere = "GENERACION AUTOMATICA RETENCION " + str(datos["numRet"])
        docrel = datos["numFactura"]
        secrel = datos["secFactura"]
        clarel = datos["tipFactura"]
        origen ="T"
        with connections[db_alias].cursor() as cur:
            ssql = "INSERT INTO cpxxt002 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            cur.execute(ssql,(cia,division,agencia,codpro,numdoc,cladoc,fechoa,usera,valcapo, valinto,valactc,valacti,moneda,tipcam,refere,docrel,secrel,clarel,None,None,None,origen))
            
            if cur.rowcount>0:
                actualizarSecuencia(db_alias, numdoc, "e", datos["codDiv"], datos["codAge"], "AC", "CP")
                #Actualizo valor en registro de documento, dependiendo ajustes (credito + , debito -)
                if tipo =="AC":
                    ssqlAux = "dc_vcapact = dc_vcapact - " + valcapo 
                else: 
                    ssqlAux = "dc_vcapact = dc_vcapact + " + valcapo 

                ssql ="UPDATE cpxxt001 SET " + ssqlAux + ", dc_trnrel  = " + str(numdoc) + ", dc_clarel  = '" + cladoc + "'"\
                    " WHERE dc_cia = '"+ cia +"' AND dc_division = '" + division+ "' AND dc_agencia = '"+ agencia +"' AND dc_codpro = " + str(codpro)+ " AND"\
                    " dc_numdoc = '" + docrel + "' AND dc_secuenc = '" + secrel + "' AND dc_cladoc = '" + clarel + "'"
                cur.execute(ssql)
            else:
                raise MiError("Error al guardar ajuste sobre factura")
    
def crearXmlRetencion(request, datos):
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        #Datos de Compania
        ssql="SELECT * FROM ciatt003 WHERE co_tipfila = 'c' AND co_cia = 'e'"
        cur.execute(ssql)       
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        compania = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        rsocial=compania[0]["co_nomext"]
        ncomercial=compania[0]["co_nomext"]
        nruc=compania[0]["co_ruc"].rstrip()
        dirmatriz =compania[0]["co_direcc"].rstrip()
        resolucionContrib = compania[0]["co_resolucion"]
       
        #Datos de agencia, ptos emision y establecimiento
        ssql = ("SELECT co_direcc,sr_codestab,sr_ptoemision FROM ciatt003,ciatt203 "
            "WHERE co_tipfila = 'a' AND co_agencia = '" + datos["ncodAgencia"] + "' "
            "AND co_div = 'v' "  
            "AND sr_bodega = co_patronal "
            "AND sr_division ='" + datos["ncodDiv"] + "' AND sr_cladoc = '07'")
        cur.execute(ssql)
        dataAgencia = cur.fetchone()

        if dataAgencia is None:
            print(f"ERROR: No se encontró agencia para codAgencia={datos['ncodAgencia']}, codDiv={datos['ncodDiv']}")
            return None  # o lanzar un error controlado

        diragencia = dataAgencia[0].rstrip()
        establecimiento=dataAgencia[1]
        ptoemision = dataAgencia[2]
        
        #Datos Retencion
        ssql = "SELECT UNIQUE(rt_fhaper) FROM cpxxt007 WHERE rt_agencia = '" + datos["ncodAgencia"] + "' AND rt_numero = " + str(datos["nnumRetencion"])
        fecemision = consultarDato(request, ssql, db_alias=db_alias).date().strftime("%d/%m/%Y")
        nretencion = str(datos["nnumRetencion"]).zfill(9)
            
        #Datos Proveedor   
        proveedor = datos["ndataProveedor"]
        if (proveedor["actividad"]=="RE"):
            relacionada ="SI"
        else:
            relacionada ="NO"
        nomprov = proveedor["nombre"]
        nomprov = nomprov.replace('¥', 'Ñ')
        ideprov = proveedor["identificacion"]
        codprov =proveedor["codigo"]
        codideprov = consultarDato(request, "SELECT ce_codide FROM ciatt211 WHERE ce_codigo = " + str(codprov), db_alias=db_alias)
        emailprov = proveedor["email"]
        personprov = proveedor["persona"]
        #Datos factura
        factura = datos["ndataFactura"]
        fecfactura = factura["fechaFactura"]
        mesfactura = f'{fecfactura.month:02d}'
        aniofactura = fecfactura.year
        periodoFiscal = str(mesfactura)+"/"+str(aniofactura)
        valtotal = float(factura["valOriginal"])
        iva = factura["iva"]
        if (iva>0):
            valtotalsinimp = valtotal / (1+(iva/100))
        else:
            valtotalsinimp= valtotal
        valiva = valtotal-valtotalsinimp
        match iva:
            case  0:
                codiva = 0
            case 12:
                codiva = 2
            case 14:
                codiva = 3
            case 15:
                codiva = 4 
        
        ssqlOtro = "SELECT oc_serie, oc_cod_tip, oc_ide_cre FROM ocxxt001 WHERE oc_codpro = " + str(codprov) + " AND oc_division = '" + datos["ncodDiv"] + "' "\
            " AND oc_facpro = '" + datos["nfactura"] + "' AND oc_compania = 'e' AND oc_agencia = '" + datos["ncodAgencia"] + "'"\
            " UNION "\
            "SELECT oc_serie, oc_cod_tip, oc_ide_cre FROM ocxxt801 WHERE oc_codpro = " + str(codprov) + " AND oc_division = '" + datos["ncodDiv"] + "' "\
            " AND oc_facpro = '" + datos["nfactura"] + "' AND oc_compania = 'e' AND oc_agencia = '" + datos["ncodAgencia"] + "'"
        ssql = ssqlOtro
        if (datos["ncodDiv"]=='v'):
            ssqlaux = "SELECT COUNT(*) FROM cpxxt011, vvxxt013 WHERE hc_orden = '" + datos["nfactura"]  +"' AND hc_tipo = cv_tipo "\
                " AND hc_transac = cv_transac AND hc_codcli = " + str(codprov) + " AND hc_tipo[3,4] = '16'"
            if consultarDato(request, ssqlaux, db_alias=db_alias)==1:
                #Facturas compras vehiculos
                ssqlVeh=" SELECT UNIQUE cv_serfac, "", "", "" FROM cpxxt011, vvxxt013 WHERE hc_orden = '" + datos["nfactura"]  +"' AND hc_tipo = cv_tipo "\
                " AND hc_transac = cv_transac AND hc_codcli = " + str(codprov) + " AND hc_tipo[3,4] = '16'"
            else:
                #Otras compras division vehiculos (accesorios vehiculos)
                ssqlVeh = ssqlOtro
            
            ssql = ssqlVeh
        
        cur.execute(ssql)
        dataFactura = cur.fetchone()
        seriefac = dataFactura[0]
        tipdocfac = dataFactura[1]
        coddocfac = dataFactura[2]
        
        if (tipdocfac==None):
            #Compras vehiculo
            tipdocfac = "01"
            coddocfac = "01"
        
        numfac = str(int(datos["nfactura"])).zfill(9)
        numfaccompleto=seriefac+numfac
        
    cur.close
    clave = datetime.strptime(fecemision, "%d/%m/%Y").strftime("%d%m%Y") + "07" + nruc + "2" + establecimiento + ptoemision + nretencion + "476456781"
    clave = generaclave(clave)
    #Estructura XML
    comprobante = ET.Element("comprobanteRetencion",id='comprobante',version='2.0.0')
    infoTributaria = ET.SubElement(comprobante,"infoTributaria")
    ET.SubElement(infoTributaria,"ambiente").text="2"
    ET.SubElement(infoTributaria,"tipoEmision").text="1"
    ET.SubElement(infoTributaria,"razonSocial").text=rsocial
    ET.SubElement(infoTributaria,"nombreComercial").text=ncomercial
    ET.SubElement(infoTributaria,"ruc").text=nruc
    ET.SubElement(infoTributaria,"claveAcceso").text=clave
    ET.SubElement(infoTributaria,"codDoc").text="07" #Constante codigo identifica tipo comprobante:retencion
    ET.SubElement(infoTributaria,"estab").text=establecimiento
    ET.SubElement(infoTributaria,"ptoEmi").text=ptoemision
    ET.SubElement(infoTributaria,"secuencial").text=nretencion
    ET.SubElement(infoTributaria,"dirMatriz").text=dirmatriz
    infoCompRetencion = ET.SubElement(comprobante,"infoCompRetencion")
    ET.SubElement(infoCompRetencion,"fechaEmision").text=str(fecemision)
    ET.SubElement(infoCompRetencion,"dirEstablecimiento").text=diragencia
    ET.SubElement(infoCompRetencion,"contribuyenteEspecial").text=str(resolucionContrib)
    ET.SubElement(infoCompRetencion,"obligadoContabilidad").text="SI"
    ET.SubElement(infoCompRetencion,"tipoIdentificacionSujetoRetenido").text= codideprov
    if (codideprov == "08"):
        if (personprov=="N"):
            ET.SubElement(infoCompRetencion,"tipoSujetoRetenido").text= "01"
        else:
            ET.SubElement(infoCompRetencion,"tipoSujetoRetenido").text= "02"
    
    ET.SubElement(infoCompRetencion,"parteRel").text=relacionada
    ET.SubElement(infoCompRetencion,"razonSocialSujetoRetenido").text=nomprov
    ET.SubElement(infoCompRetencion,"identificacionSujetoRetenido").text=ideprov
    ET.SubElement(infoCompRetencion,"periodoFiscal").text= periodoFiscal
    docsSustento=ET.SubElement(comprobante,"docsSustento")
    
    docSustento=ET.SubElement(docsSustento,"docSustento")
    ET.SubElement(docSustento,"codSustento").text=coddocfac #identidad de credito en induvic o Tipo Credito en web
    ET.SubElement(docSustento,"codDocSustento").text=tipdocfac #Tipo Comprobante en pantalla induvic, en web se envia constante
    ET.SubElement(docSustento,"numDocSustento").text=numfaccompleto
    ET.SubElement(docSustento,"fechaEmisionDocSustento").text=str(fecfactura.strftime("%d/%m/%Y"))
    if (codideprov != "08"):
        #proveedor nacional
        ET.SubElement(docSustento,"pagoLocExt").text="01"
    else:
        #proveedor extrajero"
        ET.SubElement(docSustento,"pagoLocExt").text="02"
        ET.SubElement(docSustento,"tipoRegi").text="01"
        ssql ="SELECT p1_atrib1 FROM genet001,ciatt011 WHERE p1_ideent = 'PS' AND p1_tipent = pv_pais AND pv_codigo = " +str(codprov)
        print(ssql)
        pais = consultarDato(request, ssql, db_alias=db_alias)
        ET.SubElement(docSustento,"paisEfecPago").text=str(pais).rstrip()
        ET.SubElement(docSustento,"aplicConvDobTrib").text="NO"
        ET.SubElement(docSustento,"pagExtSujRetNorLeg").text="SI"
        ET.SubElement(docSustento,"pagoRegFis").text="SI"
    
    ET.SubElement(docSustento,"totalSinImpuestos").text=str( f"{valtotalsinimp:.2f}")
    ET.SubElement(docSustento,"importeTotal").text=str(f"{valtotal:.2f}")

    impuestosDocSustento = ET.SubElement(docSustento,"impuestosDocSustento")
    #Hay que modificar si un día se ingresa facturas con items con y sin iva, de esta sección habria dos por el 0 y el >0
    impuestoDocSustento=ET.SubElement(impuestosDocSustento,"impuestoDocSustento")
    ET.SubElement(impuestoDocSustento,"codImpuestoDocSustento").text="2" #Constante codigo Impuesto Iva
    ET.SubElement(impuestoDocSustento,"codigoPorcentaje").text=str(codiva)
    ET.SubElement(impuestoDocSustento,"baseImponible").text=str( f"{valtotalsinimp:.2f}")
    ET.SubElement(impuestoDocSustento,"tarifa").text=str(iva) #%iva
    ET.SubElement(impuestoDocSustento,"valorImpuesto").text=str( f"{valiva:.2f}")

    retenciones = ET.SubElement(docSustento,"retenciones")
    totret =0
    for dataRetencion in datos["ndataRetencion"]:
        retencion = ET.SubElement(retenciones,"retencion")
        if (dataRetencion["rt_tipo"]=="F"):
            #fuente
            codigo = 1
            codret=dataRetencion["rt_codigo_sri"]
        else:
            #iva
            codigo = 2
            match dataRetencion["rt_porcen"]:
                case 10:
                    codret = 9
                case 20:
                    codret = 10
                case 30:
                    codret = 1
                case 50:
                    codret = 11
                case 70:
                    codret = 2
                case 100:
                    codret = 3    
        base = Decimal(dataRetencion["rt_base"])
        porcentaje = Decimal(dataRetencion["rt_porcen"])
        valret = (base * (porcentaje/100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        totret=totret+valret
        ET.SubElement(retencion,"codigo").text=str(codigo)
        ET.SubElement(retencion,"codigoRetencion").text=str(codret).rstrip()
        ET.SubElement(retencion,"baseImponible").text=str( f"{base:.2f}")
        ET.SubElement(retencion,"porcentajeRetener").text=str( f"{porcentaje:.2f}")
        ET.SubElement(retencion,"valorRetenido").text=str( f"{valret:.2f}")
    
    pagos = ET.SubElement(docSustento,"pagos")
    pago = ET.SubElement(pagos,"pago")
    ET.SubElement(pago,"formaPago").text="20"
    ET.SubElement(pago,"total").text=str( f"{totret:.2f}")

    infoAdicional=ET.SubElement(comprobante,"infoAdicional")
    campoAdicionalemail =ET.SubElement(infoAdicional,"campoAdicional")
    campoAdicionalemail.set("nombre","emailCliente")
    campoAdicionalemail.text = emailprov

    campoAdicionaltotalret =ET.SubElement(infoAdicional,"campoAdicional")
    campoAdicionaltotalret.set("nombre","totalRetencion")
    campoAdicionaltotalret.text = str( f"{totret:.2f}") 
    
    tree = ET.ElementTree(comprobante)

    nombre_archivo= f'{datos["ncodDiv"]}ew0w{datos["nnumRetencion"]}.xml'
    print("nombre xml: "+ nombre_archivo)
    #Produccion
    #ruta_remota = r"\\192.168.1.11\enviodoc\all-ftpconex\out\compret"
    #ruta_completa = os.path.join(ruta_remota, nombre_archivo)
    #tree.write(ruta_completa,encoding='utf-8',xml_declaration=True)
    
    #Desarrollo
    tree.write("new_data.xml",encoding='utf-8',xml_declaration=True)
    
    # with connection.cursor() as cur:
    #     ssql="UPDATE cpxxt007 SET rt_aut_sri = '" + clave + "' WHERE rt_agencia = '" + datos["ncodAgencia"] + "' AND rt_numero = " + str(datos["nnumRetencion"])
    #     print("clave", clave)
    #     cur.execute(ssql)
    #     cur.close
    print("XML CREADO!!", clave)
    return clave

def generaclave(clave):
    claveinv=""
    largo = len(clave)
    for i in range(largo,0,-1): #(desde, hasta, salto)
        caracter=clave[i-1]
        claveinv=claveinv+caracter
    pivote = 2
    tcadena = 0
    for i in range(0,largo,1):
        if pivote == 8 :
            pivote =2
        
        temporal = int(claveinv[i])*pivote
        pivote = pivote + 1
        tcadena = tcadena + temporal
    
    temporal = 11 - (tcadena % 11)
    if (temporal==10):
        temporal="1"
    if (temporal==11):
        temporal="0"
    digito=str(temporal)
    clave = clave + digito
    
    return clave

def prueba(request):
    
    return render(request,'prueba.html')

def cargarTmplConsultaOrdenes(request):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    return render(request,'consultaOrdenes.html', {'company': company, 'company_key': company_key})

def cargarAgencias(request):
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT co_agencia, co_nomcorto FROM ciatt003 WHERE co_tipfila = 'a' AND co_div = 'v'"
        cur.execute(ssql)
        agencias = [{'co_agencia': row[0], 'co_nomcorto': row[1]} for row in cur.fetchall()]
        cur.close
    return JsonResponse({'agencias':agencias}, safe=False)

def cargarDivisiones(request):
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT co_div, co_nomcorto FROM ciatt003 WHERE co_tipfila ='d'"
        cur.execute(ssql)
        divisiones = [{'co_div':row[0],'co_nomcorto': row[1]} for row in cur.fetchall()]
        cur.close
    return JsonResponse({'divisiones':divisiones})
    

def consultarOrdenesCompra(request):
    ssql_aux = "1 = 1"
    valfiltros =[]
    if request.method == "GET":
        
        #Inicializa consulta con todas las ordenes del día
        hoy = date.today().strftime("%d/%m/%Y")
        ssql_aux  += " AND DATE(oc_fecing) = ? "
        valfiltros.append(hoy)
        print("consulta get ", ssql_aux, valfiltros)
    elif request.method == "POST":
        #Ejecuta un consulta con boton consulta que hace un post, obtenemos filtros
        
        filtros = json.loads(request.body)
        #filtros.get('nombre_en_js',valor_por_defecto cadena vacia pa poder usar la fx strip, en otro tipo de datos no se manda valor por defecto)
        codage = filtros.get('agencia','').strip()
        codproveedor = filtros.get('proveedor')
        numorden = filtros.get('ordenCompra')
        fecini = filtros.get('fecIni')
        fecfin = filtros.get('fecFin')
        coddivision = filtros.get('division')
        factura = filtros.get('factura')
        ordentaller = filtros.get('ordenTaller')

        if codage:
            ssql_aux += " AND oc_agencia = ? "
            valfiltros.append(codage)
        if codproveedor:
            ssql_aux += " AND oc_codpro = ? "
            valfiltros.append(codproveedor)
        if numorden:
            ssql_aux += " AND oc_numero = ? "
            valfiltros.append(numorden)
        if (fecini and fecfin):
            fecini =  datetime.strptime(fecini, "%Y-%m-%d").date()
            fecfin =  datetime.strptime(fecfin, "%Y-%m-%d").date()
            
            ssql_aux += " AND DATE(oc_fecing) BETWEEN ? AND ?"
            valfiltros.append(fecini.strftime("%d/%m/%Y"))
            valfiltros.append(fecfin.strftime("%d/%m/%Y"))
        if coddivision:
            ssql_aux += " AND oc_division = ? "
            valfiltros.append(coddivision)
        if factura:
            ssql_aux += " AND oc_facpro MATCHES ? "
            valfiltros.append('*' +  factura) 
        if ordentaller:
            ssql_aux += " AND oc_ordtra = ? "
            valfiltros.append(ordentaller)

    else:
        return JsonResponse({'ERROR': 'Método no permitido'}, status=405)

    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        sql= f"""
            SELECT oc_agencia, oc_division, pv_nombre,oc_numero, oc_facpro, oc_ordtra, DATE(oc_fecing) as oc_fecing
            FROM ocxxt001,ciatt011 
            WHERE pv_codigo = oc_codpro AND oc_estado = 'T' AND {ssql_aux} 
            UNION
            SELECT oc_agencia, oc_division, pv_nombre,oc_numero, oc_facpro, oc_ordtra, DATE(oc_fecing) as oc_fecing
            FROM ocxxt801,ciatt011 
            WHERE pv_codigo = oc_codpro AND oc_estado = 'T' AND {ssql_aux} 
            ORDER BY oc_numero DESC
        """
        cur.execute(sql,valfiltros+valfiltros)
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        ordenes = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        dataOrdenes={'ordenes':ordenes}

    cur.close
    return JsonResponse(dataOrdenes, safe=False)

def cargarCuentasCtb(request):
    db_alias = get_db_from_request(request)
    cadena = request.GET.get('term','').strip()
    cadena = cadena.upper()
    parametros =[cadena,cadena]
    print(parametros)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT ct_cuenta, ct_descripcion FROM cgrta001 WHERE ct_compania ='e' AND (ct_cuenta MATCHES ? OR ct_descripcion MATCHES ?) ORDER BY ct_descripcion "
        cur.execute(ssql,parametros)
        cuentasCtbs = cur.fetchall()
        cur.close
    listCuentasCtbs =[]
    for cuenta, nombre in cuentasCtbs:
        listCuentasCtbs.append({
            "label": f"{cuenta.strip()} - {nombre.strip()}",
            "nombre": nombre.strip(),
            "numero": cuenta.strip()
        })
    return JsonResponse(listCuentasCtbs, safe=False)


def cargarProveedores(request):
    #la variable term viene su nombre por defecto, propia de la funcion autocomplete de js
    cadena = request.GET.get('term', '').strip()
    cadena = cadena.upper()
    parametros=[]
    #Se da opcion de busqueda con autocomplete sea con nombre o codigo
    #pero antes se debe identificar si lo tipiado es un numero o letras y es que si son letras se enviará 0 para el campo codigo por error de conversión
    try:
        codigo = int(cadena) #para identificar se hace conversion a #
        parametros.append(f"{cadena}") #si no da error es numero y se envia ambos parametros tal cual
        parametros.append(codigo)
    except ValueError:
        parametros.append(f"{cadena}") #si da error es que son letras, por tanto se envia la cadena como primer parametro y 0 como segundo parametro 
        parametros.append(0)
    
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT pv_codigo, pv_nombre FROM ciatt011 WHERE pv_estado <> 'E' AND (pv_nombre MATCHES ? OR pv_codigo = ?) ORDER BY pv_nombre"
        cur.execute(ssql,parametros)
        proveedores = cur.fetchall()
        cur.close

    listproveedores =[]
    for codigo, nombre in proveedores:
        listproveedores.append({
            "label": f"{nombre} ({codigo})",
            "value": nombre.strip(),
            "codigo": codigo
        })
    return JsonResponse(listproveedores, safe=False)

def cargarTmplConsultaPlantillas(request):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    return render(request,'consultaPlantillasPeriodicas.html', {'company': company, 'company_key': company_key})

def consultarPlantillas(request):
    ssql_aux = "1 = 1"
    valfiltros =[]
    if request.method == "GET":
        ssql_aux = "1 = 1"
    elif request.method == "POST":
        filtro = json.loads(request.body)
        codPlantilla = filtro.get('codigo','').strip()
        
        if codPlantilla:
            ssql_aux += " AND pc_codigo = ? "
            valfiltros.append(codPlantilla)
    else:
        return JsonResponse({'ERROR': 'Método no permitido'}, status=405)

    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = f"""
            SELECT pc_codigo, pc_concepto, pv_nombre FROM ocxxt010, ciatt011 
            WHERE pv_codigo = pc_codpro AND {ssql_aux} ORDER BY pc_concepto
         """ 
        cur.execute(ssql, valfiltros)
        columnas = [col[0] for col in cur.description]
        plantillas = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        dataPlantillas = {'plantillas': plantillas}
    cur.close

    return JsonResponse(dataPlantillas, safe=False)

def cargarConceptoPlantillas(request):
    #la variable term viene su nombre por defecto, propia de la funcion autocomplete de js
    cadena = request.GET.get('term', '').strip()
    cadena = cadena.upper()
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT pc_codigo, pc_concepto FROM ocxxt010 WHERE pc_concepto MATCHES ? ORDER BY pc_concepto"
        cur.execute(ssql,[f"{cadena}"])
        plantillas = cur.fetchall()
        cur.close

    listplantillas =[]
    for codigo, nombre in plantillas:
        listplantillas.append({
            "label": f"{nombre} ({codigo})",
            "value": nombre,
            "codigo": codigo
        })
    return JsonResponse(listplantillas, safe=False)        

def crearPlantilla(request):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    listsSelects = obtenerSelectPlantilla()
    context = {
        'nproceso' : "C",
        'nsolicitantes':listsSelects["solicitantes"],
        'nsubtipos': listsSelects["subtipos"],
        'ntipoComprobantes' : listsSelects["tipoComprobantes"],
        'ntipoCreditos' : listsSelects["tipoCreditos"],
        'nitemsIva' : listsSelects["itemsIva"],
        'nitemsFte' : listsSelects["itemsFte"],
        'company': company,
        'company_key': company_key,
    }
    return render(request,'plantillaPeriodica.html', context)

def editarPlantilla(request, codigo):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    if request.method == "GET":
        parametros=["d", codigo]
        ssql = "SELECT * FROM ocxxt010 WHERE pc_division = ? AND pc_codigo = ?"
        plantilla = consultarRegistros(request, ssql,parametros)
        datosProveedor = obtenerDatosProveedor(request, plantilla[0]["pc_codpro"])

        listsSelects = obtenerSelectPlantilla()

        context ={
            'nproceso' : "U",
            'nplantilla': plantilla[0],
            'ndatosProveedor': datosProveedor,
            'nsolicitantes':listsSelects["solicitantes"],
            'nsubtipos': listsSelects["subtipos"],
            'ntipoComprobantes' : listsSelects["tipoComprobantes"],
            'ntipoCreditos' : listsSelects["tipoCreditos"],
            'nitemsIva' : listsSelects["itemsIva"],
            'nitemsFte' : listsSelects["itemsFte"],
            'company': company,
            'company_key': company_key,
            }
    
    return render(request,'plantillaPeriodica.html', context)

def obtenerSelectPlantilla():
    db_alias = get_db_from_request(request)
    #Obtiene registros para llenar los select del template plantillaPeriodica
    listsSelects={}
    #Solicitantes
    ssql ="SELECT so_codigo, so_nombres FROM ocxxt006 WHERE so_estado = 'A' ORDER BY so_nombres "
    solicitantes = consultarRegistros(db_alias, ssql)
    listsSelects["solicitantes"] = solicitantes
    #Subtipos
    ssql = "SELECT to_tipo, to_descrip FROM ocxxt004 WHERE to_division = 'd' ORDER BY to_descrip "
    subtipos = consultarRegistros(db_alias, ssql)
    listsSelects["subtipos"]= subtipos
    #Tipo Comprobantes
    ssql =  """
        SELECT coat008.tip_codigo, tip_comprobante FROM coat008 
        WHERE tip_estado = 'A' AND tip_reg  = 'C' ORDER BY tip_comprobante
        """
    tipoComprobantes = consultarRegistros(db_alias, ssql)
    listsSelects["tipoComprobantes"]=tipoComprobantes
    #Tipo Identidad Credito
    ssql = "SELECT cre_codigo, cre_descrip FROM coat007 WHERE coat007.cre_codigo <> '00' ORDER BY cre_descrip"
    tipoCreditos = consultarRegistros(db_alias, ssql)
    listsSelects["tipoCreditos"] = tipoCreditos
    #Items Iva
    ssql = "SELECT rt_secuencia, rt_descrip, rt_porcen, rt_subtipo FROM ocxxt003 WHERE rt_estado = 'A' AND rt_tipo = 'I'"
    itemsIva = consultarRegistros(db_alias, ssql)
    listsSelects["itemsIva"]= itemsIva
    #Items Fuente
    ssql = "SELECT rt_secuencia, rt_descrip, rt_porcen, rt_subtipo FROM ocxxt003 WHERE rt_estado = 'A' AND rt_tipo = 'F'"
    itemsFte = consultarRegistros(db_alias, ssql) 
    listsSelects["itemsFte"] = itemsFte

    return listsSelects

def consultarExistencia(request):
    db_alias = get_db_from_request(request)
    #Desde frontend consulta existencia de registro (conteo registro), usado en validaciones en proceso de creación
    print("consultarExistencia")
    validador =  request.GET.get("validador")
    codigo =  request.GET.get("codigo")
    condicion =  request.GET.get("condicion")

    if validador not in VALIDACIONES:
        return JsonResponse({"error": "Validador no encontrado"}, status=400)
    
    ssql_aux = " 1 = 1 "
    tabla = VALIDACIONES[validador]["tabla"]
    campo =  VALIDACIONES[validador]["campo"]
    if (condicion) :
        campo2 =  VALIDACIONES[validador]["condicion"]
        ssql_aux = f" {campo2} = {condicion}"    
    
    ssql = f"SELECT COUNT(*) AS existe FROM {tabla} WHERE {campo} = ? AND {ssql_aux}" 
    print(ssql)
    existe = consultarDato(request, ssql,[codigo], db_alias=db_alias)
    return JsonResponse({"existe": existe})


def consultarFromTemplate(request):
    #Desde frontend obtiene datos de un registro especifico mediante codigo y entidad devolviendo JSON
    entidad = request.GET.get("entidad")
    codigo =  request.GET.get("codigo")

    registros, numstatus = consultarRegistrosTemplate(entidad,codigo)
    if (registros):
        return JsonResponse(registros, safe=False, status=numstatus)
    else:
        return JsonResponse({"error": "No existe registro"}, status=numstatus)


def guardarPlantilla(request):
    if request.method == 'POST':
        try:
            with transaction.atomic():
                #Capturo datos
                data = json.loads(request.body)
                #Datos de forma
                forma=data.get('forma',[])
                 #Otros datos
                otrosDatos = data.get('otrosDatos',[])

                 #Caso Plantillas sin retencion
                if otrosDatos.get("iva") :
                    porcenIva = otrosDatos.get("porcenIva")
                    secuencia_iva = forma.get("selectIva")
                else:
                    porcenIva = 0
                    secuencia_iva = 0

                if otrosDatos.get("fuente") :
                    porcenFte = otrosDatos.get("porcenFte")
                    secuencia_renta = forma.get("selectFte")
                else:
                    porcenFte = 0
                    secuencia_renta = 0

                #Seteo diccionario de plantilla
                plantilla = {
                    "division" : 'd',
                    "codigo": otrosDatos.get("codigo"), #"codigo": forma.get("ncodPlan"), #No se toma de la forma, por caso update disabled no retorna
                    "concepto": forma.get("nnomPlantilla").upper(),
                    "tipo": forma.get("ncodSub"),
                    "subtipo": forma.get("tipo"),
                    "codpro": otrosDatos.get("codProveedor"),
                    "atencion": '.',
                    "solicit": forma.get("ncodSolicita"),
                    "obser1": forma.get("descripcion").upper(),
                    "obser2": None,
                    "autimp": "9999",
                    "cod_tip": forma.get("selectComprob"),
                    "ide_cre": forma.get("selectCredito"),
                    "porc_ivaret": porcenIva,
                    "secuencia_iva": secuencia_iva,
                    "porc_rentaret": porcenFte,
                    "secuencia_renta": secuencia_renta,
                    "estado": 'A',
                    "user": otrosDatos.get("user"),
                    "fecalta": date.today().strftime("%d/%m/%Y")
                }
                
                proceso = forma.get("proceso")
                db_alias = get_db_from_request(request)

                with connections[db_alias].cursor() as cur:
                    if proceso == 'C':
                        ssql = """
                            INSERT INTO ocxxt010 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """
                        parametros = list(plantilla.values())
                        cur.execute(ssql,parametros)
                        if cur.rowcount == 0:
                                raise Exception("En creacion de plantilla")
                        
                    if proceso == 'U':
                        ssql = """
                            UPDATE ocxxt010 SET pc_concepto = ?, pc_tipo = ?, pc_subtipo = ?, pc_codpro = ?,pc_solicit = ?,pc_obser1 = ?,
                            pc_cod_tip = ? ,pc_ide_cre = ?, pc_porc_ivaret = ? , pc_secuencia_iva = ?, pc_porc_rentaret = ?, pc_secuencia_renta = ?, 
                            pc_user = ?
                            WHERE pc_codigo = ?
                        """
                        parametros=[plantilla["concepto"],plantilla["tipo"],plantilla["subtipo"],plantilla["codpro"],plantilla["solicit"],
                                    plantilla["obser1"],plantilla["cod_tip"],plantilla["ide_cre"],plantilla["porc_ivaret"],plantilla["secuencia_iva"],
                                    plantilla["porc_rentaret"],plantilla["secuencia_renta"],plantilla["user"],plantilla["codigo"]]
                        cur.execute(ssql,parametros)
                        if cur.rowcount == 0:
                            raise Exception("En edicion de plantilla")
            return JsonResponse({'status': 'success', 'redirect_url': f'../../../comprasapp/cargarTmplPlantillas/' },status=200)
        except Exception as e:
            return JsonResponse({'status': 'error', 'detallerr': str(e)}, status=400)
    

def cargarTmplPlantillaCtb(request, codigo):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    db_alias = get_db_from_request(request)
    if request.method =="GET":
        parametros=["d", codigo]
        #Datos de Plantilla
        ssql = """
            SELECT pc_codigo, pc_codpro, pc_concepto, pv_nombre FROM ocxxt010, ciatt011 
            WHERE pc_codpro = pv_codigo AND pc_division = ? AND pc_codigo = ?
        """
        datosPlantilla = consultarRegistros(db_alias, ssql, parametros)
        #Variable a enviar inicializo en caso de creación
        plantillaCtb = {}
        grupo={}
        #Tiene Plantilla Contable?
        ssql = "SELECT ct_codgrp, ct_grupo FROM cgrta035, ocxxt012 WHERE  pt_grupo = ct_codgrp AND pt_codplantilla = ? GROUP BY ct_codgrp, ct_grupo"
        grupo = consultarRegistros(db_alias, ssql, [datosPlantilla[0]["pc_codigo"]])
        #Edición
        if grupo: 
            #Datos del centro de gastos
            ssql =  """
                SELECT d.mc_codpro, a.ct_secgrp, a.ct_cuenta, b.ct_descripcion, c.pt_porcentaje 
                FROM ocxxt012 a, cgrta001 b, OUTER cgrta035 c, OUTER ocxxt013 d
                WHERE b.ct_compania = 'e' AND a.ct_cuenta = b.ct_cuenta AND a.ct_codgrp = ? 
                AND c.pt_grupo = a.ct_codgrp AND c.pt_subgrupo = a.ct_secgrp AND c.pt_codplantilla = ?  
                AND d.mc_codgrp = a.ct_codgrp AND a.ct_secgrp = d.mc_secgrp AND mc_codpro = ?
            """ 
            plantillaCtb = consultarRegistros(db_alias, ssql, [grupo[0]["ct_codgrp"],datosPlantilla[0]["pc_codigo"],datosPlantilla[0]["pc_codpro"]])
            proceso = "U"
            if plantillaCtb == None:
                existe = False

            context={
            'nproceso': proceso,
            'nplantillaCtb': plantillaCtb,
            'ndatosPlantilla' : datosPlantilla[0],
            'ngrupo': grupo[0],
            'company': company,
            'company_key': company_key,
            }    
        else:
        #Creación
            proceso = "C"
            context={
            'nproceso': proceso,
            'ndatosPlantilla' : datosPlantilla[0],
            'company': company,
            'company_key': company_key,
            }    
        return render(request,'plantillaPeriodicaCtb.html', context)

def cargarCentroGastos(request):
    db_alias = get_db_from_request(request)
    #Busqueda centro de gastos con autocomplete sea con nombre o codigo
    cadena = request.GET.get('term', '').strip() #la variable term viene su nombre por defecto, propia de la funcion autocomplete de js
    cadena = cadena.upper()
    parametros=[]
    
    try:
        codigo = int(cadena) #para identificar codigo o nombre se hace conversion a #
        parametros.append(f"{cadena}") #si no da error es numero y se envia ambos parametros tal cual
        parametros.append(codigo)
    except ValueError:
        parametros.append(f"{cadena}") #si da error es que son letras, por tanto se envia la cadena como primer parametro y 0 como segundo parametro 
        parametros.append(0)
    
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT ct_codgrp, ct_grupo FROM ocxxt012 WHERE (ct_grupo MATCHES ? OR ct_codgrp = ?) GROUP BY ct_codgrp, ct_grupo ORDER BY ct_grupo"
        cur.execute(ssql,parametros)
        cgastos = cur.fetchall()
        cur.close

    listcgastos =[]
    for codigo, nombre in cgastos:
        listcgastos.append({
            "label": f"{nombre} ({codigo})",
            "value": nombre.strip(),
            "codigo": codigo
        })
    return JsonResponse(listcgastos, safe=False)

def consultarSubcentrosGastos(request, codigo, codprov):
    db_alias = get_db_from_request(request)

    if request.method =="GET":
        ssql = """
            SELECT c.mc_codpro, a.ct_secgrp, a.ct_cuenta, b.ct_descripcion FROM ocxxt012 a, cgrta001 b, OUTER ocxxt013 c
                WHERE b.ct_compania = 'e' AND a.ct_cuenta = b.ct_cuenta AND a.ct_codgrp = ? 
                AND c.mc_codgrp = a.ct_codgrp AND a.ct_secgrp = c.mc_secgrp AND mc_codpro = ?
        """
        subgruposGastos = consultarRegistros(db_alias, ssql, [codigo, codprov])
        dataSubgrupos = {'subgruposGastos': subgruposGastos}
    return JsonResponse(dataSubgrupos, safe=False)

def guardarPlantillaCtb(request):
    db_alias = get_db_from_request(request)
    if request.method == "POST" :
        try:
            with transaction.atomic():
                with connections[db_alias].cursor() as cur:
                    #Capturo datos
                    data = json.loads(request.body)
                    #Detalle de %s
                    itemsPorcen = data.get('filassubgrp',[])
                    
                    #Datos plantilla
                    otrosDatos = data.get('otrosDatos',[])
                    
                    #seteo datos generales
                    plantilla = {
                        "codplantilla" : otrosDatos.get("codPlantilla"),
                        "codproveedor" : otrosDatos.get("codProveedor"),
                        "grupo" : otrosDatos.get("codGrupo")
                    }

                    #Creación o update se elimina existente
                    ssql = "DELETE FROM cgrta035 WHERE pt_codplantilla = ?"
                    cur.execute(ssql,[plantilla["codplantilla"]])
                    if cur.rowcount == 0:
                        raise Exception("En borrar plantilla contable (cgrta035)")  
                    #Inserto
                    for item in itemsPorcen: 
                        #Valido existencia de registro de activacion subgrupo 
                        ssql = "SELECT COUNT(*) FROM ocxxt013 WHERE mc_codgrp = ? AND mc_secgrp = ? AND mc_codpro = ?"
                        parametros=[plantilla["grupo"],item["subgrupo"],plantilla["codproveedor"]]
                        existe = consultarDato(request, ssql, parametros, db_alias=db_alias)
                        
                        if (existe == 0):
                            
                            ssql = "SELECT ct_cuenta FROM ocxxt012 WHERE ct_codgrp = ? AND ct_secgrp = ?"
                            cuentaCtb = consultarDato(request, ssql, [plantilla["grupo"],item["subgrupo"]], db_alias=db_alias)
                            if (cuentaCtb):
                                ssql = "INSERT INTO ocxxt013 VALUES (?,?,?,?)"
                                cur.execute(ssql,[plantilla["grupo"],item["subgrupo"],cuentaCtb,plantilla["codproveedor"]])
                                if cur.rowcount == 0:
                                    raise Exception("En inserción activación subgrupo en proveedor (ocxxt013)")  
                            else:
                                raise Exception("No existe cuenta contable asigna al subgrupo:", item["subgrupo"])
                        
                        ssql = "INSERT INTO cgrta035 VALUES (?,?,?,?,?)"
                        parametros=[plantilla["codplantilla"],plantilla["codproveedor"],plantilla["grupo"],item["subgrupo"],item["porcentaje"]]
                        print(parametros)
                        cur.execute(ssql,parametros)
                        if cur.rowcount == 0:
                            raise Exception("En inserción plantilla contable (cgrta035)")     
            return JsonResponse({'status': 'success', 'redirect_url': f'../../../comprasapp/cargarTmplPlantillas/' },status=200)
        except Exception as e:
            return JsonResponse({'status':'error', 'detallerr': str(e)}, status=400)
       

def eliminarPlantilla(request):
    db_alias = get_db_from_request(request)
    codigo = request.GET.get("codigo")
    proceso =  request.GET.get("proceso")
    
    if request.method == "POST":
        try:
            with transaction.atomic():
                with connections[db_alias].cursor() as cur:
                    #Si solo elimina desde plantilla contable solo en cgrta035
                    if proceso == "C":
                        ssql = "DELETE FROM cgrta035 WHERE pt_codplantilla = ?"
                        cur.execute(ssql,[codigo])
                        if cur.rowcount == 0:
                            raise Exception("En eliminacion de plantilla contable (cgrta035)")
                    #Si elimina desde plantillas se borra tambien plantilla contable
                    if proceso == "P":
                        #Se verifica su existencia
                        ssql = "SELECT COUNT(*) FROM cgrta035 WHERE pt_codplantilla = ?"
                        existe = consultarDato(request, ssql, [codigo], db_alias=db_alias)
                        print("existe" , existe)
                        if (existe>0):
                            ssql = "DELETE FROM cgrta035 WHERE pt_codplantilla = ?"
                            cur.execute(ssql,[codigo])
                            if cur.rowcount == 0:
                                raise Exception("En eliminacion de plantilla contable (cgrta035)")
                        
                        ssql = "DELETE FROM ocxxt010 WHERE pc_codigo = ?"
                        cur.execute(ssql,[codigo])
                        if cur.rowcount == 0:
                            raise Exception("En eliminacion de plantilla (ocxxt010)")

            return JsonResponse({'status': 'success', 'redirect_url': f'../../../comprasapp/cargarTmplPlantillas/' },status=200)    
        except Exception as e:
            print (e)
            return JsonResponse({'status':'error', 'detallerr': str(e)}, status=400)
        
def cargarTmplConsultaCentroGastos(request):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    return render(request,'consultaCentroGastos.html', {'company': company, 'company_key': company_key})

def consultarCentroGastos(request):
    db_alias = get_db_from_request(request)
    with connections[db_alias].cursor() as cur:
        ssql = "SELECT ct_codgrp, ct_grupo FROM ocxxt012 GROUP BY ct_codgrp, ct_grupo"
        cur.execute(ssql)
        cgastos = consultarRegistros(db_alias, ssql)
        dataGastos ={'cgastos':cgastos}
    
    return JsonResponse(dataGastos, safe=False)

def cargarTmplCentroGastos(request):
    from core.models import Company
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    try:
        company = Company.objects.get(key=company_key)
    except Company.DoesNotExist:
        company = None
    
    db_alias = get_db_from_request(request)
    context ={}
    if request.method == "GET":
        codigo = request.GET.get('codigo')
        print (codigo)
        if (codigo):
            #Nombre Grupo
            ssql = f"SELECT UNIQUE(ct_grupo) FROM ocxxt012 WHERE ct_codgrp = {codigo} GROUP BY ct_grupo"
            nombreCentro = consultarDato(request, ssql, db_alias=db_alias)
            #Subgrupos en caso de edición
            ssql = """
                SELECT a.ct_secgrp, a.ct_cuenta, b.ct_descripcion FROM ocxxt012 a, cgrta001 b
                    WHERE b.ct_compania = 'e' AND a.ct_cuenta = b.ct_cuenta AND a.ct_codgrp = ? 
            """
            subgruposGastos = consultarRegistros(request, db_alias, ssql, [codigo])
            context={
                'nproceso': 'U',
                'ncodigoCentro': codigo,
                'nnombreCentro': nombreCentro,
                'ndataSubgrupos': subgruposGastos,
                'company': company,
                'company_key': company_key,
            }
        else:
            context={
                'nproceso':'C',
                'company': company,
                'company_key': company_key,
            }

    return render(request,'centroGastos.html',context)

