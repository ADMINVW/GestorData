from django.db import models

class Division(models.Model):
    co_tipfila = models.CharField(blank=True, null=True)
    co_cia = models.CharField(blank=True, null=True)
    co_div = models.CharField(primary_key=True, blank=True, null=False)
    co_agencia = models.CharField(blank=True, null=True)
    co_ciudad = models.CharField(blank=True, null=True)
    co_nomext = models.CharField()
    co_nomcorto = models.CharField(blank=True, null=True)
    co_ruc = models.CharField(blank=True, null=True)
    co_patronal = models.CharField(blank=True, null=True)
    co_replegal = models.CharField(blank=True, null=True)
    co_cedrep = models.CharField(blank=True, null=True)
    co_direcc = models.CharField(blank=True, null=True)
    co_telef1 = models.CharField(blank=True, null=True)
    co_telef2 = models.CharField(blank=True, null=True)
    co_fax1 = models.CharField(blank=True, null=True)
    co_fax2 = models.CharField(blank=True, null=True)
    co_pobox = models.CharField(blank=True, null=True)
    co_contribuyente = models.CharField(blank=True, null=True)
    co_codcli = models.IntegerField(blank=True, null=True)
    co_resolucion = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ciatt003'