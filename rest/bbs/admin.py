from django.contrib import admin

# Register your models here.
from django.contrib import admin
from bbs.models import Bbs

class BbsAdmin(admin.ModelAdmin):
    list_display=('title','album','created','videoId')

admin.site.register(Bbs, BbsAdmin)