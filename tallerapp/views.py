from django.shortcuts import render
from django.db import transaction,connections
from core.db_context import get_db_from_request
from django.http import JsonResponse 
from core.context_processors import company_context
import json
from globales.utils import *

from comprasapp.services import (
    OrdenComprasService
)
from comprasapp.serializers import (
    TipoCreditoSerializer, SolicitanteSerializer
)
from datetime import datetime
from datetime import date
from comprasapp.views import *

# Create your views here.

def inicioTaller(request):
    return render(request,'inicioTaller.html')

def ordenTrabajo(request):
    return render(request,'ordenesTrabajo.html')

#Carga template para procesar orden de compra de taller
def cargarTmplOrdenCompra(request):
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    db_alias = get_db_from_request(request)
    #Para obtener conjunto de datos de solicitante, tipo credito
    service = OrdenComprasService()
    tipos = service.get_tipo_credito(db_alias)
    solis = service.get_solicitante(db_alias)
    tipo_data = TipoCreditoSerializer(tipos, many=True).data
    soli_data = SolicitanteSerializer(solis, many=True).data
    user_data = request.session.get(f'user_data_{company_key}', {}) #Traigo porque con sessionStorage.getItem('agencia') en js al cambiar de pestaña se perdia
    agencia = user_data.get('agencia', '')
    context={
        'nsolicita':  soli_data,
        'ntcredito':  tipo_data,
        'company_key': company_key,
        'username':   company_context(request).get('db_user', ''),
        'agencia': agencia
    }
    return render(request,'ordenCompraT.html',context)

#Trae datos de orden a procesar, para validaciones se envían datos a template (estado oc, estado ot) [habilitado en division 't' se valida al crear oc en INFOMASTER]
def obtenerOrdenCompraTaller(request):
    print("obtenerOrdenCompraTaller")
    db_alias = get_db_from_request(request)
    codAge = request.GET.get('agencia', 'Not provided')
    company_key = request.GET.get('company') or request.session.get('active_company_key', '')
    numero = request.GET.get("numero")
    print("obtenerOrdenCompraTaller param " + codAge + company_key + numero)
    with connections[db_alias].cursor() as cur:
        ssql= """
            SELECT oc_tipo,oc_solicit,oc_ordtra,ot_nomcli, me_nombremp, oc_codpro, pv_nombre, pv_cedruc, oc_estado, ot_estado, oc_obser1, oc_recargo, ot_mecani
            FROM ocxxt001, tattt001, tattt003, ciatt011
            WHERE oc_numero = ? AND oc_compania = 'e' AND oc_agencia = ? AND oc_division = 't' AND oc_estado <> 'N' AND oc_ordtra = ot_numero
            AND oc_bodprn = ot_bodprn AND ot_asesor = me_codigo AND oc_codpro = pv_codigo AND pv_estado = 'A'
            """
        cur.execute(ssql,(numero,codAge))
        columnas = [col[0] for col in cur.description]  # Obtener nombres de columnas para convertir a diccionario y poder usar en vista con nombre de campo
        datosOrden = [dict(zip(columnas, fila)) for fila in cur.fetchall()]
        print("datosOrden ", datosOrden)
        if datosOrden:
            #Fijar trato con Automotores ordenes de colisiones
            if (datosOrden[0]["oc_codpro"] == 6 and datosOrden[0]["ot_mecani"] == 2):
                porRecargo = 11
            else:
                porRecargo = datosOrden[0]["oc_recargo"]
    
            estado = str(datosOrden[0]["oc_estado"]).rstrip()

            valOrden={}
            if (estado=='A'): #Si orden de compra activa se envía todos los datos
                valOrden = {
                "tipo" : str(datosOrden[0]["oc_tipo"]).rstrip(), #Tipo de orden de compra se valida en js
                "solicitante" :  str(datosOrden[0]["oc_solicit"]).rstrip(),
                "ordenTaller" :  datosOrden[0]["oc_ordtra"],
                "clienteOrden" :  str(datosOrden[0]["ot_nomcli"]).rstrip(),
                "asesorOrden" :  str(datosOrden[0]["me_nombremp"]).rstrip(),
                "codProveedor" :  datosOrden[0]["oc_codpro"],
                "nomProveedor" :  str(datosOrden[0]["pv_nombre"]).rstrip(),
                "rucProveedor" :  str(datosOrden[0]["pv_cedruc"]).rstrip(),
                "estadoOrdenT" :  str(datosOrden[0]["ot_estado"]).rstrip(), #Estado de orden de trabajo se valida en js
                "descripcion": str(datosOrden[0]["oc_obser1"]).rstrip(),
                "recargo" :porRecargo,
                }
            else: #Si orden de compra procesada se envía solo estado, para enviar mensaje establecido en js
                valOrden = {
                "estado": estado
                }
            cur.close
            print("valOrden ", valOrden)
            return JsonResponse(valOrden, safe=False, status=200)
        else:
            return JsonResponse({"error": "Orden de compra no existe"}, status=400)
    

#Procesa orden de compra (Actualiza valores, guarda detalle según tipo de orden)
def guardarOrdenCompra(request):
    db_alias = get_db_from_request(request)
    company_key = (
        request.POST.get('company')
        or request.headers.get('X-Company-Key')
        or request.GET.get('company')
    )
    print("guardarOrdenCompra")
    codAge = request.GET.get('Agencia', 'Not provided')
    if request.method == 'POST':
        try:
            with transaction.atomic(using=db_alias):
                
                data = json.loads(request.body)
                datosOrdenCompra = data.get('forma',[])
                datosDetalle = data.get('tabla',[])
                ocompra = datosOrdenCompra.get("nnumeroCompra")
                otallerTemplate = int(datosOrdenCompra.get("nordenTaller"))
                
                print("datosOrdenCompra " , datosOrdenCompra)
                print("datosDetalle " , datosDetalle)

                #validaciones antes de: estado oc, numero y estado de ordenTaller, registro de factura existente en cuentas por pagar
                ssql = "SELECT oc_estado, oc_ordtra, oc_bodprn FROM ocxxt001 WHERE oc_numero = ? AND oc_agencia = ? AND oc_division = 't' "
                ordenCompra = consultarRegistros(ssql,[ocompra,codAge],db_alias)
                estadoOC = ordenCompra[0]["oc_estado"]
                bodprnOC = ordenCompra[0]["oc_bodprn"]
                
                if (estadoOC != 'A'):
                    raise MiError("Orden de compra ya no se encuentra activa")
                otallerActual = ordenCompra[0]["oc_ordtra"]
                
                if (otallerActual != otallerTemplate):
                    raise MiError("Orden de compra cambio de orden de taller")
                else:
                    ssql = "SELECT ot_estado, ve_agrupacion,ot_mecani FROM tattt003, tattt016 WHERE ot_numero = ? AND ot_bodprn = ? AND ot_tipveh = ve_codigo "
                    ordenTaller = consultarRegistros(ssql,[otallerActual,bodprnOC],db_alias)
                    
                    estadoOT = ordenTaller[0]["ot_estado"]
                    marcaOT = ordenTaller[0]["ve_agrupacion"]
                    
                    if (estadoOT !='A' or estadoOT == 0): #
                        raise MiError("Orden de taller relacionada ya no se encuentra activa")

                codPro = int(datosOrdenCompra.get("ncodigoProveedor"))
                factura = datosOrdenCompra.get("nnumeroFactura")
                ssql = "SELECT COUNT(*) FROM cpxxt001 WHERE dc_division = ? AND dc_agencia = ? AND dc_codpro = ? AND dc_numdoc = ? "
                existe = consultarDato(request,ssql,('t',codAge,codPro,factura),db_alias)
                if existe > 0 :
                    raise MiError("Factura ya está registrada en cuentas por pagar!")
                
                with connections[db_alias].cursor() as cur:
                    tipoOC = datosOrdenCompra.get("nsubTipoSelect")    
                    if (tipoOC == "T"):
                        #TRABAJOS EXTERNOS
                        #cargo detalle de tareas sobre orden de trabajo
                        numTar = 0
                        ssql = "SELECT MAX(tr_numtar) FROM tattt005 WHERE tr_numord = ? AND tr_bodprn = ? AND tr_ctrato IS NOT NULL"
                        numTar =  consultarDato(request,ssql,[otallerActual,bodprnOC],db_alias) 
                        
                        #variables
                        valorTotal = 0 
                        ptos = 100
                        complej = 1
                        mecani = None
                        user = datosOrdenCompra.get("user")
                        fecpro = date.today().strftime("%d/%m/%Y")
                        clase = "C"
                        estado = "I"
                        gdific = None
                        gruptr = None
                        for detalle in datosDetalle:
                            if (numTar == 0):
                                numTar = 250
                            else:
                                numTar += 150

                            codtar = "AZ"
                            descri = detalle["descripcion"].upper()
                            valor = detalle["precioTotal"]
                            valorTotal += valor
                            
                            ssql = "INSERT INTO tattt005 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                            cur.execute(ssql,(bodprnOC,otallerActual,numTar,codtar,marcaOT,descri,ptos,complej,valor,mecani,gdific,ptos,valor,user,fecpro,ocompra,clase,gruptr,estado))
                            if cur.rowcount == 0:
                                raise MiError("f'Error al registrar tarea externa {descri} sobre OT {otallerActual}")
                        #valor sobre orden de trabajo + recargo
                       
                        porRecargo = int(datosOrdenCompra.get("nporcenRecargo"))
                        tallerOT = int(ordenTaller[0]["ot_mecani"])
                        
                        #El acuerdo de recargo de automotores cuando de ordenes de taller de colisiones se trata se acordó con decimales, por eso se trabaja como constante 11  
                        if (codPro == 6 and tallerOT == 2 and porRecargo == 11):
                            valorTotal = (valorTotal / float(0.9)) #e internamente se hace calculo real
                        else:
                            valorTotal = valorTotal + (valorTotal*(porRecargo/100))
                        
                        #Actualizo Valor de Trabajos Terceros
                        ssql = "UPDATE tattt003 SET ot_vtrext = ot_vtrext + ? WHERE ot_numero = ? AND ot_bodprn = ? AND ot_estado = 'A'"
                        cur.execute(ssql,(valorTotal,otallerActual,bodprnOC))
                        if cur.rowcount == 0:
                            raise MiError("f'Error al actualizar valor de trabajos externos en OT {otallerActual}")

                    else:
                        #REPUESTOS EXTERNOS
                        #cargo detalle de repuestos sobre orden de trabajo
                        #variables
                        secuencial = 0
                        tipo = 'O' #CONSTANTE
                        valorTotal = 0 
                        lubric = 'R' #CONSTANTE
                        for detalle in datosDetalle:
                            
                            cantid = int(detalle["cantidad"].upper())
                            descri = detalle["descripcion"].upper()
                            valor = detalle["precioTotal"]
                            valorTotal += valor
                            if cantid > 1 :
                                valorUnit = valor / cantid 
                            else:
                                valorUnit = valor

                            ssql = "INSERT INTO tattt014 VALUES (?,?,?,?,?,?,?,?)"
                            cur.execute(ssql,(bodprnOC,tipo,descri,cantid,valorUnit,ocompra,otallerActual,lubric))
                            if cur.rowcount == 0:
                                raise MiError("f'Error al registrar repuesto externo {descri} sobre OT {otallerActual}")

                            #variables detalle
                            secuencial += 1 
                            valIvaItem = (cantid * valorUnit) * (int(datosOrdenCompra.get("nivaFactura"))/100)
                            valores={
                                "compania":'e',
                                "division":'t',
                                "agencia":codAge,
                                "numero":ocompra,
                                "secuen": secuencial,
                                "codigo":"XXX",
                                "canped":cantid,
                                "canrec":cantid,
                                "descri1":descri,
                                "descri2":None,
                                "preest":valorUnit,
                                "prefin":valorUnit,
                                "descto":0,
                                "observ":"BIENES",
                                "ped_or":None,
                                "poriva":int(datosOrdenCompra.get("nivaFactura")),
                                "valiva":valIvaItem
                            }
                            parametros = tuple(valores.values())
                            
                            ssql = "INSERT INTO ocxxt002 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                            cur.execute(ssql,parametros)
                            if cur.rowcount == 0:
                                raise MiError("f'Error al registrar detalle {secuencial} de OC(t) {ocompra}")

                        #valor sobre orden de trabajo + recargo
                        porRecargo = int(datosOrdenCompra.get("nporcenRecargo"))
                        valorTotal = valorTotal + (valorTotal*(porRecargo/100))
                        
                        #Actualizo Valor de Trabajos Terceros
                        ssql = "UPDATE tattt003 SET ot_vrptec = ot_vrptec + ? WHERE ot_numero = ? AND ot_bodprn = ? AND ot_estado = 'A'"
                        cur.execute(ssql,(valorTotal,otallerActual,bodprnOC))
                        if cur.rowcount == 0:
                            raise MiError("f'Error al actualizar valor de repuestos externos en OT {otallerActual}")


                    #Actualizo valor total de orden
                    ssql = '''
                            UPDATE tattt003 
                            SET ot_valact = ((ot_vmano + ot_vrover + ot_vlata + ot_vtapic + ot_vtrext + ot_vrepto + ot_vrprov + ot_vrptec + ot_vrefri  + ot_vlubri + ot_vlavada + ot_vcombu) -
                                            (ot_vdctma + ot_vdctrt + ot_vdctrp)) * (1 + (ot_porc_iva/100))
                            WHERE ot_numero = ? AND ot_bodprn = ? AND ot_estado = 'A'
                        '''
                    cur.execute(ssql,(otallerActual,bodprnOC))
                    if cur.rowcount == 0:
                        raise MiError("f'Error al actualizar valores de OT {otallerActual}")

                    #Actualizo datos de orden de compra propiamente (estado se actualiza en guardarCtaPagar)
                    #variables
                    fecfac = datetime.strptime(datosOrdenCompra.get("nfechaEmision"), "%d/%m/%Y");
                    fec_val =  fecfac + timedelta(days=365)
                    fec_val = fec_val.date().strftime("%d/%m/%Y")
                    valores = {
                        "solicit" : datosOrdenCompra.get("nselSolicita"),
                        "tipo": datosOrdenCompra.get("nsubTipoSelect"),
                        "usraprd":datosOrdenCompra.get("user"),
                        "fehaprd":datetime.now().strftime("%Y-%m-%d %H:%M"), # PARA CONTROL DE HORA DE PROCESO
                        "fecent":date.today().strftime("%d/%m/%Y"),
                        "facpro":factura,
                        "fecfac":fecfac.date().strftime("%d/%m/%Y"),
                        "valfac":float(datosOrdenCompra.get("nimporteTotal")),
                        "plazo":int(datosOrdenCompra.get("nplazoPago")),
                        "iva_mo":int(datosOrdenCompra.get("nivaFactura")),
                        "iva_rp":int(datosOrdenCompra.get("nivaFactura")),
                        "recargo":int(datosOrdenCompra.get("nporcenRecargo")),
                        "obser1":datosOrdenCompra.get("ndescripcionFactura").upper(),
                        "cod_tip":"01", #constante corresponde a tipo de documento FACTURA
                        "ide_cre":datosOrdenCompra.get("ntipoCreditoSelect"),
                        "serie":datosOrdenCompra.get("nserieFactura"),
                        "aut_sri":datosOrdenCompra.get("nautorizacionSri"),
                        "fec_val": fec_val,
                        "autimp":None,
                        "numero":int(ocompra),
                        "agencia":codAge,
                        "ordtra":otallerActual,
                        "codpro":codPro
                    }
                    parametros = tuple(valores.values())
                    print("parametros " , parametros)
                    
                    
                    ssql = '''
                           UPDATE ocxxt001 SET oc_solicit = ?, oc_tipo = ?, oc_usraprd = ? , oc_fehaprd = ?,oc_fecent = ?, oc_facpro = ?, oc_fecfac = ?,
                           oc_valfac = ?, oc_plazo = ?, oc_iva_mo = ?, oc_iva_rp = ?, oc_recargo = ? , oc_obser1 = ?, oc_cod_tip = ?,oc_ide_cre = ?, oc_serie = ?,
                           oc_aut_sri = ?, oc_fec_val = ? , oc_autimp = ?
                           WHERE oc_numero = ? AND oc_agencia = ? AND oc_division = 't' AND oc_ordtra = ? AND oc_codpro = ? AND oc_estado = 'A'
                            '''     
                    cur.execute(ssql,parametros)  
                    if cur.rowcount ==0:
                        raise MiError("Error al actualizar orden de compra")

                    
                cur.close    

                ordenCompra = obtenerOrdenCompra(request, db_alias, codAge, "t", ocompra)   
                if ordenCompra is None:
                    raise MiError('No se pudo recuperar la orden de compra {ocompra}')

                guardarCtaPagar(request, db_alias, ordenCompra)     

        except Exception as e:

            print (f"Error al guardar orden de compra: {e}")
            return JsonResponse({'status': 'error', 'detallerr': str(e)}, status=400) 
            # # print(f"Error al guardar orden de compra de taller: {e}")
            #raise 

        return JsonResponse({'status': 'success', 'redirect_url': f'../../comprasapp/templates/retencionCompra/{ocompra}/t/?Agencia={codAge}&company={company_key}'},status=200) 
    else:
        return JsonResponse({'ERROR': 'Método no permitido'}, status=405)

class MiError(Exception):
    pass 



