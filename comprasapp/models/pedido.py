from django.db import models
from .cuenta import Cuenta

class Pedido(models.Model):
    cp_nombre = models.CharField(primary_key=True, blank=True, null=False)
    cp_pedpro = models.CharField(blank=True, null=True)
    cp_nompro = models.CharField(blank=True, null=True)
    cp_codpro = models.IntegerField()
    cp_tipo = models.CharField(blank=True, null=True)
    cp_moneda = models.CharField(blank=True, null=True)
    cp_feclle = models.DateField()
    cp_fecped = models.DateField()
    cp_refer = models.CharField(blank=True, null=True)
    cp_estado = models.CharField(blank=True, null=True)
    cp_nrounid = models.SmallIntegerField()
    cp_valnet = models.DecimalField(max_digits=12, decimal_places=2)
    cp_lotesec = models.IntegerField(blank=True, null=True)
    cp_cta_aux = models.CharField(blank=True, null=True)
    cuenta = models.ForeignKey(Cuenta, on_delete=models.CASCADE, db_column=cp_cta_aux, related_name='cuenta')
    cp_fhalta = models.DateTimeField()
    cp_usralta = models.CharField(blank=True, null=True)
    cp_usraprob = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'vvxxt041'