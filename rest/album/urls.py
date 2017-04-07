from django.conf.urls import url
from rest_framework.urlpatterns import format_suffix_patterns  
from album import views

urlpatterns = [
    url(r'^$', views.album_list),
    url(r'^(?P<pk>[0-9]+)/$', views.album_detail),
]

urlpatterns = format_suffix_patterns(urlpatterns)