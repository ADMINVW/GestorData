from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from core.db_context import get_db_from_request
from core.context_processors import company_context
from comprasapp.services import OrdenComprasService
from comprasapp.serializers import(
    DivisionSerializer, TipoCreditoSerializer, SolicitanteSerializer, CuentaSerializer
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





