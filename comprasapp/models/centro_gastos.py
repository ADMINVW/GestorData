from django.db import models
from .proveedor import Proveedor
from .cuenta import Cuenta

class CentroGastos(models.Model):
    mc_codgrp = models.SmallIntegerField(primary_key=True, blank=True, null=False)
    mc_secgrp = models.IntegerField(blank=True, null=True)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='mc_codpro')
    cuenta = models.ForeignKey(Cuenta, on_delete=models.CASCADE, db_column='mc_cuenta')

    class Meta:
        managed = False
        db_table = 'ocxxt013'
