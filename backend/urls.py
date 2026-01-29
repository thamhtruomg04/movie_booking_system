"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from cinema_api.views import MovieList, ShowtimeList, get_seat_layout, create_booking, cinema_chatbot, get_user_bookings, get_booking_detail, cancel_booking, get_profile, deposit_money, change_password, get_deposit_history, admin_statistics
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView
from cinema_api.views import RegisterView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/movies/', MovieList.as_view()),
    path('api/showtimes/', ShowtimeList.as_view()),
    path('api/seats/<int:showtime_id>/', get_seat_layout),
    path('api/booking/create/', create_booking),
    path('api/chatbot/', cinema_chatbot),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/bookings/my-history/', get_user_bookings, name='user-history'),
    path('api/booking-detail/<int:booking_id>/', get_booking_detail),
    path('api/bookings/cancel/<int:booking_id>/', cancel_booking),
    path('api/profile/', get_profile, name='get_profile'),
    path('api/deposit/', deposit_money, name='deposit_money'),
    path('api/change-password/', change_password, name='change_password'),
    path('api/deposit-history/', get_deposit_history, name='deposit-history'),
    path('api/admin/stats/', admin_statistics),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)