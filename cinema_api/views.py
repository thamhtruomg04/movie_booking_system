from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .models import Movie, Showtime, Seat, Booking
from .serializers import MovieSerializer, ShowtimeSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.http import JsonResponse
import qrcode
import base64
from io import BytesIO
from .serializers import BookingSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.create_user(username=username, password=password)
        return Response({"message": "Đăng ký thành công!"})

class MovieList(generics.ListAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer

class ShowtimeList(generics.ListAPIView):
    serializer_class = ShowtimeSerializer

    def get_queryset(self):
        # Lấy tham số movie_id từ URL ví dụ: /api/showtimes/?movie_id=1
        movie_id = self.request.query_params.get('movie_id')
        if movie_id:
            return Showtime.objects.filter(movie_id=movie_id)
        return Showtime.objects.all()
    


@api_view(['GET'])
def get_seat_layout(request, showtime_id):
    try:
        showtime = Showtime.objects.get(id=showtime_id)
        # Lấy tất cả ghế của phòng tương ứng với suất chiếu này
        seats = Seat.objects.filter(room=showtime.room)
        
        # Kiểm tra những ghế đã được đặt
        booked_seats = Booking.objects.filter(showtime=showtime).values_list('seats__id', flat=True)

        seat_data = []
        for seat in seats:
            seat_data.append({
                "id": seat.id,
                "label": f"{seat.row_label}{seat.number}",
                "is_booked": seat.id in booked_seats
            })
        return Response(seat_data)
    except Showtime.DoesNotExist:
        return Response({"error": "Không tìm thấy suất chiếu"}, status=404)
    
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Bắt buộc phải gửi Token kèm theo
def create_booking(request):
    data = request.data
    try:
        # 1. Lấy thông tin suất chiếu
        showtime = Showtime.objects.get(id=data['showtime_id'])
        seat_ids = data['seat_ids']
        
        movie_title = showtime.movie.title
        seats = Seat.objects.filter(id__in=seat_ids)
        seat_labels = ", ".join([f"{s.row_label}{s.number}" for s in seats])

        # 2. Sử dụng transaction để lưu dữ liệu
        with transaction.atomic():
            booking = Booking.objects.create(
                user=request.user,  # <--- THÊM DÒNG NÀY: Gán user đang đăng nhập vào vé
                showtime=showtime,
                total_price=showtime.price * len(seat_ids),
                payment_status=True
            )
            booking.seats.set(seat_ids)
            
            # 3. Tạo QR code
            booking_info = f"BookingID: {booking.id} | User: {request.user.username} | Phim: {movie_title} | Ghế: {seat_labels}"
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(booking_info)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Cập nhật mã QR vào database để sau này xem lại được trong Lịch sử
            booking.qr_code = qr_base64
            booking.save()
            
        return Response({
            "status": "success",
            "message": "Đặt vé thành công!",
            "booking_id": booking.id,
            "qr_code": qr_base64
        }, status=201)

    except Showtime.DoesNotExist:
        return Response({"error": "Suất chiếu không tồn tại"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['POST'])
def cinema_chatbot(request):
    # Lấy tin nhắn từ React gửi lên
    user_message = request.data.get('message', '').lower()
    
    # Lấy danh sách phim đang có trong hệ thống
    movies = Movie.objects.all()
    movie_titles = [m.title for m in movies]
    
    # Logic phản hồi thông minh hơn một chút
    if "phim" in user_message or "chiếu" in user_message:
        titles_str = ", ".join(movie_titles)
        response = f"🎬 Hiện rạp đang chiếu các phim: {titles_str}. Bạn muốn đặt vé phim nào?"
    
    elif any(title.lower() in user_message for title in movie_titles):
        response = "Phim này hiện vẫn còn vé. Bạn hãy nhấn nút 'ĐẶT VÉ NGAY' ở màn hình chính để chọn chỗ nhé!"
        
    elif "giá vé" in user_message or "bao nhiêu" in user_message:
        response = "Giá vé tại rạp là 50.000 VNĐ cho tất cả các suất chiếu bạn nhé!"
        
    else:
        response = "Chào bạn! Tôi là trợ lý ảo của rạp phim. Bạn có thể hỏi tôi về danh sách phim hoặc giá vé."
        
    return Response({"reply": response})

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # THÊM DÒNG NÀY để đọc Token từ React
def get_user_bookings(request):
    # Lọc đúng vé của người đang đăng nhập
    bookings = Booking.objects.filter(user=request.user).order_by('-created_at')
    
    # Debug: Mở Terminal của Django lên xem nó có in ra gì không
    print(f"DEBUG: User {request.user} đang có {bookings.count()} vé")
    
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)