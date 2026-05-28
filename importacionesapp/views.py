import json
import pprint
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from core.db_context import get_db_from_request
from core.context_processors import company_context
from comprasapp.services import OrdenComprasService
from comprasapp.serializers import(
    DivisionSerializer, TipoCreditoSerializer, SolicitanteSerializer, CuentaSerializer, OrdenCompraCabeceraSerializer
)

@require_http_methods(["GET"])
def ordenImportacion(request):
    company_key = request.GET.get('company') or request.session.get('company_key')
    db_alias = get_db_from_request(request)
    service = OrdenComprasService()

    divs = service.get_division(db_alias)
    tipos = service.get_tipo_credito(db_alias)
    solis = service.get_solicitante(db_alias)

    div_data = DivisionSerializer(divs, many=True).data
    tipo_data = TipoCreditoSerializer(tipos, many=True).data
    soli_data = SolicitanteSerializer(solis, many=True).data

    return render(request, 'ordenImportacion.html', {
        'nempresa': div_data,
        'nsolicita': soli_data,
        'ntcredito': tipo_data,
        'username': company_context(request).get('db_user', ''),
        'company_key': company_key,
    })

@require_http_methods(["GET"])
def cuentaProv(request):
    db_alias = get_db_from_request(request)
    service = OrdenComprasService()

    cuentas_proveedor = service.get_cuentas_importaciones(db_alias=db_alias)
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
        
        # Expandir filas por centro de gastos
        datos_tabla_expandido = []
        for fila in datos_tabla:
            centros_gastos = fila[6]  # lista de cuentas
            cantidad_cg = len(centros_gastos)
            total_original = float(fila[5])
            total_dividido = round(total_original / cantidad_cg, 2)
            for idx, cuenta in enumerate(centros_gastos):
                # La última fila absorbe el residuo del redondeo
                if idx == cantidad_cg - 1:
                    total_fila = round(total_original - (total_dividido * (cantidad_cg - 1)), 2)
                else:
                    total_fila = total_dividido

                nueva_fila = fila[:5] + [str(total_fila)] + [[cuenta]] + fila[7:]
                datos_tabla_expandido.append(nueva_fila)

        for fila in datos_tabla_expandido:
            print(f"fila", fila)
            
        pass

        secuencia = service.update_numero_secuencia(
            db_alias, datos.get("Compania"), datos.get("Division"), datos.get("Agencia"), "OC"
        )

        codigo_proveedor = service.get_codigo_proveedor(
            db_alias, datos.get("Compania"), datos.get("RucProveedor")
        )

        if not secuencia or not codigo_proveedor:
            return JsonResponse({'error': 'Faltan datos de secuencia o de proveedor'}, status=400)
        
        with transaction.atomic(using=db_alias):
            cabecera = 'crear metodo create en OrdenCompraService'
            
        return JsonResponse({'status': 'success', 'message': 'Factura guardada correctamente'})

    except Exception as e:
        print(f"Error crítico: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

    




