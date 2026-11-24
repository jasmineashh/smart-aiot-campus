
using Campus.Api.Data;
using Campus.Api.Models.Identity;
using Campus.Api.Models.Parking;
using Campus.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

// Development-only integration between
// biometric persons and parking vehicles.
//
// Requires:
// 1. Development environment
// 2. Valid device API key
// 3. Explicit demo import configuration

[ApiController]
[Route("api/dev/integration")]
[RequireDeviceKey]
[ResponseCache(
    NoStore = true,
    Location = ResponseCacheLocation.None)]
public class DevIntegrationController : ControllerBase
{
    private readonly CampusDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    private static readonly string[] AllowedRoles =
    {
        "Student",
        "Professor",
        "Staff"
    };

    public DevIntegrationController(
        CampusDbContext db,
        UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _db = db;
        _users = users;
        _roles = roles;
        _env = env;
        _configuration = configuration;
    }

    public record CarOwnerDto(
        string UniversityId,
        string FullName,
        string? Department,
        string Role,
        string PlateNumber);

    // POST api/dev/integration/car-owners
    [HttpPost("car-owners")]
    public async Task<IActionResult> AddCarOwners(
        List<CarOwnerDto> owners)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        if (!_configuration.GetValue<bool>(
            "DevSeed:IntegrationImportEnabled"))
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message = "Development integration import is disabled."
                });
        }

        if (owners is null ||
            owners.Count == 0 ||
            owners.Count > 500)
        {
            return BadRequest(new
            {
                message = "Provide between 1 and 500 demo vehicle owners."
            });
        }

        int accountsCreated = 0;
        int carsAdded = 0;

        var skipped = new List<string>();

        foreach (var o in owners)
        {
            if (o is null ||
                string.IsNullOrWhiteSpace(o.UniversityId) ||
                string.IsNullOrWhiteSpace(o.FullName) ||
                string.IsNullOrWhiteSpace(o.PlateNumber) ||
                string.IsNullOrWhiteSpace(o.Role))
            {
                skipped.Add("Missing required owner information.");
                continue;
            }

            var universityId = o.UniversityId.Trim();
            var plate = o.PlateNumber.Trim();

            var role = AllowedRoles.FirstOrDefault(r =>
                string.Equals(
                    r,
                    o.Role.Trim(),
                    StringComparison.OrdinalIgnoreCase));

            // Never create privileged Admin accounts
            // through the dataset import endpoint.
            if (role is null)
            {
                skipped.Add(
                    $"{universityId}: role is not permitted.");
                continue;
            }

            if (!await _roles.RoleExistsAsync(role))
            {
                skipped.Add(
                    $"{universityId}: role does not exist.");
                continue;
            }

            // Ensure a corresponding biometric person exists.
            var personExists = await _db.Persons.AnyAsync(
                p => p.UniversityId == universityId);

            if (!personExists)
            {
                skipped.Add(
                    $"{universityId}: biometric person not found.");
                continue;
            }

            // Check for duplicate plates before
            // creating an account.
            if (await _db.Set<Vehicle>().AnyAsync(
                v => v.PlateNumber == plate))
            {
                skipped.Add(
                    $"{universityId}: plate already registered.");
                continue;
            }

            var user = await _users.Users
                .SingleOrDefaultAsync(
                    u => u.UniversityId == universityId);

            var email =
                $"{universityId.ToLowerInvariant()}@campus.test";

            // Keep account creation, role assignment
            // and vehicle registration atomic.
            await using var transaction =
                await _db.Database.BeginTransactionAsync();

            bool newAccount = false;

            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    FullName = o.FullName.Trim(),
                    UniversityId = universityId,
                    Department = o.Department,
                };

                // No password: imported demo owners
                // cannot log in using a password.
                var created = await _users.CreateAsync(user);

                if (!created.Succeeded)
                {
                    skipped.Add(
                        $"{universityId}: account creation failed.");
                    await transaction.RollbackAsync();
                    _db.ChangeTracker.Clear();
                    continue;
                }

                var assigned = await _users.AddToRoleAsync(
                    user, role);

                if (!assigned.Succeeded)
                {
                    skipped.Add(
                        $"{universityId}: role assignment failed.");
                    await transaction.RollbackAsync();
                    _db.ChangeTracker.Clear();
                    continue;
                }

                newAccount = true;
            }
            else
            {
                // Do not modify existing university
                // accounts that are not demo import accounts.
                if (!string.Equals(
                        user.Email,
                        email,
                        StringComparison.OrdinalIgnoreCase) ||
                    await _users.HasPasswordAsync(user) ||
                    await _users.IsInRoleAsync(user, "Admin"))
                {
                    skipped.Add(
                        $"{universityId}: existing account is not eligible for demo import.");
                    await transaction.RollbackAsync();
                    _db.ChangeTracker.Clear();
                    continue;
                }

                if (!await _users.IsInRoleAsync(user, role))
                {
                    skipped.Add(
                        $"{universityId}: existing account role does not match.");
                    await transaction.RollbackAsync();
                    _db.ChangeTracker.Clear();
                    continue;
                }
            }

            _db.Set<Vehicle>().Add(new Vehicle
            {
                PlateNumber = plate,
                OwnerId = user.Id,

                // Imported vehicles require approval.
                IsApproved = false,
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            if (newAccount)
                accountsCreated++;

            carsAdded++;
        }

        return Ok(new
        {
            accountsCreated,
            carsAdded,
            skipped
        });
    }
}
