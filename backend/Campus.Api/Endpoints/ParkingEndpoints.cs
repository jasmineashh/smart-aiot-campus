
using Campus.Api.Data;
using Campus.Api.Models.Parking;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Endpoints;

public static class ParkingEndpoints
{
    public static void MapParkingEndpoints(
        this WebApplication app)
    {
        // Only authenticated university users
        // can access parking information.
        var parking = app.MapGroup("/api/parking")
            .RequireAuthorization();

        // GET ALL PARKING ZONES
        parking.MapGet("/zones", async (
            CampusDbContext db) =>
        {
            var zones = await db.ParkingZones
                .AsNoTracking()
                .OrderBy(z => z.Code)
                .Select(z => new
                {
                    z.Id,
                    z.Code,
                    z.Name,
                    z.Description,
                    z.ZoneType,
                    z.IsActive,
                    z.MapX,
                    z.MapY,

                    TotalSpaces = z.Spaces.Count(),

                    AvailableSpaces = z.Spaces.Count(
                        s => s.Status ==
                            ParkingSpaceStatus.Available),

                    OccupiedSpaces = z.Spaces.Count(
                        s => s.Status ==
                            ParkingSpaceStatus.Occupied),

                    UnknownSpaces = z.Spaces.Count(
                        s => s.Status ==
                            ParkingSpaceStatus.Unknown),

                    OutOfServiceSpaces = z.Spaces.Count(
                        s => s.Status ==
                            ParkingSpaceStatus.OutOfService)
                })
                .ToListAsync();

            return Results.Ok(zones);
        });

        
        // GET VEHICLES OWNED BY THE LOGGED-IN USER
        parking.MapGet("/my-vehicles", async (
            HttpContext http,
            CampusDbContext db) =>
        {
            var ownerId = http.User.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier
            )?.Value;

            if (string.IsNullOrWhiteSpace(ownerId))
            {
                return Results.Unauthorized();
            }

            var vehicles = await db.Vehicles
                .AsNoTracking()
                .Where(v => v.OwnerId == ownerId)
                .OrderByDescending(v => v.RegisteredAt)
                .Select(v => new
                {
                    v.Id,
                    v.PlateNumber,
                    v.Make,
                    v.Model,
                    v.Color,
                    v.IsApproved,
                    v.RegisteredAt
                })
                .ToListAsync();

            return Results.Ok(vehicles);
        });


        // GET ONE PARKING ZONE
        parking.MapGet("/zones/{id:guid}", async (
            Guid id,
            CampusDbContext db) =>
        {
            var zone = await db.ParkingZones
                .AsNoTracking()
                .Where(z => z.Id == id)
                .Select(z => new
                {
                    z.Id,
                    z.Code,
                    z.Name,
                    z.Description,
                    z.ZoneType,
                    z.IsActive,
                    z.MapX,
                    z.MapY,

                    Spaces = z.Spaces
                        .OrderBy(s => s.SpaceNumber)
                        .Select(s => new
                        {
                            s.Id,
                            s.SpaceNumber,
                            s.Status,
                            s.Type,
                            s.LastUpdatedAt
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            return zone == null
                ? Results.NotFound()
                : Results.Ok(zone);
        });

        // ADMIN: GET ALL REGISTERED VEHICLES
        parking.MapGet("/admin/vehicles", async (
            CampusDbContext db) =>
        {
            var vehicles = await db.Vehicles
                .AsNoTracking()
                .OrderByDescending(v => v.RegisteredAt)
                .Select(v => new
                {
                    v.Id,
                    v.PlateNumber,
                    v.Make,
                    v.Model,
                    v.Color,
                    v.IsApproved,
                    v.RegisteredAt,

                    Owner = new
                    {
                        v.Owner.Id,
                        v.Owner.FullName,
                        v.Owner.UniversityId,
                        v.Owner.Email,
                        v.Owner.Department
                    }
                })
                .ToListAsync();

            return Results.Ok(vehicles);
        })
        .RequireAuthorization(policy =>
            policy.RequireRole("Admin"));

    }
    
}
