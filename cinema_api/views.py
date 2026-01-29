from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .models import Movie, Showtime, Seat, Booking, Profile
from .serializers import MovieSerializer, ShowtimeSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.http import JsonResponse
import qrcode
import base64
from io import BytesIO
from .serializers import BookingSerializer
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import ProfileSerializer
from django.contrib.auth import update_session_auth_hash


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
@permission_classes([IsAuthenticated])
def create_booking(request):
    data = request.data
    try:
        # 1. Lấy thông tin suất chiếu và tính tổng tiền
        showtime = Showtime.objects.get(id=data['showtime_id'])
        seat_ids = data['seat_ids']
        total_price = showtime.price * len(seat_ids)
        
        # 2. Lấy ví (Profile) của User
        profile, created = Profile.objects.get_or_create(user=request.user)

        # 3. KIỂM TRA SỐ DƯ VÍ
        if profile.balance < total_price:
            return Response({
                "error": f"Số dư không đủ! Bạn cần {total_price:,.0f} VNĐ nhưng ví chỉ còn {profile.balance:,.0f} VNĐ."
            }, status=400)

        # 4. Sử dụng transaction để đảm bảo: Trừ tiền thành công thì mới tạo vé
        with transaction.atomic():
            # THỰC HIỆN TRỪ TIỀN
            profile.balance -= total_price
            profile.save()

            # Tạo vé
            booking = Booking.objects.create(
                user=request.user,
                showtime=showtime,
                total_price=total_price,
                payment_status=True # Đã thanh toán bằng ví
            )
            booking.seats.set(seat_ids)
            
            # Tạo QR code (Giữ nguyên logic của bạn)
            movie_title = showtime.movie.title
            seats = Seat.objects.filter(id__in=seat_ids)
            seat_labels = ", ".join([f"{s.row_label}{s.number}" for s in seats])
            booking_info = f"BookingID: {booking.id} | User: {request.user.username} | Phim: {movie_title} | Ghế: {seat_labels}"
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(booking_info)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            booking.qr_code = qr_base64
            booking.save()
            
        return Response({
            "status": "success",
            "message": f"Thanh toán thành công! Đã trừ {total_price:,.0f} VNĐ.",
            "booking_id": booking.id,
            "qr_code": qr_base64,
            "new_balance": profile.balance # Trả về số dư mới để Frontend cập nhật
        }, status=201)

    except Showtime.DoesNotExist:
        return Response({"error": "Suất chiếu không tồn tại"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_money(request):
    amount = request.data.get('amount', 0)
    if amount <= 0:
        return Response({"error": "Số tiền nạp phải lớn hơn 0"}, status=400)
    
    profile, created = Profile.objects.get_or_create(user=request.user)
    profile.balance += int(amount)
    profile.save()
    
    return Response({
        "message": f"Nạp thành công {amount:,.0f} VNĐ!",
        "new_balance": profile.balance
    })

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
        response = f"Hiện rạp đang chiếu các phim: {titles_str}. Bạn muốn đặt vé phim nào?"
    
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_booking_detail(request, booking_id):
    try:
        # Chỉ cho phép người dùng xem vé của chính họ
        booking = Booking.objects.get(id=booking_id, user=request.user)
        serializer = BookingSerializer(booking)
        return Response(serializer.data)
    except Booking.DoesNotExist:
        return Response({"error": "Không tìm thấy vé hoặc bạn không có quyền xem"}, status=404)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    try:
        # 1. Tìm vé của đúng user đang đăng nhập
        booking = Booking.objects.get(id=booking_id, user=request.user)
        
        # 2. Kiểm tra thời gian chiếu
        if booking.showtime.start_time < timezone.now():
            return Response({"error": "Không thể hủy vé cho suất chiếu đã diễn ra"}, status=400)

        # 3. HOÀN TIỀN: Cộng tiền vào ví (Profile)
        # Sử dụng get_or_create để tránh lỗi nếu user chưa có Profile
        profile, created = Profile.objects.get_or_create(user=request.user)
        profile.balance += booking.total_price
        profile.save()

        # 4. Giải phóng ghế và xóa vé
        booking.seats.clear() 
        booking.delete()
        
        return Response({
            "message": "Hủy vé thành công, tiền đã được hoàn vào ví!",
            "new_balance": profile.balance
        }, status=200)

    except Booking.DoesNotExist:
        return Response({"error": "Không tìm thấy vé này"}, status=404)
    
   
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    # Lấy hoặc tạo mới Profile nếu User chưa có
    profile, created = Profile.objects.get_or_create(user=request.user)
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    user = request.user

    # Kiểm tra mật khẩu cũ có đúng không
    if not user.check_password(old_password):
        return Response({"error": "Mật khẩu cũ không chính xác!"}, status=400)

    # Đặt mật khẩu mới
    user.set_password(new_password)
    user.save()
    
    # Giữ cho user không bị logout sau khi đổi pass
    update_session_auth_hash(request, user)
    
    return Response({"message": "Chúc mừng! Bạn đã đổi mật khẩu thành công."})