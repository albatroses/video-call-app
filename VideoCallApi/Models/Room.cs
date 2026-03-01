namespace VideoCallApi.Models;

/// <summary>
/// Represents a video call room with expiration and connection tracking.
/// </summary>
public sealed class Room
{
    public required string Id { get; init; }
    public required string SecretCodeHash { get; init; }
    public required string PlainSecretCode { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public required DateTime ExpiresAt { get; init; }
    public HashSet<string> ConnectedUsers { get; } = [];
    public bool IsActive => DateTime.UtcNow < ExpiresAt && ConnectedUsers.Count <= 10;
}

// --- API contracts using records ---

public sealed record CreateRoomResponse(string RoomId, string SecretCode, string JoinUrl);

public sealed record VerifyCodeRequest(string RoomId, string SecretCode);

public sealed record VerifyCodeResponse(bool Success, string Message);

public sealed record RoomStatusResponse(string Message);
