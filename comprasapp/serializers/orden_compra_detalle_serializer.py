from rest_framework import serializers
from ..models import OrdenCompraDetalle

class OrdenCompraDetalleSerializer(serializers.ModelSerializer):    
    class Meta:
        model = OrdenCompraDetalle
        fields = '__all__'