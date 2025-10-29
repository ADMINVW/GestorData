from django.urls import path
from . import views



urlpatterns = [
    path('menuprapp/', views.mimenu , name='mimenu'),
    #path('menuprapp/templates/login', views.wlogin),
    path('menuprapp/templates/login', views.inilogin),
    path('menuprapp/inilogin/', views.inilogin , name='inilogin'),
    path('login/', views.wlogin , name='login'),
    #path('comprasapp/cuentaProv/', views.cuentaProv , name='cuentaProv'),
    #path('comprasapp/', views.cuentaProv , name='cuentaProv'),
    #path('comprasapp/guardaFacturaCompra/', views.guardaFacturaCompra , name='guardaFacturaCompra'),
    #path('comprasapp/templates/ordenCompra', views.tipoOrden),

]