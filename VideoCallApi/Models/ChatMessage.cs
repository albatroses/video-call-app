using System;
namespace VideoCallApi.Models
{
    public class ChatMessage
    {
        public Guid Id { get; set; }
        public string RoomId { get; set; } = string.Empty;
        public string SenderConnectionId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
