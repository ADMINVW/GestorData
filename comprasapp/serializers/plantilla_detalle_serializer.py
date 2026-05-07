from rest_framework import serializers
from ..models import PlantillaDetalle

class PlantillaDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantillaDetalle
        fields = ['pc_division', 'pc_codigo', 'pc_concepto']