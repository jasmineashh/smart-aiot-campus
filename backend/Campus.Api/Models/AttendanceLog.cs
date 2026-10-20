namespace Campus.Api.Models;

public enum RecognitionResult { Recognized, Unknown, Spoof, Denied }

public class AttendanceLog
{
    public int Id { get; set; }

    public int? PersonId { get; set; }          // null when the face is unknown
    public Person? Person { get; set; }

    public int CameraId { get; set; }
    public Camera Camera { get; set; } = null!;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public float Confidence { get; set; }       // how sure the AI was (0 to 1)
    public RecognitionResult Result { get; set; }
}