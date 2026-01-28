from django.contrib import admin
from .models import Movie, CinemaRoom, Showtime, Seat, Booking

admin.site.register(Movie)
admin.site.register(CinemaRoom)
admin.site.register(Showtime)
admin.site.register(Seat)  
admin.site.register(Booking) 

@admin.action(description='Tạo 50 ghế tự động cho phòng này')
def create_seats(modeladmin, request, queryset):
    for room in queryset:
        rows = ['A', 'B', 'C', 'D', 'E']
        for row in rows:
            for col in range(1, 11):
                Seat.objects.get_or_create(room=room, row_label=row, number=col)

class CinemaRoomAdmin(admin.ModelAdmin):
    actions = [create_seats]

admin.site.unregister(CinemaRoom) # Hủy đăng ký cũ
admin.site.register(CinemaRoom, CinemaRoomAdmin) # Đăng ký lại với Action mới