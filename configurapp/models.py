from django.db import models


class AyudaModulo(models.Model):
    # Almacena la ayuda asociada a cada opción del menú del sistema.
    # Cada código de menú identifica una única ayuda
 

    codigo_menu = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Código del menú", # El código funciona como identificador lógico de la ayuda y no puede repetirse entre registros
    )

    modulo = models.CharField(
        max_length=80,
        verbose_name="Módulo",
    )

    titulo = models.CharField(
        max_length=150,
        verbose_name="Título",
    )

    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
    )

    objetivo = models.TextField(
        blank=True,
        verbose_name="Objetivo",
    )

    proceso = models.JSONField( # Se almacenan como listas JSON para conservar cada paso y recomendación como elementos indepenidentes
        default=list,
        blank=True,
        verbose_name="Proceso",
    )

    consejos = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Recomendaciones",
    )

    activo = models.BooleanField( # Permite controlar si la ayuda puede ser mostrada sin necesidad de eliminar el registro 
        default=True,
        verbose_name="Activo",
    )

    fecha_actualizacion = models.DateTimeField( # Se actualiza automáticamente cada vez que el registro se guarda
        auto_now=True,
        verbose_name="Última actualización",
    )

    class Meta:
        db_table = "config_ayuda_modulo" # Nombre utilizado para la tabla en la base de datos 
        ordering = [ # Orden predetermiando al consultar las ayudas 
            "modulo",
            "titulo",
        ]

    def __str__(self):
        # Representación legible del registro en Django 
        return f"{self.codigo_menu} - {self.titulo}"
# Create your models here.
