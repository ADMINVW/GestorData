from django.contrib import admin

from .models import AyudaModulo


@admin.register(AyudaModulo)
class AyudaModuloAdmin(admin.ModelAdmin):
    list_display = (
        "codigo_menu",
        "modulo",
        "titulo",
        "activo",
        "fecha_actualizacion",
    )

    search_fields = (
        "codigo_menu",
        "modulo",
        "titulo",
    )

    list_filter = (
        "modulo",
        "activo",
    )
# Register your models here.
