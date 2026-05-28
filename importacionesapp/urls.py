from django.urls import path, include
from . import views

urlpatterns = [
    path('importacionesapp/templates/ordenImportacion', views.ordenImportacion, name='ordenImportacion'),
    path('importacionesapp/cuentaProv/', views.cuentaProv, name='cuentaProv'),
    path('importacionesapp/guardaFacturaImportaciones/', views.guardaFacturaImportaciones, name='guardaFacturaImportaciones')
]