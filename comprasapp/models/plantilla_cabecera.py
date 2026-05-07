from django.db import models
from .plantilla_detalle import PlantillaDetalle

class PlantillaCabecera(models.Model):
    codigo_plantilla = models.ForeignKey(PlantillaDetalle, on_delete=models.CASCADE, db_column='pt_codplantilla')
    pt_codproveedor = models.IntegerField(primary_key=True, blank=True, null=False)
    pt_grupo = models.SmallIntegerField()
    pt_subgrupo = models.IntegerField()
    pt_porcentaje = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'cgrta035'