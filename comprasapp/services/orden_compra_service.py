from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante
from ..models.tipo_compra import TipoCompra

class OrdenComprasService:
    def get_division(self):
        return Division.objects.filter(co_tipfila = 'd')

    def get_tipo_credito(self):
        return TipoCredito.objects.exclude(cre_codigo = '00')

    def get_solicitante(self):
        return Solicitante.objects.filter(so_estado = 'A')

    def get_tipo_compra(self, division):
        return TipoCompra.objects.filter(to_division = division, to_cia = 'e')
