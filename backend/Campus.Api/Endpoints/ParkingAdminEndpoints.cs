using System.Security.Claims;
using Campus.Api.Data;
using Campus.Api.Models.Parking;
using Campus.Api.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Endpoints;

public static class ParkingAdminEndpoints
{
    public sealed record RejectVehicleRequest(
        string? Reason
    );

    public static void MapParkingAdminEndpoints(
        this WebApplication app)
    {
        var admin = app
            .MapGroup("/api/parking/admin")
            .RequireAuthorization(policy =>
                policy.RequireRole("Admin"));

        admin.MapGet("/vehicles", async (HttpContext http, CampusDbContext db) =>
        {
            if (await GetActiveAdministratorIdAsync(http, db) is null)
                return Results.Unauthorized();

            var vehicles = await db.Vehicles.AsNoTracking()
                .Include(v => v.Owner)
                .OrderByDescending(v => v.RegisteredAt)
                .ToListAsync();

            return Results.Ok(vehicles.Select(ToAdminVehicle).ToArray());
        });

        // =====================================
        // APPROVE VEHICLE
        // =====================================

        admin.MapPost(
            "/vehicles/{id:guid}/approve",
            async (
                Guid id,
                HttpContext http,
                IAntiforgery antiforgery,
                CampusDbContext db) =>
            {
                return await ReviewVehicleAsync(
                    id,
                    approved: true,
                    rejectionReason: null,
                    http,
                    antiforgery,
                    db);
            });

        // =====================================
        // REJECT VEHICLE
        // =====================================

        admin.MapPost(
            "/vehicles/{id:guid}/reject",
            async (
                Guid id,
                RejectVehicleRequest request,
                HttpContext http,
                IAntiforgery antiforgery,
                CampusDbContext db) =>
            {
                return await ReviewVehicleAsync(
                    id,
                    approved: false,
                    rejectionReason: request.Reason,
                    http,
                    antiforgery,
                    db);
            });

        // =====================================
        // ADMINISTRATOR OVERVIEW
        // =====================================

        admin.MapGet("/overview", async (
            HttpContext http,
            CampusDbContext db) =>
        {
            string? administratorId =
                await GetActiveAdministratorIdAsync(
                    http,
                    db);

            if (administratorId is null)
            {
                return Results.Unauthorized();
            }

            var vehicleStats = await db.Vehicles
                .AsNoTracking()
                .GroupBy(vehicle => vehicle.ApprovalStatus)
                .Select(group => new
                {
                    Status = group.Key,
                    Count = group.Count()
                })
                .ToListAsync();

            int pendingVehicles = vehicleStats
                .Where(item =>
                    item.Status == "Pending")
                .Sum(item => item.Count);

            int approvedVehicles = vehicleStats
                .Where(item =>
                    item.Status == "Approved")
                .Sum(item => item.Count);

            int rejectedVehicles = vehicleStats
                .Where(item =>
                    item.Status == "Rejected")
                .Sum(item => item.Count);

            int totalVehicles = vehicleStats
                .Sum(item => item.Count);

            var zones = await db.ParkingZones
                .AsNoTracking()
                .Where(zone => zone.IsActive)
                .OrderBy(zone => zone.Code)
                .Select(zone => new
                {
                    zone.Id,
                    zone.Code,
                    zone.Name,

                    TotalSpaces =
                        zone.Spaces.Count(),

                    AvailableSpaces =
                        zone.Spaces.Count(space =>
                            space.Status ==
                            ParkingSpaceStatus.Available),

                    OccupiedSpaces =
                        zone.Spaces.Count(space =>
                            space.Status ==
                            ParkingSpaceStatus.Occupied),

                    UnknownSpaces =
                        zone.Spaces.Count(space =>
                            space.Status ==
                            ParkingSpaceStatus.Unknown),

                    OutOfServiceSpaces =
                        zone.Spaces.Count(space =>
                            space.Status ==
                            ParkingSpaceStatus.OutOfService)
                })
                .ToListAsync();

            int totalSpaces = zones.Sum(
                zone => zone.TotalSpaces);

            int availableSpaces = zones.Sum(
                zone => zone.AvailableSpaces);

            int occupiedSpaces = zones.Sum(
                zone => zone.OccupiedSpaces);

            int unknownSpaces = zones.Sum(
                zone => zone.UnknownSpaces);

            int outOfServiceSpaces = zones.Sum(
                zone => zone.OutOfServiceSpaces);

            int knownUsableSpaces =
                availableSpaces + occupiedSpaces;

            double? occupancyPercentage =
                knownUsableSpaces > 0
                    ? Math.Round(
                        (double)occupiedSpaces /
                        knownUsableSpaces * 100,
                        1)
                    : null;

            var recentRequests = await db.Vehicles
                .AsNoTracking()
                .Where(vehicle =>
                    vehicle.ApprovalStatus == "Pending")
                .OrderByDescending(vehicle =>
                    vehicle.RegisteredAt)
                .Take(5)
                .Select(vehicle => new
                {
                    vehicle.Id,
                    vehicle.PlateNumber,
                    vehicle.Make,
                    vehicle.Model,
                    vehicle.Color,
                    vehicle.ApprovalStatus,
                    vehicle.RegisteredAt,

                    Owner = new
                    {
                        vehicle.Owner.FullName,
                        vehicle.Owner.UniversityId,
                        vehicle.Owner.Department
                    }
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Vehicles = new
                {
                    Total = totalVehicles,
                    Pending = pendingVehicles,
                    Approved = approvedVehicles,
                    Rejected = rejectedVehicles
                },

                Parking = new
                {
                    ActiveZones = zones.Count,
                    TotalSpaces = totalSpaces,
                    AvailableSpaces = availableSpaces,
                    OccupiedSpaces = occupiedSpaces,
                    UnknownSpaces = unknownSpaces,
                    OutOfServiceSpaces =
                        outOfServiceSpaces,
                    OccupancyPercentage =
                        occupancyPercentage
                },

                Zones = zones,
                RecentRequests = recentRequests,

                GeneratedAt = DateTime.UtcNow
            });
        });
    }

    // =========================================
    // SHARED VEHICLE REVIEW LOGIC
    // =========================================

    private static async Task<IResult>
        ReviewVehicleAsync(
            Guid vehicleId,
            bool approved,
            string? rejectionReason,
            HttpContext http,
            IAntiforgery antiforgery,
            CampusDbContext db)
    {
        // 1. Validate CSRF protection.

        if (!await HasValidCsrfToken(
            http,
            antiforgery))
        {
            return Results.BadRequest(new
            {
                message = "Invalid request token."
            });
        }

        // 2. Identify the authenticated
        // administrator.

        string? administratorId =
            await GetActiveAdministratorIdAsync(
                http,
                db);

        if (administratorId is null)
        {
            return Results.Unauthorized();
        }

        // 3. Validate rejection reason.

        string? cleanReason = null;

        if (!approved)
        {
            cleanReason = rejectionReason?.Trim();

            if (string.IsNullOrWhiteSpace(
                cleanReason))
            {
                return Results.BadRequest(new
                {
                    message =
                        "A rejection reason is required."
                });
            }

            if (cleanReason.Length > 500)
            {
                return Results.BadRequest(new
                {
                    message =
                        "The rejection reason must not " +
                        "exceed 500 characters."
                });
            }
        }

        // 4. Check that the vehicle exists.

        var existingVehicle = await db.Vehicles
            .AsNoTracking()
            .Where(vehicle =>
                vehicle.Id == vehicleId)
            .Select(vehicle => new
            {
                vehicle.Id,
                vehicle.ApprovalStatus,
                vehicle.NormalizedPlateNumber,
                vehicle.PlateNumber,
                OwnerIsActive =
                    vehicle.Owner.IsActive
            })
            .FirstOrDefaultAsync();

        if (existingVehicle is null)
        {
            return Results.NotFound(new
            {
                message =
                    "Vehicle registration was not found."
            });
        }

        // 5. Only pending registrations
        // can be reviewed.

        if (existingVehicle.ApprovalStatus != "Pending")
        {
            return Results.Conflict(new
            {
                message =
                    "This vehicle registration has " +
                    "already been reviewed.",

                currentStatus =
                    existingVehicle.ApprovalStatus
            });
        }

        // Use the same eligibility rules as the administrator list.
        if (approved)
        {
            var blockedReason = GetApprovalBlockedReason(
                existingVehicle.ApprovalStatus,
                existingVehicle.NormalizedPlateNumber,
                existingVehicle.PlateNumber,
                existingVehicle.OwnerIsActive);

            if (blockedReason is not null)
                return Results.BadRequest(new { message = blockedReason });
        }

        string newStatus = approved
            ? "Approved"
            : "Rejected";

        DateTime reviewedAt =
            DateTime.UtcNow;

        // 8. Perform an atomic conditional update.
        //
        // The Pending condition prevents two
        // administrators from reviewing the
        // same request simultaneously.

        var pendingVehicle = db.Vehicles
            .Where(vehicle =>
                vehicle.Id == vehicleId &&
                vehicle.ApprovalStatus == "Pending" &&
                db.Users.Any(user => user.Id == administratorId && user.IsActive &&
                    db.UserRoles.Any(userRole => userRole.UserId == user.Id &&
                        db.Roles.Any(role => role.Id == userRole.RoleId &&
                            role.NormalizedName == "ADMIN"))));

        if (approved)
        {
            pendingVehicle = pendingVehicle.Where(
                vehicle =>
                    vehicle.NormalizedPlateNumber == existingVehicle.NormalizedPlateNumber &&
                    vehicle.PlateNumber == existingVehicle.PlateNumber &&
                    vehicle.Owner.IsActive);
        }

        int affectedRows = await pendingVehicle
            .ExecuteUpdateAsync(setters => setters

                .SetProperty(
                    vehicle =>
                        vehicle.ApprovalStatus,
                    newStatus)

                .SetProperty(
                    vehicle =>
                        vehicle.IsApproved,
                    approved)

                .SetProperty(
                    vehicle =>
                        vehicle.ReviewedAt,
                    reviewedAt)

                .SetProperty(
                    vehicle =>
                        vehicle.ReviewedById,
                    administratorId)

                .SetProperty(
                    vehicle =>
                        vehicle.RejectionReason,
                    cleanReason));

        // 9. Detect concurrent reviews or
        // eligibility changes.

        if (affectedRows == 0)
        {
            return Results.Conflict(new
            {
                message =
                    "This registration changed while " +
                    "it was being reviewed. " +
                    "Please refresh and try again."
            });
        }

        // 10. Retrieve the updated vehicle.

        var updatedVehicle = await db.Vehicles
            .AsNoTracking()
            .Include(vehicle => vehicle.Owner)
            .FirstAsync(vehicle => vehicle.Id == vehicleId);

        // 11. Return the persisted result.

        return Results.Ok(new
        {
            message = approved
                ? "Vehicle registration approved."
                : "Vehicle registration rejected.",

            vehicle = ToAdminVehicle(updatedVehicle)
        });
    }

    private static string? GetApprovalBlockedReason(
        string status, string? normalizedPlate, string? displayPlate, bool ownerIsActive)
    {
        if (status != "Pending")
            return "This vehicle registration has already been reviewed.";

        if (string.IsNullOrWhiteSpace(normalizedPlate))
            return "This vehicle does not have a validated license plate.";

        if (!string.Equals(LicensePlateService.NormalizePlate(normalizedPlate),
                normalizedPlate, StringComparison.Ordinal) ||
            !string.Equals(LicensePlateService.NormalizePlate(displayPlate),
                normalizedPlate, StringComparison.Ordinal))
            return "The vehicle license plate is invalid or inconsistent.";

        if (!ownerIsActive)
            return "The vehicle owner's account is inactive.";

        return null;
    }

    private static object ToAdminVehicle(Vehicle vehicle)
    {
        var blockedReason = GetApprovalBlockedReason(
            vehicle.ApprovalStatus, vehicle.NormalizedPlateNumber,
            vehicle.PlateNumber, vehicle.Owner.IsActive);

        return new
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
            vehicle.ReviewedById,
            vehicle.RejectionReason,
            CanApprove = blockedReason is null,
            ApprovalBlockedReason = blockedReason,
            Owner = new
            {
                vehicle.Owner.Id,
                vehicle.Owner.FullName,
                vehicle.Owner.UniversityId,
                vehicle.Owner.Email,
                vehicle.Owner.Department
            }
        };
    }

    // =========================================
    // ACTIVE ADMINISTRATOR VALIDATION
    // =========================================

    private static async Task<string?>
        GetActiveAdministratorIdAsync(
            HttpContext http,
            CampusDbContext db)
    {
        if (!http.User.IsInRole("Admin"))
        {
            return null;
        }

        string? administratorId =
            http.User.FindFirst(
                ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(
            administratorId))
        {
            return null;
        }

        bool activeAdministrator =
            await db.Users
                .AsNoTracking()
                .AnyAsync(user =>
                    user.Id == administratorId &&
                    user.IsActive &&
                    db.UserRoles.Any(userRole =>
                        userRole.UserId == user.Id &&
                        db.Roles.Any(role =>
                            role.Id == userRole.RoleId &&
                            role.NormalizedName == "ADMIN")));

        return activeAdministrator
            ? administratorId
            : null;
    }

    // =========================================
    // CSRF VALIDATION
    // =========================================

    private static async Task<bool>
        HasValidCsrfToken(
            HttpContext context,
            IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery
                .ValidateRequestAsync(context);

            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }
}