from django.urls import path, include
from . import views

urlpatterns = [
    path('importacionesapp/templates/ordenImportacion', views.ordenImportacion, name='ordenImportacion'),
]