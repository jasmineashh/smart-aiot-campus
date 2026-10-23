
using Campus.Api.Models.Parking;
using Microsoft.EntityFrameworkCore;
using Campus.Api.Data;

namespace Campus.Api.Data.Seed;

public static class ParkingDataSeeder
{
    public static async Task SeedAsync(CampusDbContext db)
    {
        // Never seed into a database containing parking records.
        if (await db.ParkingZones.AnyAsync() ||
            await db.ParkingSpaces.AnyAsync())
        {
            Console.WriteLine(
                "Parking records already exist. Skipping seeding.");
            return;
        }

        var zoneDefinitions = new[]
        {
            new
            {
                Code = "P1",
                Name = "Main Gate Parking",
                Description = "Parking area near the main campus entrance",
                ZoneType = "Public",
                Capacity = 200
            },
            new
            {
                Code = "P2",
                Name = "Building G Parking",
                Description = "Parking area near Building G",
                ZoneType = "Public",
                Capacity = 150
            },
            new
            {
                Code = "P3",
                Name = "Residential Parking",
                Description = "Parking area serving campus residences",
                ZoneType = "Residential",
                Capacity = 100
            },
            new
            {
                Code = "P4",
                Name = "Administration Parking",
                Description = "Parking area near administration buildings",
                ZoneType = "Staff",
                Capacity = 50
            }
        };

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        foreach (var definition in zoneDefinitions)
        {
            var zone = new ParkingZone
            {
                Code = definition.Code,
                Name = definition.Name,
                Description = definition.Description,
                ZoneType = definition.ZoneType,
                IsActive = true
            };

            db.ParkingZones.Add(zone);

            for (int number = 1;
                 number <= definition.Capacity;
                 number++)
            {
                db.ParkingSpaces.Add(new ParkingSpace
                {
                    ParkingZoneId = zone.Id,
                    SpaceNumber =
                        $"{definition.Code}-{number:D3}",
                    Status = ParkingSpaceStatus.Unknown,
                    Type = ParkingSpaceType.Standard
                });
            }
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine(
            "Four parking zones and 500 spaces seeded successfully.");
    }
}
