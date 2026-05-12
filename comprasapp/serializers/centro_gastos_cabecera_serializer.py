from rest_framework import serializers
from ..models import CentroGastosCabecera

class CentroGastosCabeceraSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroGastosCabecera
        fields = '__all__'