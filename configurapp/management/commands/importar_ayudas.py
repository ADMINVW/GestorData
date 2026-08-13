import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from configurapp.models import AyudaModulo


class Command(BaseCommand): # Importa las ayudas compartidas y las sincroniza utilizando codigo_menu como identificador
    help = "Importa y actualiza las ayudas desde JSON."

    def handle(self, *args, **options):
        ruta = (
            Path(settings.BASE_DIR)
            / "configurapp"
            / "data"
            /"ayudas.json"
        )

        if not ruta.exists():
            self.stdout.write(
                self.style.ERROR(
                    f"No existe el archivo {ruta}"
                )
            )
            return

        with ruta.open(
            "r",
            encoding="utf-8"
        ) as archivo:

            ayudas = json.load(
                archivo
            )

        creadas = 0
        actualizadas = 0

        # Toda la importación se confirma como una sola operación.
        with transaction.atomic(
            using="default"
        ):

            for datos in ayudas:

                codigo_menu = str(
                    datos.get(
                        "codigo_menu",
                        ""
                    )
                ).strip().upper()

                if not codigo_menu:
                    continue

                # El código del menú identifica la ayuda entre diferentes instalaciones de GestorData

                ayuda, creada = (
                    AyudaModulo.objects
                    .using("default")
                    .update_or_create(
                        codigo_menu=codigo_menu,
                        defaults={
                            "modulo": datos.get(
                                "modulo",
                                ""
                            ),
                            "titulo" : datos.get(
                                "titulo",
                                ""
                            ),
                            "descripcion": datos.get(
                                "descripcion",
                                ""
                            ),
                            "objetivo": datos.get(
                                "objetivo",
                                ""
                            ),
                            "proceso": datos.get(
                                "proceso",
                                []
                            ),
                            "consejos": datos.get(
                                "consejos",
                                []
                            ),
                            "activo": datos.get(
                                "activo",
                                True
                            ),
                        }
                    )
                )

                if creada:
                    creadas += 1
                else:
                    actualizadas += 1

        self.stdout.write(
            self.style.SUCCESS(
                (
                    f"Importación terminada."
                    f"Creadas: {creadas}. "
                    f"Actualizadas: {actualizadas}"
                )
            )
        )
