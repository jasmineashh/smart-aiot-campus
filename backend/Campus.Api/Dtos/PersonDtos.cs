using System.ComponentModel.DataAnnotations;
using Campus.Api.Models;

namespace Campus.Api.Dtos;

// What the client sends to CREATE a person
public class CreatePersonDto
{
    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public PersonType Type { get; set; }

    [MaxLength(30)]
    public string? UniversityId { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    [Phone]
    public string? Phone { get; set; }

    // Visitors only
    public DateTime? VisitStart { get; set; }
    public DateTime? VisitEnd { get; set; }
}

// What the client sends to UPDATE a person (same + active flag)
public class UpdatePersonDto : CreatePersonDto
{
    public bool IsActive { get; set; } = true;
}

// What the API sends back
public class PersonDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public PersonType Type { get; set; }
    public string? UniversityId { get; set; }
    public string? Department { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public DateTime? VisitStart { get; set; }
    public DateTime? VisitEnd { get; set; }
    public int FaceCount { get; set; }   // how many face embeddings are enrolled
}