from rest_framework import serializers
from ..models import Retencion

class RetencionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Retencion
        fields = '__all__'