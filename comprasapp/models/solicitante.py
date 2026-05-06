from django.db import models

class Solicitante(models.Model):
    so_cia = models.CharField(blank=True, null=True)
    so_codigo = models.CharField(blank=True, null=True)
    so_nombres = models.CharField(blank=True, null=True)
    so_fecalta = models.DateTimeField()
    so_estado = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ocxxt006'
        unique_together = (('so_cia', 'so_codigo'),)