from rest_framework import serializers
from ../models import TipoCredito

class TipoCreditoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCredito
        fields = '__all__'