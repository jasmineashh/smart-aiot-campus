namespace Campus.Api.Models;

public enum PersonType { Student, Staff, Visitor }

public class Person
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public PersonType Type { get; set; }
    public string? UniversityId { get; set; }   // student/staff ID, empty for visitors
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;

    // Visitors only: the time window they are allowed on campus
    public DateTime? VisitStart { get; set; }
    public DateTime? VisitEnd { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<FaceEmbedding> FaceEmbeddings { get; set; } = new();
    public List<AttendanceLog> AttendanceLogs { get; set; } = new();
}