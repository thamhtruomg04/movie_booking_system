from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from .models import Movie, Showtime, Seat, Booking, Profile, DepositHistory, Coupon
from .serializers import MovieSerializer, ShowtimeSerializer, ProfileSerializer, BookingSerializer, CouponSerializer
from rest_framework.response import Response
from django.db import transaction
from django.http import JsonResponse
import qrcode
import base64
from io import BytesIO
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import update_session_auth_hash
from django.db.models import Sum, Count
from rest_framework import status
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt



class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.create_user(username=username, password=password)
        return Response({"message": "Đăng ký thành công!"})


class ShowtimeList(generics.ListAPIView):
    serializer_class = ShowtimeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Lấy tham số movie_id từ URL ví dụ: /api/showtimes/?movie_id=1
        movie_id = self.request.query_params.get('movie_id')
        if movie_id:
            return Showtime.objects.filter(movie_id=movie_id)
        return Showtime.objects.all()
    


from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes # Thêm permission_classes vào đây

@api_view(['GET'])
@permission_classes([AllowAny]) # THÊM DÒNG NÀY ĐỂ MỞ KHÓA API
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
    


def send_booking_email(booking):
    user = booking.user
    showtime = booking.showtime
    movie = showtime.movie
    # Lấy danh sách nhãn ghế (ví dụ: A1, A2)
    seats_label = ", ".join([f"{s.row_label}{s.number}" for s in booking.seats.all()])

    subject = f'[VÉ XEM PHIM] - {movie.title}'
    
    # Nội dung email (có thể dùng HTML để làm đẹp hơn)
    message = f"""
    Chào {user.username},
    
    Chúc mừng bạn đã đặt vé thành công!
    Thông tin chi tiết:
    - Phim: {movie.title}
    - Suất chiếu: {showtime.start_time.strftime('%H:%M - %d/%m/%Y')}
    - Phòng: {showtime.room.name}
    - Ghế: {seats_label}
    - Tổng tiền: {booking.total_price:,} VNĐ
    
    Vui lòng đưa mã QR trong ứng dụng hoặc email này cho nhân viên để nhận vé.
    Chúc bạn xem phim vui vẻ!
    """

    email = EmailMessage(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )
    
    # Nếu bạn muốn đính kèm ảnh QR Code gửi từ Backend
    if booking.qr_code_image:
        email.attach('ticket_qr.png', booking.qr_code_image.read(), 'image/png')
        
    email.send(fail_silently=False)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request):
    data = request.data
    try:
        # 1. Lấy thông tin suất chiếu và ghế
        showtime = Showtime.objects.get(id=data['showtime_id'])
        seat_ids = data['seat_ids']
        base_price = showtime.price * len(seat_ids)
        total_price = base_price
        
        # 2. XỬ LÝ MÃ GIẢM GIÁ
        coupon_code = data.get('coupon_code')
        discount_amount = 0
        if coupon_code:
            try:
                coupon = Coupon.objects.get(
                    code__iexact=coupon_code, 
                    is_active=True, 
                    expiry_date__gte=timezone.now().date()
                )
                discount_amount = (base_price * coupon.discount_percent) / 100
                total_price = base_price - discount_amount
            except Coupon.DoesNotExist:
                return Response({"error": "Mã giảm giá không hợp lệ!"}, status=400)

        # 3. Lấy ví (Profile)
        profile, created = Profile.objects.get_or_create(user=request.user)

        # 4. KIỂM TRA SỐ DƯ
        if profile.balance < total_price:
            return Response({"error": "Số dư không đủ!"}, status=400)

        # 5. TRANSACTION ATOMIC
        with transaction.atomic():
            profile.balance -= total_price
            profile.save()

            booking = Booking.objects.create(
                user=request.user,
                showtime=showtime,
                total_price=total_price,
                payment_status=True
            )
            booking.seats.set(seat_ids)
            
            # Tạo QR code nội bộ (logic cũ của bạn)
            movie_title = showtime.movie.title
            seats_obj = Seat.objects.filter(id__in=seat_ids)
            seat_labels = ", ".join([f"{s.row_label}{s.number}" for s in seats_obj])
            booking_info = f"ID: {booking.id} | User: {request.user.username} | Phim: {movie_title} | Ghế: {seat_labels}"
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(booking_info)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            booking.qr_code = qr_base64
            booking.save()

        try:
            user_email = request.user.email
            show_time_str = showtime.start_time.strftime('%H:%M - %d/%m/%Y')
            
            subject = f"[VÉ XEM PHIM] Xác nhận đặt vé thành công: {movie_title}"
            message = f"""
Chào {request.user.username},

Bạn đã đặt vé thành công! Dưới đây là thông tin vé của bạn:
------------------------------------------
Phim: {movie_title}
Suất chiếu: {show_time_str}
Ghế: {seat_labels}
Phòng chiếu: {showtime.room.name}
Tổng tiền: {total_price:,.0f} VNĐ
(Đã giảm: {discount_amount:,.0f} VNĐ)
------------------------------------------
Vui lòng sử dụng mã QR kèm theo trong ứng dụng để vào phòng chiếu.

Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!
            """
            
            email = EmailMessage(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user_email]
            )
            # Nếu bạn muốn đính kèm trực tiếp file ảnh QR vào email:
            email.attach('ticket_qr.png', buffer.getvalue(), 'image/png')
            
            email.send(fail_silently=False)
        except Exception as e:
            print(f"Lỗi gửi email: {str(e)}")
        # ============================================================

        return Response({
            "status": "success",
            "message": "Thanh toán thành công và vé đã được gửi qua email!",
            "booking_id": booking.id,
            "qr_code": qr_base64,
            "new_balance": profile.balance,
            "discount_applied": discount_amount
        }, status=201)

    except Showtime.DoesNotExist:
        return Response({"error": "Suất chiếu không tồn tại"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    

class MovieList(generics.RetrieveAPIView, generics.ListAPIView): # Thêm RetrieveAPIView
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        category = self.request.query_params.get('category')
        if category and category != 'all':
            return Movie.objects.filter(category=category)
        return Movie.objects.all()

    # Thêm hàm này để xử lý khi lấy chi tiết phim theo ID
    def get(self, request, *args, **kwargs):
        if 'pk' in kwargs:
            return self.retrieve(request, *args, **kwargs)
        return self.list(request, *args, **kwargs)
    

# views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_money(request):
    amount = request.data.get('amount', 0)
    if not amount or int(amount) <= 0:
        return Response({"error": "Số tiền nạp phải lớn hơn 0"}, status=400)
    
    amount = int(amount)
    profile, created = Profile.objects.get_or_create(user=request.user)
    
    with transaction.atomic():
        # 1. Cộng tiền vào ví
        profile.balance += amount
        profile.save()
        
        # 2. Lưu vào lịch sử nạp (Giả sử bạn đã có model DepositHistory)
        DepositHistory.objects.create(
            user=request.user,
            amount=amount
        )
    
    return Response({
        "message": f"Nạp thành công {amount:,.0f} VNĐ!",
        "new_balance": profile.balance
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_deposit_history(request):
    # Lấy danh sách nạp tiền của user
    history = DepositHistory.objects.filter(user=request.user).order_by('-created_at')
    # Bạn có thể tạo Serializer riêng hoặc trả về list dict đơn giản
    data = [{
        "id": h.id,
        "amount": h.amount,
        "date": h.created_at.strftime("%d/%m/%Y %H:%M")
    } for h in history]
    return Response(data)

@api_view(['POST'])
@permission_classes([AllowAny])
def cinema_chatbot(request):
    # Lấy tin nhắn từ React gửi lên
    user_message = request.data.get('message', '').lower()
    
    # Lấy danh sách phim đang có trong hệ thống
    movies = Movie.objects.all()
    movie_titles = [m.title for m in movies]
    
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
    profile, created = Profile.objects.get_or_create(user=request.user)
    
    serializer = ProfileSerializer(profile)
    data = serializer.data
    
    data['is_staff'] = request.user.is_staff
    data['is_admin'] = request.user.is_superuser
    data['username'] = request.user.username
    data['email'] = request.user.email
    
    return Response(data)
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

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_statistics(request):
    total_revenue = Booking.objects.aggregate(Sum('total_price'))['total_price__sum'] or 0
    total_tickets = Booking.objects.count()
    total_users = User.objects.count()
    total_movies = Movie.objects.count()
    
    total_deposited = DepositHistory.objects.aggregate(Sum('amount'))['amount__sum'] or 0

    movie_stats = Booking.objects.values('showtime__movie__title').annotate(
        total_earned=Sum('total_price'),
        tickets_sold=Count('id')
    ).order_by('-total_earned')

    return Response({
        "total_revenue": total_revenue,
        "total_tickets": total_tickets,
        "total_users": total_users,
        "total_movies": total_movies,
        "total_deposited": total_deposited,
        "movie_stats": list(movie_stats)
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_all_users(request):
    # Lấy tất cả user kèm thông tin profile (số dư)
    profiles = Profile.objects.all().select_related('user').order_by('-balance')
    data = []
    for p in profiles:
        data.append({
            "id": p.user.id,
            "username": p.user.username,
            "email": p.user.email,
            "balance": p.balance,
            "is_staff": p.user.is_staff,
            "date_joined": p.user.date_joined.strftime("%d/%m/%Y")
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_showtime(request):
    try:
        movie_id = request.data.get('movie_id')
        room_id = request.data.get('room_id')
        start_time = request.data.get('start_time')
        price = request.data.get('price')

        # Tạo suất chiếu mới
        showtime = Showtime.objects.create(
            movie_id=movie_id,
            room_id=room_id,
            start_time=start_time,
            price=price
        )
        return Response({"message": "Tạo suất chiếu thành công!", "id": showtime.id}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_resources(request):
    # Lấy danh sách phim và phòng để Admin chọn trong Form
    from .models import Movie, CinemaRoom # Đảm bảo đã import Room
    movies = Movie.objects.values('id', 'title')
    rooms = CinemaRoom.objects.values('id', 'name')
    return Response({"movies": list(movies), "rooms": list(rooms)})

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_add_movie(request):
    # Sử dụng Serializer để lưu dữ liệu kèm file ảnh (poster)
    serializer = MovieSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_movie(request, pk):
    try:
        movie = Movie.objects.get(pk=pk)
        movie.delete()
        return Response({"message": "Xóa phim thành công!"})
    except Movie.DoesNotExist:
        return Response({"error": "Không tìm thấy phim"}, status=404)
    

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_bookings(request):
    from .models import Booking
    # Lấy 50 giao dịch mới nhất
    bookings = Booking.objects.select_related('user', 'showtime__movie').order_by('-created_at')[:50]
    data = []
    for b in bookings:
        data.append({
            "id": b.id,
            "user": b.user.username if b.user else "Khách vãng lai",
            "movie": b.showtime.movie.title,
            "total_price": b.total_price,
            "payment_status": b.payment_status,
            "created_at": b.created_at.strftime("%d/%m/%Y %H:%M")
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_cancel_booking(request, booking_id):
    from .models import Booking, Profile
    try:
        booking = Booking.objects.get(id=booking_id)
        # Nếu đã thanh toán bằng ví thì hoàn tiền
        if booking.payment_status and booking.user:
            profile = Profile.objects.get(user=booking.user)
            profile.balance += booking.total_price
            profile.save()
        
        booking.delete()
        return Response({"message": "Đã hủy vé và hoàn tiền thành công!"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_coupons(request):
    coupons = Coupon.objects.all().order_by('-created_at')
    serializer = CouponSerializer(coupons, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def add_coupon(request):
    serializer = CouponSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_coupon(request, pk):
    try:
        coupon = Coupon.objects.get(pk=pk)
        coupon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Coupon.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hold_seats(request):
    seat_ids = request.data.get('seat_ids', [])
    # Thiết lập thời gian hết hạn là 2 phút tính từ bây giờ
    expiry = timezone.now() + timezone.timedelta(minutes=2)
    
    now = timezone.now()
    
    # Kiểm tra xem có ghế nào đang bị người khác giữ không
    already_held = Seat.objects.filter(
        id__in=seat_ids, 
        held_until__gt=now
    ).exclude(held_by=request.user)

    if already_held.exists():
        return Response({"error": "Một số ghế vừa bị người khác chọn!"}, status=400)

    # Nếu ổn thì tiến hành giữ ghế
    Seat.objects.filter(id__in=seat_ids).update(
        held_by=request.user, 
        held_until=expiry
    )
    
    return Response({
        "status": "success", 
        "held_until": expiry.strftime("%H:%M:%S")
    })
