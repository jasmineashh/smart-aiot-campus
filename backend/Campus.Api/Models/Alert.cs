namespace Campus.Api.Models;

public enum AlertType { UnknownFace, SpoofAttempt, AccessDenied, ExpiredVisitor }

public class Alert
{
    public int Id { get; set; }
    public AlertType Type { get; set; }
    public string Message { get; set; } = string.Empty;

    public int AttendanceLogId { get; set; }
    public AttendanceLog AttendanceLog { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; } = false;
}