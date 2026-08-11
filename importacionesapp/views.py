import json
import pprint
from pyexpat.errors import messages
from django.shortcuts import render
from django.http import JsonResponse, request, request
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connections, transaction
from comprasapp.models import division
from comprasapp.serializers.tipo_compra_serializer import TipoCompraSerializer
from comprasapp.views import *
from core.db_context import get_db_from_request
from core.context_processors import company_context
from comprasapp.services import OrdenComprasService
from comprasapp.serializers import(
    TipoCreditoSerializer, SolicitanteSerializer, CuentaSerializer, OrdenCompraCabeceraSerializer, OrdenCompraDetalleSerializer
)
import unicodedata

def limpiar_texto_informix(texto):
    if not texto:
        return ''
    texto = str(texto).replace("'", "''")
    texto = unicodedata.normalize('NFKD', texto)
    texto = texto.encode('ascii', errors='ignore').decode('ascii')
    return texto

@require_http_methods(["GET"])
def ordenImportacion(request):
    company_key = request.GET.get('company') or request.session.get('company_key')
    db_alias = get_db_from_request(request)
    service = OrdenComprasService()

    tipooc = service.get_tipo_compra(db_alias, division='i')
    tipos = service.get_tipo_credito(db_alias)
    solis = service.get_solicitante(db_alias)

    tipooc_data = TipoCompraSerializer(tipooc, many=True).data
    tipo_data = TipoCreditoSerializer(tipos, many=True).data
    soli_data = SolicitanteSerializer(solis, many=True).data

    return render(request, 'ordenImportacion.html', {
        'ntcompra': tipooc_data,
        'nsolicita': soli_data,
        'ntcredito': tipo_data,
        'username': company_context(request).get('db_user', ''),
        'company_key': company_key,
    })

@require_http_methods(["GET"])
def cuentaProv(request):
    db_alias = get_db_from_request(request)
    wclavebusqueda = request.GET.get('clavebusqueda')
    service = OrdenComprasService()

    print(f"clavebusqueda: {wclavebusqueda}")
#, clavebusqueda=clavebusqueda
    cuentas_proveedor = service.get_cuentas_importaciones(db_alias=db_alias,clavebusqueda=wclavebusqueda)
    if not cuentas_proveedor:
        return JsonResponse({'error': 'No se encontraron cuentas para el proveedor'})
    
    cuentas_proveedor_data = CuentaSerializer(cuentas_proveedor, many = True).data
    
    return JsonResponse({'ncuentaprov': cuentas_proveedor_data})

@csrf_exempt
@require_http_methods(["POST"])
def guardaFacturaImportaciones(request):
    db_alias = get_db_from_request(request)
    service = OrdenComprasService()
   
    try:
        data = json.loads(request.body)
        datos = data.get('datos', {})
        datos_tabla = data.get('datosTabla', [])
        datos_ex = data.get('datosEX', {})

        secuencia = service.update_numero_secuencia(
            db_alias, datos.get("oc_compania"), datos.get("oc_division"), datos.get("oc_agencia"), "OC"
        )
        
        datos['oc_numero'] = secuencia  # Agregar el número de orden de compra generado a los datos
        agencia = datos.get("oc_agencia")
        compania = datos.get("oc_compania")
        codigo_proveedor = service.get_codigo_proveedor(
            db_alias, datos.get("oc_compania"), datos_ex.get("RucProveedor")
        )

        datos['oc_codpro'] = codigo_proveedor
        if not secuencia or not codigo_proveedor:
            return JsonResponse({'error': 'Faltan datos de secuencia o de proveedor'}, status=400)
        
        print("Datos recibidos en la vista:", datos)

        cabecera_oc_data = OrdenCompraCabeceraSerializer(data=datos)
        
        if cabecera_oc_data.is_valid():
            with transaction.atomic(using=db_alias):
               service.guardar_orden_compra_cabecera(db_alias, cabecera_oc_data.validated_data)
        else:
            return JsonResponse({'error': 'Datos de cabecera no válidos', 'details': cabecera_oc_data.errors}, status=400)       


        #print("Datos de cabecera guardados correctamente",secuencia, codigo_proveedor)
        #return JsonResponse({'status': 'success', 'message': 'Factura guardada correctamente', 'oc_numero': secuencia})
        

        # Expandir filas por centro de gastos
        datos_tabla_expandido = []
        for fila in datos_tabla:
            centros_gastos = fila[6]  # lista de cuentas
            cantidad_cg = len(centros_gastos)
            total_original = float(fila[5])
            total_iva_original = float(fila[8])
            total_dividido = round(total_original / cantidad_cg, 2)
            total_iva_dividido = round(total_iva_original / cantidad_cg, 2)
            for idx, cuenta in enumerate(centros_gastos):
                # La última fila absorbe el residuo del redondeo
                if idx == cantidad_cg - 1:
                    total_fila = round(total_original - (total_dividido * (cantidad_cg - 1)), 2)
                    total_fila_iva = round(total_iva_original - (total_iva_dividido * (cantidad_cg - 1)), 2)
                else:
                    total_fila = total_dividido
                    total_fila_iva = total_iva_dividido

                nueva_fila = fila[:5] + [str(total_fila)] + [[cuenta]] + fila[7:] + [str(total_fila_iva)]
                datos_tabla_expandido.append(nueva_fila)

        # debo dividir el precio, el descuento ademas del total para el numero de centros de gastos que tenga cada fila.
        # el descuento es preferible dividir antes de separar la fila, porque vamos a obtener el porcentaje de descuento.
        i = 1
        for fila in datos_tabla_expandido:
            
            #INSERTAR DETALLE DE LA FACTURA
            CenGastos = ''
            nitem = ''
            if i > 1:
                nitem = '_' + str(i)
            
            datos_detalle = {
                'od_compania': compania,
                'od_division': 'd',
                'od_agencia': agencia,
                'od_numero': secuencia,
                'od_secuen':i,
                'od_codigo': fila[1]+ str(nitem),
                'od_canped': fila[0],
                'od_canrec': fila[0],
                'od_descri1': limpiar_texto_informix(fila[2]),
                'od_descri2': '',
                'od_preest': fila[5],
                'od_prefin': '',
                'od_descto': fila[4],
                'od_observ':'',
                'od_ped_or': fila[6][0],
                'od_poriva': fila[7], 
                'od_valiva': fila[9],              
            }   
            detalle_oc_data = OrdenCompraDetalleSerializer(data=datos_detalle)
            
                    
            if detalle_oc_data.is_valid():
                with transaction.atomic(using=db_alias):
                    service.guardar_orden_compra_detalle(db_alias, detalle_oc_data.validated_data)
                    i += 1
                    #print(f"fila_validada", detalle_oc_data.data)
            else:
                return JsonResponse({'error': 'Datos de detalle no válidos', 'details': detalle_oc_data.errors}, status=400)
            
            # precio total sin impuestos fila[5]
            # precio unitario fila[3]
            # descuento fila[4]
            # cantidad fila[0]
            # CALCULO PORCENTAJE DESCUENTO
            
            # probar aqui print("Factura guardada correctamente", secuencia, codigo_proveedor)
            division = 'd'
            # RECUPERAR LOS DATOS DE LA FACTURA YA INGRESADA PARA GENERAR LA CUENTA POR PAGAR
            print(secuencia)
            ordenCompra = obtenerOrdenCompra(request, db_alias, agencia, division, secuencia)   
            if ordenCompra is None:
                return JsonResponse({'error': f'No se pudo recuperar la orden de compra {secuencia}'}, status=400)
            guardarCtaPagar(request, db_alias, ordenCompra)
            
            # Obtener company_key para incluir en la redirección
            company_key = request.headers.get('X-Company-Key', '')
            return JsonResponse({'redirect_url': f'../../comprasapp/templates/retencionCompra/{secuencia}/{division}/?Agencia={agencia}&company={company_key}'})
            #company_key = request.headers.get('X-Company-Key', '')
            #return JsonResponse({'redirect_url': f'retencionCompra/{secuencia}/{division}/?Agencia={agencia}&company={company_key}'})
           

        return JsonResponse({'status': 'success', 'message': 'Factura guardada correctamente'})
        

    except Exception as e:
        print(f"Error al insertar detalle: {e}")
        messages.error(request, f"Hubo un fallo: no se guardó la factura")
        company_key = request.headers.get('X-Company-Key', '')
        return JsonResponse(
            {'redirect_url': f'/comprasapp/templates/ordenCompra&company={company_key}'}
        )
        #print(f"Error crítico: {str(e)}")
        #return JsonResponse({'error': str(e)}, status=500)

        
        
    



    




