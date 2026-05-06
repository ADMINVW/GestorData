from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante

class OrdenComprasService:
    def get_division(self):
        return Division.objects.filter(co_tipfila = 'd').values('co_div', 'co_nomext')

    def get_tipo_credito(self):
        return TipoCredito.objects.exclude(cre_codigo = '00').values('cre_codigo', 'cre_descrip')

    def get_solicitante(self):
        return Solicitante.objects.filter(so_estado = 'A').values('so_codigo', 'so_nombres')