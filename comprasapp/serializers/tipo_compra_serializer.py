from rest_framework import serializers
from ..models import TipoCompra

class TipoCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCompra
        fields = '__all__'