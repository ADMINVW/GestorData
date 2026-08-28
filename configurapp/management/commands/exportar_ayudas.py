import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from configurapp.models import AyudaModulo


class Command(BaseCommand):
    """
    Exporta las ayudas de SQLite a un archivo JSON
    que puede mantenerse versionado en Git.
    """

    help = "Exporta las ayudas configuradas a JSON."

    def handle(self, *args, **options):

        ruta = (
            Path(settings.BASE_DIR)
            / "configurapp"
            / "data"
            / "ayudas.json"
        )

        ruta.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        # Solo se exportan los datos funcionales.
        # El ID local de SQLite no forma parte de la sincronización.
        ayudas = list(
            AyudaModulo.objects
            .using("default")
            .order_by(
                "modulo",
                "titulo"
            )
            .values(
                "codigo_menu",
                "modulo",
                "titulo",
                "descripcion",
                "objetivo",
                "proceso",
                "consejos",
                "activo",
            )
        )

        with ruta.open(
            "w",
            encoding="utf-8"
        ) as archivo:

            json.dump(
                ayudas,
                archivo,
                ensure_ascii=False,
                indent=2
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(ayudas)} ayudas exportadas a {ruta}"
            )
        )