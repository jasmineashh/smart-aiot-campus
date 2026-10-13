
namespace Campus.Api.Models.Parking;

public enum ParkingSpaceStatus
{
    Available,
    Occupied,
    OutOfService,
    Unknown
}

public enum ParkingSpaceType
{
    Standard,
    Accessible,
    Staff,
    Residential
}

public class ParkingSpace
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string SpaceNumber { get; set; } = string.Empty;

    public Guid ParkingZoneId { get; set; }

    public ParkingZone Zone { get; set; } = null!;

    public ParkingSpaceStatus Status { get; set; }
        = ParkingSpaceStatus.Unknown;

    public ParkingSpaceType Type { get; set; }
        = ParkingSpaceType.Standard;

    public string? SensorDeviceId { get; set; }

    public DateTime? LastUpdatedAt { get; set; }
}
