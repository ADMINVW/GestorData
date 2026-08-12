from django.urls import path
from . import views

urlpatterns = [
    path('tallerapp/templates/inicioTaller', views.inicioTaller),
    path('tallerapp/templates/ordenesTrabajo', views.ordenTrabajo),
    path('tallerapp/templates/ordenCompraT', views.cargarTmplOrdenCompra),
    path('tallerapp/obtenerOrden/', views.obtenerOrdenCompraTaller, name='obtenerOrdenCompraFromTemplate'),
    path('tallerapp/guardarOrdenCompra/', views.guardarOrdenCompra, name='guardarOrdenCompra'),
]