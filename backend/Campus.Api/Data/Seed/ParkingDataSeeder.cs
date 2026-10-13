
using Campus.Api.Models.Parking;
using Microsoft.EntityFrameworkCore;
using Campus.Api.Data;

namespace Campus.Api.Data.Seed;

public static class ParkingDataSeeder
{
    public static async Task SeedAsync(
        CampusDbContext db)
    {
        // Never add demo data if zones already exist.
        if (await db.ParkingZones.AnyAsync())
        {
            return;
        }

        var zones = new[]
        {
            new ParkingZone
            {
                Code = "DEMO-A",
                Name = "Demo Parking Area A",
                Description = "Synthetic public parking area",
                ZoneType = "Public",
                IsActive = true
            },
            new ParkingZone
            {
                Code = "DEMO-B",
                Name = "Demo Parking Area B",
                Description = "Synthetic public parking area",
                ZoneType = "Public",
                IsActive = true
            },
            new ParkingZone
            {
                Code = "DEMO-R",
                Name = "Demo Residential Parking",
                Description = "Synthetic residential parking area",
                ZoneType = "Residential",
                IsActive = true
            }
        };

        db.ParkingZones.AddRange(zones);

        var capacities = new[] { 20, 15, 10 };

        for (int zoneIndex = 0;
             zoneIndex < zones.Length;
             zoneIndex++)
        {
            var zone = zones[zoneIndex];

            for (int number = 1;
                 number <= capacities[zoneIndex];
                 number++)
            {
                // Predictable synthetic occupancy pattern.
                ParkingSpaceStatus status;

                if (number % 10 == 0)
                {
                    status = ParkingSpaceStatus.Unknown;
                }
                else if (number % 3 == 0)
                {
                    status = ParkingSpaceStatus.Occupied;
                }
                else
                {
                    status = ParkingSpaceStatus.Available;
                }

                var space = new ParkingSpace
                {
                    ParkingZoneId = zone.Id,
                    SpaceNumber = $"{zone.Code}-{number:D2}",
                    Status = status,
                    Type = ParkingSpaceType.Standard,
                    LastUpdatedAt = DateTime.UtcNow
                };

                db.ParkingSpaces.Add(space);
            }
        }

        await db.SaveChangesAsync();
    }
}
