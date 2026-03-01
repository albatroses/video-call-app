using Microsoft.AspNetCore.SignalR;
using VideoCallApi.Services;

namespace VideoCallApi.Hubs;

/// <summary>
/// WebRTC signaling hub for peer-to-peer video call connections.
/// Uses primary constructor (C# 12+) for dependency injection.
/// </summary>
public sealed class CallHub(RoomService roomService, AuditService auditService, ILogger<CallHub> logger) : Hub
{
    public async Task JoinRoom(string roomId)
    {
        if (!roomService.RoomExists(roomId))
        {
            await Clients.Caller.SendAsync("Error", "Room not found or has expired.");
            return;
        }

        roomService.AddUserToRoom(roomId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        var userCount = roomService.GetRoom(roomId)?.ConnectedUsers.Count ?? 0;
        var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        auditService.Log("USER_JOINED", roomId, Context.ConnectionId, ip,
            $"User joined. Total users: {userCount}");
        logger.LogInformation("User {ConnectionId} joined room {RoomId} (total: {Count})",
            Context.ConnectionId, roomId, userCount);

        // Notify others in the room that a new user joined
        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", Context.ConnectionId, userCount);

        // Confirm to the joining user
        await Clients.Caller.SendAsync("RoomJoined", roomId, userCount);
    }

    public Task SendOffer(string roomId, string targetConnectionId, object sdp) =>
        Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, sdp);

    public Task SendAnswer(string roomId, string targetConnectionId, object sdp) =>
        Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, sdp);

    public Task SendIceCandidate(string roomId, string targetConnectionId, object candidate) =>
        Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var roomId = roomService.FindRoomByConnection(Context.ConnectionId);

        if (roomId is not null)
        {
            roomService.RemoveUserFromRoom(roomId, Context.ConnectionId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

            var userCount = roomService.GetRoom(roomId)?.ConnectedUsers.Count ?? 0;
            var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            auditService.Log("USER_LEFT", roomId, Context.ConnectionId, ip,
                $"User disconnected. Remaining users: {userCount}");
            logger.LogInformation("User {ConnectionId} left room {RoomId} (remaining: {Count})",
                Context.ConnectionId, roomId, userCount);

            await Clients.Group(roomId).SendAsync("UserLeft", Context.ConnectionId, userCount);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
