from rest_framework import serializers
from ..models import Proveedor

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['pv_codigo', 'pv_cedruc','pv_nombre', 'pv_refere1', 'pv_mail']