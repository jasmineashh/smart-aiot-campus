using Campus.Api.Models;

namespace Campus.Api.Dtos;

public class CreateAccessRuleDto
{
    public int CameraId { get; set; }
    public PersonType AllowedType { get; set; }
    public TimeOnly StartTime { get; set; }   // e.g. "08:00:00"
    public TimeOnly EndTime { get; set; }     // e.g. "16:00:00"
}

public class AccessRuleDto
{
    public int Id { get; set; }
    public int CameraId { get; set; }
    public string CameraName { get; set; } = string.Empty;
    public PersonType AllowedType { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}