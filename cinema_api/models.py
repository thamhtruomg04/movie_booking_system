from django.db import models
from django.contrib.auth.models import User

class Movie(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='posters/')
    description = models.TextField()
    duration = models.IntegerField(help_text="Thời lượng phim tính bằng phút")
    trailer_url = models.URLField(blank=True)

    def __str__(self):
        return self.title

class CinemaRoom(models.Model):
    name = models.CharField(max_length=50) # Ví dụ: Phòng chiếu 01
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
    row_label = models.CharField(max_length=1) # A, B, C...
    number = models.IntegerField() # 1, 2, 3...
    
    class Meta:
        unique_together = ('room', 'row_label', 'number')

    def __str__(self):
        return f"{self.room.name} - {self.row_label}{self.number}"

class Booking(models.Model):
    # Nếu chưa làm chức năng Login, có thể để null=True hoặc dùng tạm User mặc định
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    showtime = models.ForeignKey(Showtime, on_delete=models.CASCADE)
    seats = models.ManyToManyField(Seat) # Một đơn hàng có thể đặt nhiều ghế
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    qr_code = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Booking {self.id} - {self.showtime.movie.title}"