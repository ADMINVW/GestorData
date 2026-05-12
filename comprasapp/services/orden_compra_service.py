from django.db import transaction
from django.db.models import F
from django.db import connections
from ..models.division import Division
from ..models.tipo_credito import TipoCredito
from ..models.solicitante import Solicitante
from ..models.tipo_compra import TipoCompra
from ..models.centro_gastos import CentroGastos
from ..models.proveedor import Proveedor
from ..models.plantilla_cabecera import PlantillaCabecera
from ..models.secuencia import Secuencia
from ..models.orden_compra_cabecera import OrdenCompraCabecera
from ..models.orden_compra_detalle import OrdenCompraDetalle
from ..models.cuenta import Cuenta

class OrdenComprasService:
    def get_division(self, db_alias):
        return Division.objects.using(db_alias).filter(co_tipfila = 'd')

    def get_tipo_credito(self, db_alias):
        return TipoCredito.objects.using(db_alias).exclude(cre_codigo = '00')

    def get_solicitante(self, db_alias):
        return Solicitante.objects.using(db_alias).filter(so_estado = 'A')

    def get_tipo_compra(self, db_alias, division):
        return TipoCompra.objects.using(db_alias).filter(to_division = division, to_cia = 'e')

    def get_cuentas_proveedor_A(self, db_alias, cia, ruc):
        return CentroGastos.objects.using(db_alias).select_related('proveedor', 'cuenta').filter(
            proveedor__pv_cedruc=ruc,
            cuenta__ct_compania = cia
        )

    def get_cuentas_proveedor(self, db_alias, cia, ruc):
        with connections[db_alias].cursor() as cursor:
            sql_query = "SELECT a.*,d.ct_cuenta,c.ct_descripcion FROM ocxxt013 a, ciatt011 b, cgrta001 c, ocxxt012 d WHERE mc_codpro = pv_codigo AND c.ct_cuenta = d.ct_cuenta AND ct_compania = '" + cia + "' AND pv_cedruc = '" + ruc + "' AND ct_codgrp = mc_codgrp AND ct_secgrp = mc_secgrp"
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description]
            cuentaProv = [dict(zip(column_names, row)) for row in rows]
        return cuentaProv

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

    def actualizar_secuencia(self, db_alias, numero_secuencia, compania, division, agencia, tipoDoc, bodega):
        filtros = {
            'sq_cia': compania,
            'sq_div': division,
            'sq_agencia': agencia,
            'sq_tipo': tipoDoc
        }
        with transaction.atomic(using = db_alias):
            actualizados = Secuencia.objects.using(db_alias).filter(**filtros).update(
                sq_numero = numero_secuencia,
                sq_cia = compania,
                sq_div = division,
                sq_agencia = agencia,
                sq_tipo = tipoDoc,
                sq_bodega = bodega
            )
            
        if not actualizados:
            raise Exception("No se encontró el registro de secuencia para actualizar.")

    
    def guardar_orden_compra_cabecera(self, db_alias, datos):
        with transaction.atomic(using = db_alias):
            oc_cabecera = OrdenCompraCabecera.objects.using(db_alias).create(**datos)
        return oc_cabecera

    
    def guardar_orden_compra_detalle(self, db_alias, datos):
        with transaction.atomic(using = db_alias):
            oc_detalle = OrdenCompraDetalle.objects.using(db_alias).create(**datos)
        return oc_detalle
