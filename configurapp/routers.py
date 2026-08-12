class AyudaModuloRouter:
    """
    Envía exclusivamente AyudaModulo a SQLite.
    El resto de modelos continúa con CompanyDBRouter.
    """

    APP_LABEL = "configurapp" # Identifica exactamente el modelo que debe permanecer en la base SQLite principal del proyecto
    MODEL_NAME = "ayudamodulo"
    SQLITE_ALIAS = "default"

    def es_modelo_ayuda(self, app_label, model_name):
        # Comprueba si el modelo evaluado corresponde a AyudaModulo
        return (
            app_label == self.APP_LABEL
            and model_name == self.MODEL_NAME
        )

    def db_for_read(self, model, **hints):
        # Las consultas de AyudaModulo siempre se realizan en SQLite
        if self.es_modelo_ayuda(
            model._meta.app_label,
            model._meta.model_name
        ):
            return self.SQLITE_ALIAS

        return None # Permite que otro router decida sobre los demás modelos

    def db_for_write(self, model, **hints):

        # Los cambios de AyudaModulo también se guardan exclusivamente en SQLite
        if self.es_modelo_ayuda(
            model._meta.app_label,
            model._meta.model_name
        ):
            return self.SQLITE_ALIAS

        return None

    def allow_relation(self, obj1, obj2, **hints):
        modelo1_es_ayuda = self.es_modelo_ayuda(
            obj1._meta.app_label,
            obj1._meta.model_name
        )

        modelo2_es_ayuda = self.es_modelo_ayuda(
            obj2._meta.app_label,
            obj2._meta.model_name
        )
        # Si AyudaModulo participa en una relación, ambos objetos deben pertenecer a sqlite para evitar relaciones entre bases distintas.
        if modelo1_es_ayuda or modelo2_es_ayuda:
            return (
                obj1._state.db == self.SQLITE_ALIAS
                and obj2._state.db == self.SQLITE_ALIAS
            )

        return None

    def allow_migrate(
        self,
        db,
        app_label,
        model_name=None,
        **hints
    ):
        if self.es_modelo_ayuda( # La tabla de AyudaModulo solo puede crearse o migrarse en la base de datos sqlite "default"
            app_label,
            model_name
        ):
            return db == self.SQLITE_ALIAS

        return None