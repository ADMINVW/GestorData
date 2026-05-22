from django.db import models

class Retencion(models.Model):
    rt_compania = models.CharField(blank=True, null=True)
    rt_division = models.CharField(blank=True, null=True)
    rt_agencia = models.CharField(blank=True, null=True)
    rt_numero = models.IntegerField()
    rt_codpro = models.IntegerField(blank=True, null=True)
    rt_nompro = models.CharField(blank=True, null=True)
    rt_porcen = models.DecimalField(max_digits=5, decimal_places=2)
    rt_factura = models.CharField(blank=True, null=True)
    rt_valfac = models.DecimalField(max_digits=11, decimal_places=2)
    rt_base = models.DecimalField(max_digits=11, decimal_places=2)
    rt_moneda = models.CharField(blank=True, null=True)
    rt_fhaper = models.DateTimeField()
    rt_estado = models.CharField(blank=True, null=True)
    rt_numegr = models.IntegerField(blank=True, null=True)
    rt_tipcam = models.DecimalField(max_digits=8, decimal_places=2)
    rt_secuencia = models.SmallIntegerField(blank=True, null=True)
    rt_aut_sri = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'cpxxt007'