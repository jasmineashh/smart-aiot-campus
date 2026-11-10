using Campus.Api.Models;

namespace Campus.Api.Dtos;

public class AlertDto
{
    public int Id { get; set; }
    public AlertType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsResolved { get; set; }
    public int AttendanceLogId { get; set; }
    public string CameraName { get; set; } = string.Empty;
    public string? PersonName { get; set; }
}