from django.urls import path
from . import views

urlpatterns = [
    path('comprasapp/templates/ordenCompra', views.ordenCompras),
    path('comprasapp/subTipo/', views.subTipo , name='subTipo'),
    path('comprasapp/', views.subTipo , name='subTipo'),
    path('comprasapp/cuentaProv/', views.cuentaProv , name='cuentaProv'),
    path('comprasapp/', views.cuentaProv , name='cuentaProv'),
    path('comprasapp/plantillaProv/', views.plantillaProv , name='plantillaProv'),
    path('comprasapp/', views.plantillaProv , name='plantillaProv'),
    path('comprasapp/guardaFacturaCompra/', views.guardaFacturaCompra , name='guardaFacturaCompra'),
    path('comprasapp/existe_factura/', views.existe_factura, name='existe_factura'),
    path('comprasapp/templates/retencionCompra/<int:id>/<str:codDiv>/', views.ingresarRetencion),
    path('comprasapp/guardarRetencion/', views.guardarRetencion, name='guardarRetencion'),
    path('comprasapp/templates/verTransaccion/<int:numOrden>/', views.verTransaccionResumen, name='verTransaccion'), 
    path('detalleOrden/<int:numOrden>/<str:codAge>/<str:codDiv>/<str:periodica>/<str:verificada>/', views.obtenerDetalleOrdenCompra, name='detalleOrden'),
    path('comprasapp/pruebas', views.prueba , name='prueba'),
    #minejulio
    path('comprasapp/cargarTmplOrdenes/', views.cargarTmplConsultaOrdenes , name='consultarTmplOrdenes'),
    path('comprasapp/consultarOrdenes/', views.consultarOrdenesCompra, name="consultarOrdenesCompra"),
    path('comprasapp/cargarAgencias/', views.cargarAgencias , name='cargarAgencias'),
    path('comprasapp/cargarDivisiones/', views.cargarDivisiones , name='cargarDivisiones'),
    path('comprasapp/cargarProveedores/', views.cargarProveedores , name='cargarProveedores'),
    path('detalleOrdenT/<int:numOrden>/<str:codAge>/', views.obtenerDetalleOrdenCompraT, name='detalleOrdenT'),
    
    path('comprasapp/cargarTmplPlantillas/', views.cargarTmplConsultaPlantillas , name='cargarTmplPlantillas'),
    path('comprasapp/consultarPlantillas/', views.consultarPlantillas, name="consultarPlantillas"),
    path('comprasapp/cargarConceptoPlantillas/', views.cargarConceptoPlantillas, name='cargarConceptoPlantillas'),
    path('comprasapp/crearPlantilla/', views.crearPlantilla, name='crearPlantilla'),
    path('comprasapp/editarPlantilla/', views.editarPlantilla, name='editarPlantilla'),
    path('comprasapp/consultarExistencia/', views.consultarExistencia, name='consultarExistencia'),
    path('comprasapp/consultarRegistro/', views.consultarFromTemplate, name='consultarFromTemplate'),
    path('comprasapp/guardarPlantilla/', views.guardarPlantilla, name='guardarPlantilla'),
    path('comprasapp/cargarCentroGastos/', views.cargarCentroGastos , name='cargarCentroGastos'),
    path('comprasapp/consultarSubcentrosGastos/<str:codigo>/<int:codprov>/', views.consultarSubcentrosGastos, name="consultarSubcentrosGastos"),
    path('comprasapp/eliminarPlantilla/', views.eliminarPlantilla, name='eliminarPlantilla'),
    
    path('comprasapp/cargarTmplConsultaCentroGastos/', views.cargarTmplConsultaCentroGastos , name='cargarTmplConsultaCentroGastos'),
    path('comprasapp/consultarCentroGastos/', views.consultarCentroGastos, name='consultarCentroGastos'),
    path('comprasapp/cargarTmplCentroGastos/', views.cargarTmplCentroGastos, name='cargarTmplCentroGastos'),
    path('comprasapp/cargarCuentasCtb/', views.cargarCuentasCtb , name='cargarCuentasCtb'),
    #mineoctubre
    path('detalleOrdenR/<int:numOrden>/<str:codAge>/', views.obtenerDetalleOrdenCompraR, name='detalleOrdenR'),
    path('comprasapp/verPlantillaPeriodica/<str:codigo>/', views.verPlantillaPeriodica, name='verPlantillaPeriodica'),
    path('comprasapp/verCentroGastos/<str:codigo>/', views.verCentroGastos, name='verCentroGastos'),
    path('comprasapp/cargarAsignacionCentroGastos', views.cargarTmplAsignacionCentro, name='cargarAsignacionCentroGastos')
    #path('comprasapp/templates/ordenCompra', views.tipoOrden),

]