from rest_framework import serializers
from ..models import PlantillaCabecera

class PlantillaCabeceraSerializer(serializers.Serializer):
    pt_codplantilla = serializers.CharField(source='codigo_plantilla_id')
    pc_concepto = serializers.CharField(source='codigo_plantilla__pc_concepto')
    class Meta:
        model = PlantillaCabecera
        fields = '__all__'