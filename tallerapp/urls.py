from django.urls import path
from . import views

urlpatterns = [
path('tallerapp/templates/inicioTaller', views.inicioTaller),
path('tallerapp/templates/ordenesTrabajo', views.ordenTrabajo),

]