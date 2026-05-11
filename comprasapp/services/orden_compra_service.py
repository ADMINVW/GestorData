from django.db import transaction
from django.db.models import F
from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante
from ..models.tipo_compra import TipoCompra
from ..models.centro_gastos import CentroGastos
from ..models.proveedor import Proveedor
from ..models.plantilla_cabecera import PlantillaCabecera
from ..models.secuencia import Secuencia

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
    
    def get_codigo_proveedor(self, db_alias, cia, ruc):
        return Proveedor.objects.using(db_alias).filter(
            pv_cia = cia, 
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

    def update_numero_secuencia(self, db_alias, compania, division, agencia, tipoDoc):
        filtros = {
            'sq_cia': compania,
            'sq_div': division,
            'sq_agencia': agencia,
            'sq_tipo': tipoDoc
            }
        
        with transaction.atomic(using=db_alias):
            # Actualiza directamente en la BD y devuelve cuántas filas afectó
            actualizados = Secuencia.objects.using(db_alias).filter(**filtros).update(
                sq_numero=F('sq_numero') + 1
            )
            
            if actualizados:
                # Recuperamos el valor actualizado
                return Secuencia.objects.using(db_alias).get(**filtros).sq_numero
            else:
                raise Exception("No se encontró el registro de secuencia para actualizar.")
