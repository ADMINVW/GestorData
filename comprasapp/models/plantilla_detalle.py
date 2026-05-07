from django.db import models

class PlantillaDetalle(models.Model):
    pc_division = models.CharField(blank=True, null=True)
    pc_codigo = models.CharField(primary_key=True, blank=True, null=False)
    pc_concepto = models.CharField(blank=True, null=True)
    pc_tipo = models.CharField(blank=True, null=True)
    pc_subtipo = models.CharField(blank=True, null=True)
    pc_codpro = models.IntegerField()
    pc_atencion = models.CharField(blank=True, null=True)
    pc_solicit = models.CharField(blank=True, null=True)
    pc_obser1 = models.CharField(blank=True, null=True)
    pc_obser2 = models.CharField(blank=True, null=True)
    pc_autimp = models.CharField(blank=True, null=True)
    pc_cod_tip = models.CharField(blank=True, null=True)
    pc_ide_cre = models.CharField(blank=True, null=True)
    pc_porc_ivaret = models.DecimalField(max_digits=5, decimal_places=2)
    pc_secuencia_iva = models.SmallIntegerField()
    pc_porc_rentaret = models.DecimalField(max_digits=5, decimal_places=2)
    pc_secuencia_renta = models.SmallIntegerField()
    pc_estado = models.CharField(blank=True, null=True)
    pc_user = models.CharField(blank=True, null=True)
    pc_fecalta = models.DateField()

    class Meta:
        managed = False
        db_table = 'ocxxt010'
