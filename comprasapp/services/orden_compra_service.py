from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante
from ..models.tipo_compra import TipoCompra
from ..models.centro_gastos import CentroGastos
from ..models.proveedor import Proveedor
from ..models.plantilla_cabecera import PlantillaCabecera

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
    
    def get_codigo_proveedor(self, db_alias, ruc):
        return Proveedor.objects.using(db_alias).filter(
            pv_cia = 'e', 
            pv_cedruc = ruc
        ).values_list(
            'pv_codigo', flat=True
        ).first()

    def get_plantillas(self, db_alias, codigo_proveedor):
        return PlantillaCabecera.objects.using(db_alias).filter(
            pt_codproveedor=codigo_proveedor
        ).values(
            'codigo_plantilla_id',           
            'codigo_plantilla__pc_concepto'  
        ).distinct()