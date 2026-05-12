from django.db import models

class CentroGastosCabecera(models.Model):
    ct_codgrp = models.SmallIntegerField(blank=True, null=True)
    ct_secgrp = models.IntegerField(blank=True, null=True)
    ct_grupo = models.CharField(blank=True, null=True)
    ct_cuenta = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ocxxt012'
