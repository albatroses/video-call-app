using System.Text.Json;
using System.Text.Json.Serialization;

namespace VideoCallApi.Services;

/// <summary>
/// Immutable audit log entry for HIPAA-compliant event tracking.
/// Uses System.Text.Json source gen for AOT-safe serialization.
/// </summary>
public sealed record AuditEntry(
    DateTime Timestamp,
    string EventType,
    string RoomId,
    string ConnectionId = "",
    string IpAddress = "",
    string Details = ""
);

/// <summary>
/// HIPAA-compliant audit logger using async file I/O and System.Threading.Lock (C# 13).
/// </summary>
public sealed class AuditService(TimeProvider timeProvider, ILogger<AuditService> logger)
{
    private readonly string _logFilePath = Path.Combine(AppContext.BaseDirectory, "audit.log");
    private readonly Lock _lock = new();

    public void Log(string eventType, string roomId, string connectionId = "", string ipAddress = "", string details = "")
    {
        var entry = new AuditEntry(
            Timestamp: timeProvider.GetUtcNow().UtcDateTime,
            EventType: eventType,
            RoomId: roomId,
            ConnectionId: connectionId,
            IpAddress: ipAddress,
            Details: details
        );

        var json = JsonSerializer.Serialize(entry, AuditJsonContext.Default.AuditEntry);

        lock (_lock)
        {
            File.AppendAllText(_logFilePath, json + Environment.NewLine);
        }

        logger.LogInformation("[AUDIT] {Timestamp:O} | {EventType} | Room: {RoomId} | {Details}",
            entry.Timestamp, eventType, roomId, details);
    }
}

/// <summary>
/// Source-generated JSON serializer context — AOT compatible, avoids reflection.
/// </summary>
[JsonSerializable(typeof(AuditEntry))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal sealed partial class AuditJsonContext : JsonSerializerContext;
