from django.shortcuts import render

# Create your views here.

def inicioTaller(request):
    return render(request,'inicioTaller.html')

def ordenTrabajo(request):
    return render(request,'ordenesTrabajo.html')