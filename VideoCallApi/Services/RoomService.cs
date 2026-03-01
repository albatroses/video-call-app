using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using VideoCallApi.Models;

namespace VideoCallApi.Services;

/// <summary>
/// Manages in-memory video call rooms with auto-expiry cleanup.
/// Uses primary constructor (C# 12+), RandomNumberGenerator.GetInt32 (.NET 8+),
/// and implements IHostedService for lifecycle-managed cleanup.
/// </summary>
public sealed class RoomService(AuditService auditService, TimeProvider timeProvider, ILogger<RoomService> logger)
    : IHostedService, IDisposable
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private Timer? _cleanupTimer;

    // --- IHostedService lifecycle ---

    public Task StartAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("RoomService started — cleanup runs every 5 minutes");
        _cleanupTimer = new Timer(_ => CleanupExpiredRooms(), null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cleanupTimer?.Change(Timeout.Infinite, 0);
        logger.LogInformation("RoomService stopped");
        return Task.CompletedTask;
    }

    public void Dispose() => _cleanupTimer?.Dispose();

    // --- Room operations ---

    public Room CreateRoom()
    {
        var roomId = Guid.NewGuid().ToString("N")[..12];
        var secretCode = GenerateSecretCode();
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var room = new Room
        {
            Id = roomId,
            SecretCodeHash = HashCode(secretCode),
            PlainSecretCode = secretCode,
            CreatedAt = now,
            ExpiresAt = now.AddHours(2)
        };

        _rooms[roomId] = room;
        auditService.Log("ROOM_CREATED", roomId, details: "Room created with 2-hour expiry");

        return room;
    }

    public bool VerifyCode(string roomId, string secretCode) =>
        _rooms.TryGetValue(roomId, out var room) && room.IsActive && room.SecretCodeHash == HashCode(secretCode);

    public Room? GetRoom(string roomId) =>
        _rooms.GetValueOrDefault(roomId);

    public bool RoomExists(string roomId) =>
        _rooms.TryGetValue(roomId, out var room) && room.IsActive;

    public void AddUserToRoom(string roomId, string connectionId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
            room.ConnectedUsers.Add(connectionId);
    }

    public void RemoveUserFromRoom(string roomId, string connectionId)
    {
        if (_rooms.TryGetValue(roomId, out var room))
            room.ConnectedUsers.Remove(connectionId);
    }

    public string? FindRoomByConnection(string connectionId) =>
        _rooms.FirstOrDefault(kvp => kvp.Value.ConnectedUsers.Contains(connectionId)).Key;

    // --- Private helpers ---

    private void CleanupExpiredRooms()
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var roomId in _rooms.Keys)
        {
            if (_rooms.TryGetValue(roomId, out var room) && now > room.ExpiresAt)
            {
                if (_rooms.TryRemove(roomId, out _))
                    auditService.Log("ROOM_EXPIRED", roomId, details: "Room auto-expired after 2 hours");
            }
        }
    }

    /// <summary>
    /// Generates a cryptographically secure 6-digit code using RandomNumberGenerator.GetInt32 (.NET 8+).
    /// </summary>
    private static string GenerateSecretCode() =>
        RandomNumberGenerator.GetInt32(100_000, 1_000_000).ToString();

    private static string HashCode(string code) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
}
