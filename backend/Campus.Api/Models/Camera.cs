namespace Campus.Api.Models;

public class Camera
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;      // e.g. "Main Gate Cam"
    public string Location { get; set; } = string.Empty;  // e.g. "Gate 1", "Lab 204"
    public bool IsActive { get; set; } = true;
}