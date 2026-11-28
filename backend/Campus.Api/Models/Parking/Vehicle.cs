using Campus.Api.Models.Identity;

namespace Campus.Api.Models.Parking;

public class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string PlateNumber { get; set; } = string.Empty;

    public string? NormalizedPlateNumber { get; set; }

    public string? Make { get; set; }

    public string? Model { get; set; }

    public string? Color { get; set; }

    public string OwnerId { get; set; } = string.Empty;

    public ApplicationUser Owner { get; set; } = null!;

    // Retained for existing integration compatibility
    public bool IsApproved { get; set; } = false;

    public string ApprovalStatus { get; set; } = "Pending";

    public DateTime RegisteredAt { get; set; }
        = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewedById { get; set; }

    public ApplicationUser? ReviewedBy { get; set; }

    public string? RejectionReason { get; set; }
}
