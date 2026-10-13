
using Campus.Api.Models.Identity;

namespace Campus.Api.Models.Parking;

public class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string PlateNumber { get; set; } = string.Empty;

    public string? Make { get; set; }

    public string? Model { get; set; }

    public string? Color { get; set; }

    public string OwnerId { get; set; } = string.Empty;

    public ApplicationUser Owner { get; set; } = null!;

    public bool IsApproved { get; set; } = false;

    public DateTime RegisteredAt { get; set; }
        = DateTime.UtcNow;
}
