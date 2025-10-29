from django.urls import path
from . import views
from comprasapp.views import existe_factura


urlpatterns = [
    path('repuestosapp/templates/compraRepuestos',views.comprasRepuestos),
    path('repuestosapp/mapeaItem/', views.mapeaItem , name='mapeaItem'),
    path('repuestosapp/guardaFacturaRepuestos/', views.guardaFacturaRepuestos , name='guardaFacturaRepuestos'),
    path('comprasapp/existe_factura/',existe_factura, name='existe_factura'),
    

]