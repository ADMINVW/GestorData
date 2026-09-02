from django.urls import path
from . import views



urlpatterns = [
    path('mimenu/', views.mimenu , name='mimenu'),
]