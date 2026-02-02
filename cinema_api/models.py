from django.db import models
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=12, decimal_places=0, default=0) # Ví dụ: 500.000 VNĐ

    def __str__(self):
        return f"Ví của {self.user.username}"

class Movie(models.Model):
    GENRE_CHOICES = [
        ('Hành động', 'Hành động'),
        ('Kinh dị', 'Kinh dị'),
        ('Tình cảm', 'Tình cảm'),
        ('Hoạt hình', 'Hoạt hình'),
        ('Viễn tưởng', 'Viễn tưởng'),
    ]
    MOVIE_TYPES = (
        ('movie', 'Phim Lẻ'),
        ('series', 'Phim Bộ'),
    )
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='posters/')
    category = models.CharField(max_length=10, choices=MOVIE_TYPES, default='movie') 
    description = models.TextField()
    genre = models.CharField(
        max_length=100, 
        choices=GENRE_CHOICES, 
        default='Hành động'
    )
    duration = models.IntegerField(help_text="Thời lượng phim tính bằng phút")
    trailer_url = models.URLField(blank=True)

    def __str__(self):
        return self.title

class CinemaRoom(models.Model):
    name = models.CharField(max_length=50) 
    rows = models.IntegerField(default=10)
    cols = models.IntegerField(default=10)

    def __str__(self):
        return self.name

class Showtime(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    room = models.ForeignKey(CinemaRoom, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.movie.title} - {self.start_time}"

class Seat(models.Model):
    room = models.ForeignKey(CinemaRoom, on_delete=models.CASCADE)
    row_label = models.CharField(max_length=1) 
    number = models.IntegerField() 
    
    class Meta:
        unique_together = ('room', 'row_label', 'number')

    def __str__(self):
        return f"{self.room.name} - {self.row_label}{self.number}"

class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    showtime = models.ForeignKey(Showtime, on_delete=models.CASCADE)
    seats = models.ManyToManyField(Seat) 
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Booking {self.id} - {self.showtime.movie.title}"
class DepositHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} nạp {self.amount} VNĐ"

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True) # Mã không được trùng
    discount_percent = models.IntegerField(default=10) # Phần trăm giảm
    expiry_date = models.DateField() # Ngày hết hạn
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.discount_percent}%"