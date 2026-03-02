using VideoCallApi.Hubs;
using VideoCallApi.Services;
using VideoCallApi.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseWebRoot("wwwroot");

// Register EF Core DbContext (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<VideoCallApiDbContext>(options =>
    options.UseNpgsql(connectionString));

// --- Service registration (modern .NET 9 style) ---
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<AuditService>();
builder.Services.AddSingleton<RoomService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<RoomService>());
builder.Services.AddControllers();
builder.Services.AddSignalR();

// CORS — allow Angular dev server and Firebase hosting
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200", "https://video-call-app-gkv00.web.app")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
    )
);

var app = builder.Build();

// --- Middleware pipeline ---
app.UseCors();
app.UseStaticFiles(); // Serve uploaded files from wwwroot/uploads
app.UseRouting();
app.MapControllers();
app.MapHub<CallHub>("/callhub");
app.MapHub<ChatHub>("/ChatHub");

app.Logger.LogInformation("""
    ===========================================
      HIPAA-Compliant Video Call Server
      SignalR Hub: /callhub
      API: /api/room/create, /api/room/verify
    ===========================================
    """);

// Ensure database is created on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<VideoCallApiDbContext>();
        Console.WriteLine("Applying database migrations...");
        db.Database.Migrate();
        Console.WriteLine("Database initialization successful!");
    }
    catch (Exception ex)
    {
        Console.WriteLine("DB Initialization Error: " + ex.Message);
        if (ex.InnerException != null) Console.WriteLine("Inner Error: " + ex.InnerException.Message);
        Console.WriteLine(ex.StackTrace);
    }
}

app.Run();
