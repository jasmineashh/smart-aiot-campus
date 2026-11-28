using System.Security.Claims;
using Campus.Api.Data;
using Campus.Api.Models.Parking;
using Campus.Api.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Campus.Api.Endpoints;

public static class ParkingEndpoints
{
    public record RegisterVehicleRequest(
        string? PlateNumber,
        string? Make,
        string? Model,
        string? Color
    );

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
                ClaimTypes.NameIdentifier
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
                    v.ApprovalStatus,
                    v.RegisteredAt,
                    v.ReviewedAt,
                    v.RejectionReason
                })
                .ToListAsync();

            return Results.Ok(vehicles);
        });

        // REGISTER A NEW VEHICLE
        parking.MapPost("/my-vehicles", async (
            RegisterVehicleRequest request,
            HttpContext http,
            IAntiforgery antiforgery,
            CampusDbContext db) =>
        {
            // 1. Validate CSRF token.
            if (!await HasValidCsrfToken(
                http, antiforgery))
            {
                return Results.BadRequest(new
                {
                    message = "Invalid request token."
                });
            }

            // 2. Identify the authenticated owner.
            var ownerId = http.User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

            if (string.IsNullOrWhiteSpace(ownerId))
            {
                return Results.Unauthorized();
            }

            // 3. Verify that the account remains active.
            bool activeAccount = await db.Users
                .AsNoTracking()
                .AnyAsync(u =>
                    u.Id == ownerId &&
                    u.IsActive);

            if (!activeAccount)
            {
                return Results.Unauthorized();
            }

            // 4. Normalize and validate the plate.
            string normalizedPlate =
                LicensePlateService.NormalizePlate(
                    request.PlateNumber);

            if (string.IsNullOrEmpty(normalizedPlate))
            {
                return Results.BadRequest(new
                {
                    message =
                        "Enter a valid Egyptian license plate " +
                        "with 2 or 3 Arabic letters " +
                        "and 3 or 4 digits."
                });
            }

            // 5. Validate vehicle information.
            string make =
                request.Make?.Trim() ?? string.Empty;

            string model =
                request.Model?.Trim() ?? string.Empty;

            string color =
                request.Color?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(make) ||
                string.IsNullOrWhiteSpace(model) ||
                string.IsNullOrWhiteSpace(color))
            {
                return Results.BadRequest(new
                {
                    message =
                        "Car brand, model and color are required."
                });
            }

            if (make.Length > 80 ||
                model.Length > 80 ||
                color.Length > 50)
            {
                return Results.BadRequest(new
                {
                    message =
                        "One or more vehicle details exceed " +
                        "the maximum allowed length."
                });
            }

            // 6. Check whether the plate already exists.
            bool duplicate = await db.Vehicles
                .AsNoTracking()
                .AnyAsync(v =>
                    v.NormalizedPlateNumber ==
                    normalizedPlate);

            if (duplicate)
            {
                return Results.Conflict(new
                {
                    message =
                        "This license plate is already registered."
                });
            }

            // 7. Create the vehicle registration.
            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),

                PlateNumber =
                    LicensePlateService.FormatDisplayPlate(
                        normalizedPlate),

                NormalizedPlateNumber = normalizedPlate,

                Make = make,
                Model = model,
                Color = color,

                OwnerId = ownerId,

                IsApproved = false,
                ApprovalStatus = "Pending",

                RegisteredAt = DateTime.UtcNow,

                ReviewedAt = null,
                ReviewedById = null,
                RejectionReason = null
            };

            db.Vehicles.Add(vehicle);

            // 8. Persist the registration.
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
                when (
                    ex.InnerException is PostgresException pg &&
                    pg.SqlState ==
                        PostgresErrorCodes.UniqueViolation &&
                    pg.ConstraintName ==
                        "IX_Vehicles_NormalizedPlateNumber")
            {
                // Protect against concurrent duplicate requests.
                return Results.Conflict(new
                {
                    message =
                        "This license plate is already registered."
                });
            }

            // 9. Return the newly created registration.
            return Results.Json(new
            {
                message =
                    "Vehicle registered successfully. " +
                    "Awaiting administrator approval.",

                vehicle = new
                {
                    vehicle.Id,
                    vehicle.PlateNumber,
                    vehicle.Make,
                    vehicle.Model,
                    vehicle.Color,
                    vehicle.IsApproved,
                    vehicle.ApprovalStatus,
                    vehicle.RegisteredAt,
                    vehicle.ReviewedAt,
                    vehicle.RejectionReason
                }
            },
            statusCode: StatusCodes.Status201Created);
        })
        .RequireAuthorization(policy =>
            policy.RequireRole(
                "Student",
                "Professor",
                "Staff"));

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
                    v.ApprovalStatus,
                    v.RegisteredAt,
                    v.ReviewedAt,
                    v.ReviewedById,
                    v.RejectionReason,

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

    // CSRF validation helper
    private static async Task<bool> HasValidCsrfToken(
        HttpContext context,
        IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }
}
