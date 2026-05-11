from rest_framework import serializers
from ..models import Secuencia

class SecuenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Secuencia
        fields = '__all__'