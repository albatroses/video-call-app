using VideoCallApi.Hubs;
using VideoCallApi.Services;

var builder = WebApplication.CreateBuilder(args);

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
app.UseRouting();
app.MapControllers();
app.MapHub<CallHub>("/callhub");

app.Logger.LogInformation("""
    ===========================================
      HIPAA-Compliant Video Call Server
      SignalR Hub: /callhub
      API: /api/room/create, /api/room/verify
    ===========================================
    """);

app.Run();
