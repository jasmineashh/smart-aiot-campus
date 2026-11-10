namespace Campus.Api.Models;

public class AccessRule
{
    public int Id { get; set; }

    public int CameraId { get; set; }
    public Camera Camera { get; set; } = null!;

    public PersonType AllowedType { get; set; }
    public TimeOnly StartTime { get; set; }     // e.g. 08:00
    public TimeOnly EndTime { get; set; }       // e.g. 18:00
}