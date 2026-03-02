using Microsoft.AspNetCore.SignalR;
using VideoCallApi.Models;
using VideoCallApi.Data;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace VideoCallApi.Hubs;

public class ChatHub : Hub
{
    private readonly VideoCallApiDbContext _db;
    public ChatHub(VideoCallApiDbContext db) => _db = db;

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        // Optionally: Load last 50 messages from DB and send to the caller
        var log = _db.ChatMessages
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.Timestamp)
            .Take(50)
            .OrderBy(m => m.Timestamp)
            .ToList();

        await Clients.Caller.SendAsync("ReceiveHistory", log);
    }

    public async Task SendMessage(string roomId, string content)
    {
        var msg = new ChatMessage
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            SenderConnectionId = Context.ConnectionId,
            Content = content,
            Timestamp = DateTime.UtcNow
        };
        _db.ChatMessages.Add(msg);
        await _db.SaveChangesAsync();
        await Clients.Group(roomId).SendAsync("ReceiveMessage", new {
            msg.Id,
            msg.RoomId,
            msg.SenderConnectionId,
            msg.Content,
            Timestamp = msg.Timestamp.ToString("o")
        });
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }
}
