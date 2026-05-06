from django.db import models

class TipoCredito(models.Model):
    cre_codigo = models.CharField(primary_key=True, blank=True, null=False)
    cre_descrip = models.CharField(blank=True, null=True)
    cre_reg = models.CharField(blank=True, null=True)
    cre_estado = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'coat007'
