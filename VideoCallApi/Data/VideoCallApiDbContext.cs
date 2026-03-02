using Microsoft.EntityFrameworkCore;
using VideoCallApi.Models;

namespace VideoCallApi.Data;

public class VideoCallApiDbContext : DbContext
{
    public VideoCallApiDbContext(DbContextOptions<VideoCallApiDbContext> options) : base(options) { }

    public DbSet<ChatMessage> ChatMessages { get; set; }
}
