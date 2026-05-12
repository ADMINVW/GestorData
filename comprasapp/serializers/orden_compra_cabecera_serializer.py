from rest_framework import serializers
from ..models import OrdenCompraCabecera

class OrdenCompraCabeceraSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompraCabecera
        fields = '__all__'