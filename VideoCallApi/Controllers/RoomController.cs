using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using VideoCallApi.Models;
using VideoCallApi.Services;

namespace VideoCallApi.Controllers;

/// <summary>
/// REST API for room lifecycle management.
/// Uses primary constructor, TypedResults for compile-time response validation.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class RoomController(RoomService roomService, AuditService auditService) : ControllerBase
{
    [HttpPost("create")]
    public Ok<CreateRoomResponse> CreateRoom()
    {
        var room = roomService.CreateRoom();

        var origin = Request.Headers.Origin.FirstOrDefault() ?? "http://localhost:4200";
        var response = new CreateRoomResponse(room.Id, room.PlainSecretCode, $"{origin}/join?room={room.Id}");

        return TypedResults.Ok(response);
    }

    [HttpPost("verify")]
    public Results<Ok<VerifyCodeResponse>, BadRequest<VerifyCodeResponse>, UnauthorizedHttpResult> VerifyCode(
        [FromBody] VerifyCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RoomId) || string.IsNullOrWhiteSpace(request.SecretCode))
            return TypedResults.BadRequest(new VerifyCodeResponse(false, "Room ID and secret code are required."));

        var isValid = roomService.VerifyCode(request.RoomId, request.SecretCode);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        auditService.Log(
            isValid ? "CODE_VERIFIED" : "CODE_REJECTED",
            request.RoomId,
            ipAddress: ip,
            details: isValid ? "Secret code verified successfully" : "Invalid secret code attempt"
        );

        if (!isValid)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(new VerifyCodeResponse(true, "Code verified. You may now join the call."));
    }

    [HttpGet("check/{roomId}")]
    public Results<Ok<RoomStatusResponse>, NotFound<RoomStatusResponse>> CheckRoom(string roomId) =>
        roomService.RoomExists(roomId)
            ? TypedResults.Ok(new RoomStatusResponse("Room is active."))
            : TypedResults.NotFound(new RoomStatusResponse("Room not found or has expired."));
}
