from django.db import models

class TipoCompra(models.Model):
    to_cia = models.CharField(primary_key=True, blank=True, null=False)
    to_division = models.CharField(blank=True, null=True)
    to_tipo = models.CharField(blank=True, null=True)
    to_descrip = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ocxxt004'
