using System.ComponentModel.DataAnnotations;

namespace Campus.Api.Dtos;

public class CreateCameraDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;
}

public class UpdateCameraDto : CreateCameraDto
{
    public bool IsActive { get; set; } = true;
}

public class CameraDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}