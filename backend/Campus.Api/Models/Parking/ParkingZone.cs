
namespace Campus.Api.Models.Parking;

public class ParkingZone
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string ZoneType { get; set; } = "Public";

    public bool IsActive { get; set; } = true;

    // Normalized positions on the campus map:
    // values between 0 and 1
    public double? MapX { get; set; }
    public double? MapY { get; set; }

    public ICollection<ParkingSpace> Spaces { get; set; }
        = new List<ParkingSpace>();
}
