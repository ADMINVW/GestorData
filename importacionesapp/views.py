from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from core.db_context import get_db_from_request
from core.context_processors import company_context
from comprasapp.services import OrdenComprasService
from comprasapp.serializers import(
    DivisionSerializer, TipoCreditoSerializer, SolicitanteSerializer
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





