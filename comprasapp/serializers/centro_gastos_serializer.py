from rest_framework import serializers
from ..models import CentroGastos

class CentroGastosSerializer(serializers.ModelSerializer):
    ct_cuenta = serializers.CharField(source='cuenta.ct_cuenta')
    ct_descripcion = serializers.CharField(source='cuenta.ct_descripcion')
    class Meta:
        model = CentroGastos
        fields = '__all__'