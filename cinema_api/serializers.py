from rest_framework import serializers
from .models import Movie, Showtime, Profile, Booking
class ProfileSerializer(serializers.ModelSerializer):
    # Định nghĩa các trường lấy từ bảng User liên kết
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = Profile
        # Bây giờ 'username' và 'email' đã hợp lệ nhờ định nghĩa ở trên
        fields = ['username', 'email', 'balance']

class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = '__all__'

class ShowtimeSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    class Meta:
        model = Showtime
        fields = '__all__'


from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    # Định nghĩa các trường tính toán thêm (không có trực tiếp trong Model)
    movie_title = serializers.ReadOnlyField(source='showtime.movie.title')
    showtime_display = serializers.SerializerMethodField()
    seat_labels = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        # Liệt kê đúng các trường bạn muốn trả về cho React
        fields = [
            'id', 'movie_title', 'showtime_display', 
            'seat_labels', 'total_price', 'qr_code', 'created_at'
        ]

    def get_showtime_display(self, obj):
        # Trả về chuỗi: "2026-01-14 18:00"
        return obj.showtime.start_time.strftime("%Y-%m-%d %H:%M")

    def get_seat_labels(self, obj):
        # Lấy danh sách label ghế (VD: "A1, A2") thay vì dùng seat_ids lỗi
        return ", ".join([f"{s.row_label}{s.number}" for s in obj.seats.all()])