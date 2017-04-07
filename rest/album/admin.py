from django.contrib import admin
from album.models import Album

# Register your models here.

class AlbumAdmin(admin.ModelAdmin):
    list_display=('title','user',)

admin.site.register(Album, AlbumAdmin)