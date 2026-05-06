from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante
from ..models.tipo_compra import TipoCompra
from ..models.centro_gastos import CentroGastos

class OrdenComprasService:
    def get_division(self, db_alias):
        return Division.objects.using(db_alias).filter(co_tipfila = 'd')

    def get_tipo_credito(self, db_alias):
        return TipoCredito.objects.using(db_alias).exclude(cre_codigo = '00')

    def get_solicitante(self, db_alias):
        return Solicitante.objects.using(db_alias).filter(so_estado = 'A')

    def get_tipo_compra(self, db_alias, division):
        return TipoCompra.objects.using(db_alias).filter(to_division = division, to_cia = 'e')

    def get_cuentas_proveedor(self, db_alias, ruc):
        return CentroGastos.objects.using(db_alias).select_related('proveedor', 'cuenta').filter(
            proveedor__pv_cedruc=ruc,
            cuenta__ct_compania='e'
        )
