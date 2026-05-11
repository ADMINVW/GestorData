from django.db import models

class Secuencia(models.Model):
    sq_cia = models.CharField(blank=True, null=True)
    sq_div = models.CharField(blank=True, null=True)
    sq_agencia = models.CharField(blank=True, null=True)
    sq_bodega = models.CharField(blank=True, null=True)
    sq_tipo = models.CharField(blank=True, null=True)
    sq_numero = models.IntegerField(primary_key=True)
    sq_descrip = models.CharField(blank=True, null=True)
    sq_cospre = models.CharField(blank=True, null=True)
    sq_porcent = models.DecimalField(max_digits=4, decimal_places=2)
    sq_leyen1 = models.CharField()
    sq_leyen2 = models.CharField()
    sq_nrocopia = models.SmallIntegerField()

    class Meta:
        managed = False
        db_table = 'ciatt008'