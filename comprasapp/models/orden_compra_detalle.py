from django.db import models

class OrdenCompraDetalle(models.Model):
    od_compania = models.CharField(blank=True, null=True)
    od_division = models.CharField(blank=True, null=True)
    od_agencia = models.CharField(blank=True, null=True)
    od_numero = models.IntegerField()
    od_secuen = models.SmallIntegerField()
    od_codigo = models.CharField(blank=True, null=True)
    od_canped = models.IntegerField()
    od_canrec = models.IntegerField()
    od_descri1 = models.CharField(blank=True, null=True)
    od_descri2 = models.CharField(blank=True, null=True)
    od_preest = models.DecimalField(max_digits=13, decimal_places=6)
    od_prefin = models.DecimalField(max_digits=12, decimal_places=5, blank=True, null=True)
    od_descto = models.DecimalField(max_digits=5, decimal_places=2)
    od_observ = models.CharField(blank=True, null=True)
    od_ped_or = models.CharField(blank=True, null=True)
    od_poriva = models.SmallIntegerField(blank=True, null=True)
    od_valiva = models.DecimalField(max_digits=12, decimal_places=5, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ocxxt002'
        unique_together = (('od_compania', 'od_division', 'od_numero', 'od_secuen'),)