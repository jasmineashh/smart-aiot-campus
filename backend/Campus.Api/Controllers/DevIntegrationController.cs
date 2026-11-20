using Campus.Api.Data;
using Campus.Api.Models.Identity;
using Campus.Api.Models.Parking;
using Campus.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Controllers;

// DEVELOPMENT ONLY: links biometrics people to parking by creating a user account
// (same UniversityId as the Person) and registering that person's car.
// Protected by the device key and disabled outside Development.
[ApiController]
[Route("api/dev/integration")]
[RequireDeviceKey]
public class DevIntegrationController : ControllerBase
{
    private readonly CampusDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly IWebHostEnvironment _env;

    public DevIntegrationController(CampusDbContext db, UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles, IWebHostEnvironment env)
    {
        _db = db;
        _users = users;
        _roles = roles;
        _env = env;
    }

    public record CarOwnerDto(string UniversityId, string FullName, string? Department,
                              string Role, string PlateNumber);

    // POST api/dev/integration/car-owners
    [HttpPost("car-owners")]
    public async Task<IActionResult> AddCarOwners(List<CarOwnerDto> owners)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        int accountsCreated = 0, carsAdded = 0;
        var skipped = new List<string>();

        foreach (var o in owners)
        {
            var universityId = o.UniversityId.Trim();
            var plate = o.PlateNumber.Trim();
            if (string.IsNullOrEmpty(universityId) || string.IsNullOrEmpty(plate))
            {
                skipped.Add($"{universityId}: missing id or plate");
                continue;
            }

            // 1. Account with the same UniversityId as the biometrics Person
            var user = await _users.Users.SingleOrDefaultAsync(u => u.UniversityId == universityId);
            if (user is null)
            {
                var email = $"{universityId.ToLowerInvariant()}@campus.test";
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    FullName = o.FullName,
                    UniversityId = universityId,
                    Department = o.Department,
                };
                var created = await _users.CreateAsync(user); // no password: demo owners can't log in
                if (!created.Succeeded)
                {
                    skipped.Add($"{universityId}: {string.Join(", ", created.Errors.Select(e => e.Description))}");
                    continue;
                }
                if (await _roles.RoleExistsAsync(o.Role))
                    await _users.AddToRoleAsync(user, o.Role);
                accountsCreated++;
            }

            // 2. The car, owned by that account
            if (await _db.Set<Vehicle>().AnyAsync(v => v.PlateNumber == plate))
            {
                skipped.Add($"{universityId}: plate '{plate}' already registered");
                continue;
            }
            _db.Set<Vehicle>().Add(new Vehicle
            {
                PlateNumber = plate,
                OwnerId = user.Id,
                IsApproved = true,
            });
            await _db.SaveChangesAsync();
            carsAdded++;
        }

        return Ok(new { accountsCreated, carsAdded, skipped });
    }
}
